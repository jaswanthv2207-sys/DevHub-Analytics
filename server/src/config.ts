import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load `.env` from the working directory first, then the canonical `server/.env`,
// so `npm start` from the repo root behaves like `npm run dev` inside `server/`.
loadEnv();
loadEnv({ path: path.resolve(__dirname, '../.env') });

const toBool = (value: string | undefined, fallback: boolean): boolean =>
  value === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

export const config = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'devhub-local-dev-secret-change-me-in-production-123456',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    cookieName: 'devhub_token',
  },
  // `config.ts` lives one level under the server package in both `src/` (tsx)
  // and `dist/` (compiled), so the default data folder is always `server/data`.
  databasePath: process.env.DATABASE_PATH ?? path.resolve(__dirname, '../data/devhub.db'),
  github: {
    token: process.env.GITHUB_TOKEN?.trim() || undefined,
    apiBase: process.env.GITHUB_API_BASE ?? 'https://api.github.com',
    userAgent: 'DevHub-Analytics/1.0 (+https://github.com/devhub)',
    /** Stop calling GitHub when this many requests remain in the hour budget. */
    minRemainingBuffer: 10,
    /** How long a stale entry may still be served after it expired (SWR window). */
    staleWindowSec: 60 * 60 * 24,
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 240),
  },
  cookie: {
    secure: toBool(process.env.COOKIE_SECURE, isProduction),
    maxAgeMs: 1000 * 60 * 60 * 24 * 7,
  },
  /** Trust the platform proxy (Render/Heroku/nginx) when reading client IPs. */
  trustProxy: toBool(process.env.TRUST_PROXY, isProduction),
} as const;

if (config.isProduction && config.jwt.secret.startsWith('devhub-local')) {
  // Fail loudly instead of shipping a predictable signing key.
  throw new Error('JWT_SECRET must be set to a strong random value in production.');
}
