import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { unauthorized } from '../lib/errors.js';
import { findUserById, verifyToken } from '../services/auth.service.js';
import type { AuthUser } from '../types/domain.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const cookies = req.cookies as Record<string, string> | undefined;
  const cookie = cookies?.[config.jwt.cookieName];
  return cookie ?? null;
}

/** Attaches `req.user` when a valid session exists (never throws). */
export function loadUser(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const userId = verifyToken(token);
    if (userId !== null) {
      const row = findUserById(userId);
      if (row) {
        req.user = {
          id: row.id,
          email: row.email,
          username: row.username,
          displayName: row.display_name,
          createdAt: row.created_at,
        };
      }
    }
  }
  next();
}

/** Route guard for personalised endpoints. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(unauthorized('Sign in to use this feature.'));
    return;
  }
  next();
}
