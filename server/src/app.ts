import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import { config } from './config.js';
import { notFoundHandler, errorHandler } from './lib/errors.js';
import { loadUser } from './middleware/auth.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { serverRoot } from './db/index.js';
import { cacheStats } from './services/cache.js';
import { authRouter } from './routes/auth.routes.js';
import { collectionsRouter, dashboardRouter, githubRouter } from './routes/api.routes.js';
import { compareRouter } from './routes/compare.routes.js';

const STARTED_AT = Date.now();
const CLIENT_DIST = path.resolve(serverRoot, '..', 'client', 'dist');

function securityHeaders(_req: Request, res: Response, next: () => void): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', config.trustProxy ? 1 : false);
  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / server-side calls (no Origin header) and the
        // configured allow-list. Credentials are always required.
        if (!origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Limit', 'X-RateLimit-Reset'],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(loadUser);

  app.get('/api/health', (_req, res) => {
    res.json({
      data: {
        status: 'ok',
        uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
        env: config.nodeEnv,
        github: {
          tokenConfigured: Boolean(config.github.token),
          cache: cacheStats(),
        },
      },
    });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/collections', collectionsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/github', githubRouter);
  app.use('/api/compare', compareRouter);

  app.use('/api', notFoundHandler);

  // Serve the built SPA in production (single-service deployment).
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(
      express.static(CLIENT_DIST, {
        index: false,
        maxAge: '1h',
        setHeaders(res, filePath) {
          if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
