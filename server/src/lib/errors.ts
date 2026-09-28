import type { NextFunction, Request, Response } from 'express';

/** Error codes the client understands and can render nice states for. */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const unauthorized = (message = 'Authentication required.') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'You do not have access to this resource.') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Resource not found.') =>
  new AppError(404, 'NOT_FOUND', message);

export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);

export const rateLimited = (message: string, details?: Record<string, unknown>) =>
  new AppError(429, 'RATE_LIMITED', message, details);

export const upstreamError = (message: string, details?: Record<string, unknown>) =>
  new AppError(502, 'UPSTREAM_ERROR', message, details);

/** Wraps an async handler so rejections reach the error middleware (Express 5 does this natively,
 *  but we keep it for explicitness and to support sync handlers uniformly). */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = fn(req, res, next);
      if (result instanceof Promise) result.catch(next);
    } catch (error) {
      next(error);
    }
  };

/** Final error middleware: one JSON shape for every failure. */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(500, 'INTERNAL_ERROR', 'Something went wrong on our side.');

  if (!(error instanceof AppError) || appError.status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', {
      path: req.path,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  });
}

/** 404 for unknown API routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No API route matches ${req.method} ${req.path}.` },
  });
}
