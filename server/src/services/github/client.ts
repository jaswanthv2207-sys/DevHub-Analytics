import { config } from '../../config.js';
import { notFound, rateLimited, upstreamError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import type { CacheSource, RateLimit } from '../../types/domain.js';
import {
  readCache,
  touchCache,
  writeCache,
  readRateState,
  writeRateState,
  type RateResource,
} from '../cache.js';

export interface GhOptions {
  /** Fresh TTL in seconds. */
  ttl?: number;
  /** Extra cache key (defaults to the full URL). */
  key?: string;
  /** Extra query parameters; `undefined` values are dropped. */
  query?: Record<string, string | number | boolean | undefined>;
  /** Allow serving an expired entry when GitHub is unreachable/limited. */
  allowStale?: boolean;
  /** Skip the cache entirely (used for the rate-limit probe). */
  skipCache?: boolean;
  /** Which GitHub quota this call draws from (search has its own budget). */
  resource?: RateResource;
}

export interface GhResult<T> {
  data: T;
  meta: {
    source: CacheSource;
    cachedAt: string | null;
    ageSeconds: number | null;
    rateLimit: RateLimit;
  };
}

const DEFAULT_TTL = 300;

function buildUrl(path: string, query?: GhOptions['query']): string {
  const url = new URL(path, config.github.apiBase);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function buildHeaders(etag?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': config.github.userAgent,
  };
  if (config.github.token) headers.Authorization = `Bearer ${config.github.token}`;
  if (etag) headers['If-None-Match'] = etag;
  return headers;
}

/** Keep the persisted rate-limit budget in sync from GitHub's response headers. */
function trackRate(headers: Headers): void {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  if (limit === null && remaining === null) return;
  const resource = (headers.get('x-ratelimit-resource') ?? 'core') as RateResource;
  const used = headers.get('x-ratelimit-used');
  const reset = headers.get('x-ratelimit-reset');
  writeRateState(resource, {
    limit: limit !== null ? Number(limit) : undefined,
    remaining: remaining !== null ? Number(remaining) : undefined,
    used: used !== null ? Number(used) : undefined,
    resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : undefined,
    exhausted: remaining !== null && Number(remaining) <= 0,
  });
}

function staleMeta(
  hit: { storedAt: number; data: unknown },
  source: CacheSource,
  resource: RateResource,
) {
  return {
    source,
    cachedAt: new Date(hit.storedAt).toISOString(),
    ageSeconds: Math.max(0, Math.round((Date.now() - hit.storedAt) / 1000)),
    rateLimit: readRateState(resource),
  };
}

function serveStale<T>(
  path: string,
  key: string,
  allowStale: boolean,
  resource: RateResource,
): GhResult<T> | null {
  if (!allowStale) return null;
  const hit = readCache<T>(key);
  if (!hit) return null;
  logger.warn(`serving stale GitHub data for ${path}`);
  return { data: hit.data, meta: staleMeta(hit, 'stale', resource) };
}

/**
 * Core GitHub client:
 *  1. fresh cache hit  → serve instantly (`cache`)
 *  2. budget nearly gone → stale cache (`stale`) or a clear 429
 *  3. conditional GET with ETag → 304 doesn't consume rate-limit quota (`revalidated`)
 *  4. network fetch → persist for the next caller (`network`)
 */
export async function ghGet<T>(path: string, options: GhOptions = {}): Promise<GhResult<T>> {
  const ttl = options.ttl ?? DEFAULT_TTL;
  const allowStale = options.allowStale ?? true;
  const resource: RateResource = options.resource ?? 'core';
  const url = buildUrl(path, options.query);
  const key = options.key ?? `GET ${url}`;

  if (!options.skipCache) {
    const hit = readCache<T>(key);
    if (hit && !hit.stale) {
      return { data: hit.data, meta: staleMeta(hit, 'cache', resource) };
    }

    const rate = readRateState(resource);
    const exhausted = rate.remaining !== null && rate.remaining <= config.github.minRemainingBuffer;
    if (exhausted) {
      const stale = serveStale<T>(path, key, allowStale, resource);
      if (stale) return stale;
      throw rateLimited(
        `GitHub's API budget is exhausted${
          rate.resetAt ? ` until ${new Date(rate.resetAt).toLocaleTimeString()}` : ''
        }. Try again shortly.`,
        { rateLimit: rate },
      );
    }
  }

  const cached = options.skipCache ? null : readCache<T>(key);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: buildHeaders(cached?.etag),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const stale = serveStale<T>(path, key, allowStale, resource);
    if (stale) return stale;
    throw upstreamError('Could not reach GitHub. Please try again.', {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  trackRate(response.headers);

  if (response.status === 304 && cached) {
    touchCache(key, ttl);
    return {
      data: cached.data,
      meta: { ...staleMeta({ ...cached, storedAt: Date.now() }, 'revalidated', resource) },
    };
  }

  if (response.status === 404) {
    throw notFound('GitHub could not find that resource.');
  }

  if (response.status === 403 || response.status === 429) {
    const remaining = Number(response.headers.get('x-ratelimit-remaining') ?? '1');
    const limit = Number(response.headers.get('x-ratelimit-limit') ?? '0');
    const limited =
      response.status === 429 ||
      remaining <= 0 ||
      (limit > 0 && remaining <= config.github.minRemainingBuffer);

    if (limited) {
      const reset = response.headers.get('x-ratelimit-reset');
      const reportedResource = (response.headers.get('x-ratelimit-resource') ??
        resource) as RateResource;
      writeRateState(reportedResource, {
        limit: limit || undefined,
        remaining: remaining || 0,
        resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : undefined,
        exhausted: true,
      });
      const stale = serveStale<T>(path, key, allowStale, resource);
      if (stale) return stale;
      throw rateLimited(
        'GitHub rate limit reached. Cached data will be available again in a few minutes.',
        { rateLimit: readRateState(resource) },
      );
    }

    const body = await response.text().catch(() => '');
    throw upstreamError('GitHub denied this request.', {
      status: response.status,
      body: body.slice(0, 300),
    });
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const stale = serveStale<T>(path, key, allowStale, resource);
    if (stale) return stale;
    throw upstreamError(`GitHub responded with ${response.status}.`, {
      status: response.status,
      body: body.slice(0, 300),
    });
  }

  const data = (await response.json()) as T;
  if (!options.skipCache) {
    writeCache(key, {
      data,
      etag: response.headers.get('etag'),
      status: response.status,
      ttlSec: ttl,
    });
  }
  return { data, meta: staleMeta({ storedAt: Date.now(), data }, 'network', resource) };
}

/**
 * GitHub's statistics endpoints return `202 Accepted` while the report is
 * computed on demand. Poll a few times before falling back.
 */
export async function ghGetStats<T>(
  path: string,
  options: GhOptions = {},
): Promise<GhResult<T> | null> {
  const ttl = options.ttl ?? 600;
  const resource: RateResource = options.resource ?? 'core';
  const key = options.key ?? `GET ${buildUrl(path, options.query)}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const hit = readCache<T>(key);
    if (hit && !hit.stale) return { data: hit.data, meta: staleMeta(hit, 'cache', resource) };

    let response: Response;
    try {
      response = await fetch(buildUrl(path, options.query), {
        headers: buildHeaders(hit?.etag),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      if (hit) return { data: hit.data, meta: staleMeta(hit, 'stale', resource) };
      return null;
    }
    trackRate(response.headers);

    if (response.status === 304 && hit) {
      touchCache(key, ttl);
      return {
        data: hit.data,
        meta: staleMeta({ ...hit, storedAt: Date.now() }, 'revalidated', resource),
      };
    }
    if (response.status === 204) return null; // GitHub: "not enough data"
    if (response.status === 202) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      continue;
    }
    if (!response.ok) {
      if (hit) return { data: hit.data, meta: staleMeta(hit, 'stale', resource) };
      return null;
    }
    const data = (await response.json()) as T;
    writeCache(key, { data, etag: response.headers.get('etag'), ttlSec: ttl });
    return { data, meta: staleMeta({ storedAt: Date.now(), data }, 'network', resource) };
  }
  const fallback = readCache<T>(key);
  return fallback ? { data: fallback.data, meta: staleMeta(fallback, 'stale', resource) } : null;
}

/** POST /graphql — only available when GITHUB_TOKEN is configured. */
export async function ghGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  ttlSec = 3600,
): Promise<T | null> {
  if (!config.github.token) return null;
  const key = `POST graphql ${query} ${JSON.stringify(variables)}`;
  const hit = readCache<T>(key);
  if (hit && !hit.stale) return hit.data;

  try {
    const response = await fetch(`${config.github.apiBase}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.github.token}`,
        'Content-Type': 'application/json',
        'User-Agent': config.github.userAgent,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return hit?.data ?? null;
    const payload = (await response.json()) as { data?: T; errors?: { message: string }[] };
    if (payload.errors?.length) {
      logger.warn('graphql errors', { errors: payload.errors.map((e) => e.message) });
      return hit?.data ?? null;
    }
    if (!payload.data) return hit?.data ?? null;
    writeCache(key, { data: payload.data, ttlSec });
    return payload.data;
  } catch {
    return hit?.data ?? null;
  }
}
