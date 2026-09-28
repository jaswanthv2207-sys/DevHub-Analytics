import { db } from '../db/index.js';
import { config } from '../config.js';
import type { RateLimit } from '../types/domain.js';

interface CacheRow {
  key: string;
  value: string;
  etag: string | null;
  status: number;
  stored_at: number;
  expires_at: number;
  stale_until: number;
}

export interface CacheHit<T> {
  data: T;
  etag: string | null;
  status: number;
  storedAt: number;
  expiresAt: number;
  /** True when the entry is past its TTL but still inside the stale window. */
  stale: boolean;
}

const now = () => Date.now();

/** Read a cache entry. Returns `null` when missing or fully expired. */
export function readCache<T>(key: string): CacheHit<T> | null {
  const row = db.prepare('SELECT * FROM response_cache WHERE key = ?').get(key) as
    CacheRow | undefined;
  if (!row) return null;
  if (row.stale_until <= now()) {
    db.prepare('DELETE FROM response_cache WHERE key = ?').run(key);
    return null;
  }
  try {
    return {
      data: JSON.parse(row.value) as T,
      etag: row.etag,
      status: row.status,
      storedAt: row.stored_at,
      expiresAt: row.expires_at,
      stale: row.expires_at <= now(),
    };
  } catch {
    db.prepare('DELETE FROM response_cache WHERE key = ?').run(key);
    return null;
  }
}

export function writeCache(
  key: string,
  payload: { data: unknown; etag?: string | null; status?: number; ttlSec: number },
) {
  const storedAt = now();
  db.prepare(
    `INSERT INTO response_cache (key, value, etag, status, stored_at, expires_at, stale_until)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value, etag = excluded.etag, status = excluded.status,
       stored_at = excluded.stored_at, expires_at = excluded.expires_at,
       stale_until = excluded.stale_until`,
  ).run(
    key,
    JSON.stringify(payload.data),
    payload.etag ?? null,
    payload.status ?? 200,
    storedAt,
    storedAt + payload.ttlSec * 1000,
    storedAt + (payload.ttlSec + config.github.staleWindowSec) * 1000,
  );
}

/** Push expiry forward without touching the payload (used on HTTP 304 revalidation). */
export function touchCache(key: string, ttlSec: number): void {
  const storedAt = now();
  db.prepare(
    `UPDATE response_cache SET expires_at = ?, stale_until = ?, stored_at = ?
     WHERE key = ?`,
  ).run(
    storedAt + ttlSec * 1000,
    storedAt + (ttlSec + config.github.staleWindowSec) * 1000,
    storedAt,
    key,
  );
}

export function deleteCache(key: string): void {
  db.prepare('DELETE FROM response_cache WHERE key = ?').run(key);
}

/** Drop everything older than the stale window (called on boot). */
export function pruneCache(): number {
  const info = db.prepare('DELETE FROM response_cache WHERE stale_until <= ?').run(now());
  return info.changes;
}

export function cacheStats() {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS entries,
              SUM(LENGTH(value)) AS bytes,
              SUM(CASE WHEN expires_at > ? THEN 1 ELSE 0 END) AS fresh
       FROM response_cache`,
    )
    .get(now()) as { entries: number; bytes: number | null; fresh: number | null };
  return { entries: row.entries ?? 0, bytes: row.bytes ?? 0, fresh: row.fresh ?? 0 };
}

/* ── GitHub rate-limit state (tracked per API resource) ──────────────────── */

export type RateResource = 'core' | 'search' | 'graphql' | 'code_search';

const memoryStates = new Map<RateResource, RateLimit>();

const blankState = (): RateLimit => ({
  limit: null,
  remaining: null,
  used: null,
  resetAt: null,
  resource: null,
  exhausted: false,
});

export function readRateState(resource: RateResource = 'core'): RateLimit {
  return memoryStates.get(resource) ?? blankState();
}

/** Everything the dashboard / rate-limit widget needs. */
export function rateLimitSummary() {
  const resources: RateResource[] = ['core', 'search'];
  return Object.fromEntries(
    resources.map((resource) => [resource, readRateState(resource)]),
  ) as Record<RateResource, RateLimit>;
}

export function hydrateRateState(): void {
  const rows = db.prepare('SELECT * FROM rate_state').all() as {
    resource: string;
    limit_val: number | null;
    remaining: number | null;
    used: number | null;
    reset_at: number | null;
  }[];
  for (const row of rows) {
    memoryStates.set(row.resource as RateResource, {
      limit: row.limit_val,
      remaining: row.remaining,
      used: row.used,
      resetAt: row.reset_at ? new Date(row.reset_at * 1000).toISOString() : null,
      resource: row.resource,
      exhausted: Boolean(row.remaining !== null && row.remaining <= 0),
    });
  }
}

export function writeRateState(resource: RateResource, next: Partial<RateLimit>): RateLimit {
  const current = memoryStates.get(resource) ?? blankState();
  let next2: RateLimit = { ...current, ...next, resource };

  // The budget resets every hour (or every minute for search) — clear exhaustion.
  if (next2.resetAt && new Date(next2.resetAt).getTime() <= Date.now()) {
    next2 = { ...next2, remaining: next2.limit, used: 0, exhausted: false };
  }
  memoryStates.set(resource, next2);

  db.prepare(
    `INSERT INTO rate_state (resource, limit_val, remaining, used, reset_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(resource) DO UPDATE SET
       limit_val = excluded.limit_val, remaining = excluded.remaining,
       used = excluded.used, reset_at = excluded.reset_at,
       updated_at = excluded.updated_at`,
  ).run(
    resource,
    next2.limit,
    next2.remaining,
    next2.used,
    next2.resetAt ? Math.floor(new Date(next2.resetAt).getTime() / 1000) : null,
    Date.now(),
  );
  return next2;
}
