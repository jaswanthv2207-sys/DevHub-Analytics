import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { conflict, unauthorized } from '../lib/errors.js';
import { db } from '../db/index.js';
import type { AuthUser } from '../types/domain.js';

export interface UserRow {
  id: number;
  email: string;
  username: string;
  display_name: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

const ROUNDS = 10;

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

const findById = db.prepare<[number], UserRow>('SELECT * FROM users WHERE id = ?');
const findByEmail = db.prepare<[string], UserRow>(
  'SELECT * FROM users WHERE email = ? COLLATE NOCASE',
);
const findByUsername = db.prepare<[string], UserRow>(
  'SELECT * FROM users WHERE username = ? COLLATE NOCASE',
);

export function findUserById(id: number): UserRow | undefined {
  return findById.get(id);
}

export async function registerUser(input: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();

  if (findByEmail.get(email)) throw conflict('An account with that email already exists.');
  if (findByUsername.get(username)) throw conflict('That username is already taken.');

  const passwordHash = await bcrypt.hash(input.password, ROUNDS);
  const info = db
    .prepare(
      `INSERT INTO users (email, username, display_name, password_hash)
       VALUES (?, ?, ?, ?)`,
    )
    .run(email, username, (input.displayName ?? username).trim(), passwordHash);

  const row = findById.get(Number(info.lastInsertRowid));
  if (!row) throw conflict('Could not create the account.');
  return toAuthUser(row);
}

export async function loginUser(identifier: string, password: string): Promise<AuthUser> {
  const value = identifier.trim();
  const row = value.includes('@')
    ? findByEmail.get(value)
    : (findByUsername.get(value) ?? findByEmail.get(value));
  if (!row) throw unauthorized('No account matches those credentials.');
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) throw unauthorized('No account matches those credentials.');
  return toAuthUser(row);
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    issuer: 'devhub',
  });
}

export function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, config.jwt.secret, { issuer: 'devhub' });
    if (typeof payload === 'object' && typeof payload.sub === 'string') {
      const id = Number(payload.sub);
      return Number.isFinite(id) ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: (config.cookie.secure ? 'none' : 'lax') as 'none' | 'lax',
    secure: config.cookie.secure,
    maxAge: config.cookie.maxAgeMs,
    path: '/',
  };
}
