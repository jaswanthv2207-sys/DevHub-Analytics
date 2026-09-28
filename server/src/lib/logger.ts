/** Minimal structured logger — pretty in dev, JSON in production. */
type Level = 'debug' | 'info' | 'warn' | 'error';

const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';

const colors: Record<Level, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

function write(level: Level, message: string, meta?: unknown) {
  if (level === 'debug' && !isDev) return;
  const time = new Date().toISOString();
  if (isDev) {
    const suffix = meta === undefined ? '' : ` ${safe(meta)}`;
    // eslint-disable-next-line no-console
    console.log(
      `${colors[level]}${level.padEnd(5)}\x1b[0m ${time.slice(11, 23)} ${message}${suffix}`,
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ time, level, message, ...(meta ? { meta } : {}) }));
  }
}

function safe(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
};
