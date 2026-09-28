import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { config } from '../config.js';

/**
 * Per-IP limiter protecting the API itself (the GitHub budget is tracked
 * separately in `services/cache.ts`).
 */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests from this device. Slow down for a moment.',
    },
  },
});
