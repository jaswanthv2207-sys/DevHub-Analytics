import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { ok, parseBody } from '../lib/http.js';
import { asyncHandler, unauthorized } from '../lib/errors.js';
import { loadUser, requireAuth } from '../middleware/auth.js';
import {
  authCookieOptions,
  loginUser,
  registerUser,
  signToken,
  toAuthUser,
  findUserById,
} from '../services/auth.service.js';
import { db } from '../db/index.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(160),
  username: z
    .string()
    .trim()
    .min(3, 'Username needs at least 3 characters.')
    .max(39, 'Usernames are at most 39 characters.')
    .regex(
      /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9]))*$/,
      'Use letters, numbers and single hyphens only.',
    ),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(128, 'Passwords are capped at 128 characters.'),
  displayName: z.string().trim().min(1).max(60).optional(),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or username.'),
  password: z.string().min(1, 'Enter your password.'),
});

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
});

function issueSession(res: Parameters<typeof ok>[0], user: ReturnType<typeof toAuthUser>) {
  const token = signToken(user.id);
  res.cookie(config.jwt.cookieName, token, authCookieOptions());
  return token;
}

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = parseBody(registerSchema, req.body);
    const user = await registerUser(input);
    const token = issueSession(res, user);
    ok(res, { user, token }, undefined, 201);
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = parseBody(loginSchema, req.body);
    const user = await loginUser(input.identifier, input.password);
    const token = issueSession(res, user);
    ok(res, { user, token });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    res.clearCookie(config.jwt.cookieName, { ...authCookieOptions(), maxAge: undefined });
    ok(res, { loggedOut: true });
  }),
);

authRouter.get(
  '/me',
  loadUser,
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized('No active session.');
    ok(res, { user: req.user });
  }),
);

authRouter.patch(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseBody(profileSchema, req.body);
    db.prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?').run(
      input.displayName,
      new Date().toISOString(),
      req.user!.id,
    );
    const row = findUserById(req.user!.id);
    if (!row) throw unauthorized('No active session.');
    ok(res, { user: toAuthUser(row) });
  }),
);
