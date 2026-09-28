import type { ResponseMeta } from './types';

export interface Envelope<T> {
  data: T;
  meta?: ResponseMeta;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get fieldIssues(): { path: string; message: string }[] {
    const issues = (this.details?.issues ?? []) as { path: string; message: string }[];
    return Array.isArray(issues) ? issues : [];
  }
}

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
      ...init,
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach the DevHub API. Is the server running?',
    );
  }

  if (response.status === 204) return { data: undefined as T };

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }

  if (!response.ok) {
    const errorPayload = (payload as { error?: ApiErrorPayload } | null)?.error;
    throw new ApiError(
      response.status,
      errorPayload?.code ?? 'INTERNAL_ERROR',
      errorPayload?.message ?? `Request failed with status ${response.status}.`,
      errorPayload?.details,
    );
  }

  return (payload ?? { data: null }) as Envelope<T>;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, init),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Build `/api/github/search/repositories?q=x&page=2` style paths. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : '';
}
