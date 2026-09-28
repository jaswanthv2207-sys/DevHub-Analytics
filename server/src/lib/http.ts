import type { Request, Response } from 'express';
import { ZodError, type ZodType, type ZodTypeDef } from 'zod';
import { badRequest } from './errors.js';

/** Accepts any Zod schema whose *output* is `T` (defaults, coercion, transforms…). */
type Schema<T> = ZodType<T, ZodTypeDef, any>;

/** Parse & validate a request body, turning Zod issues into a 400 with details. */
export function parseBody<T>(schema: Schema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

/** Same for query strings. */
export function parseQuery<T>(schema: Schema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

/** Read a path parameter as a plain string (Express types allow `string[]` for wildcards). */
export function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value.join('/');
  return String(value ?? '');
}

function validationError(error: ZodError) {
  const details = {
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  };
  return badRequest('Please check the highlighted fields.', details);
}

/** Uniform success envelope: `{ data, meta? }`. */
export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>, status = 200) {
  return res.status(status).json(meta ? { data, meta } : { data });
}

export function noContent(res: Response) {
  return res.status(204).end();
}

/** Read an optional integer query param with bounds. */
export function intParam(
  value: unknown,
  fallback: number,
  { min = 1, max = 1000 }: { min?: number; max?: number } = {},
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
