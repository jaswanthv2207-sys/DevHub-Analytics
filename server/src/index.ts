import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { db } from './db/index.js';
import { hydrateRateState, pruneCache } from './services/cache.js';

hydrateRateState();
const pruned = pruneCache();
if (pruned > 0) logger.info(`pruned ${pruned} expired cache entries`);

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`DevHub API listening on http://localhost:${config.port}`);
  logger.info(`GitHub token: ${config.github.token ? 'configured' : 'missing (60 req/h budget)'}`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
