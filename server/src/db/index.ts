import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { SCHEMA } from './schema.js';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Server package root — works from both `src/` (tsx) and `dist/` (compiled). */
export const serverRoot = path.resolve(__dirname, '..', '..');

/** Resolve the DB path: absolute paths win, relative paths anchor to the server package. */
function resolveDatabasePath(): string {
  const raw = config.databasePath;
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(serverRoot, raw);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

export const dbPath = resolveDatabasePath();

export const db: Database.Database = new Database(dbPath, { fileMustExist: false });

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(SCHEMA);

logger.info(`database ready at ${path.relative(serverRoot, dbPath) || dbPath}`);

/** Run a list of statements inside one transaction. */
export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}
