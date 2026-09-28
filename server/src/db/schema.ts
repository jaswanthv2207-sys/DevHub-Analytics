/** Database schema. Executed idempotently at boot — safe to run on every start. */
export const SCHEMA = /* sql */ `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Personal collections: favourite developers & repositories (snapshot = JSON at save time).
CREATE TABLE IF NOT EXISTS favorites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL CHECK (kind IN ('developer','repository')),
  ref        TEXT    NOT NULL,               -- "octocat" or "owner/repo"
  snapshot   TEXT    NOT NULL,               -- denormalised payload for instant rendering
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, kind, ref)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, kind, created_at DESC);

-- Recent searches shown on the dashboard.
CREATE TABLE IF NOT EXISTS search_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL CHECK (kind IN ('developer','repository')),
  query      TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_search_user ON search_history(user_id, created_at DESC);

-- Recently viewed profiles / repositories (feeds "continue exploring").
CREATE TABLE IF NOT EXISTS recent_views (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL CHECK (kind IN ('developer','repository')),
  ref        TEXT    NOT NULL,
  snapshot   TEXT    NOT NULL,
  viewed_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, kind, ref)
);
CREATE INDEX IF NOT EXISTS idx_views_user ON recent_views(user_id, viewed_at DESC);

-- Response cache for the GitHub REST/GraphQL integration (ETag aware).
CREATE TABLE IF NOT EXISTS response_cache (
  key         TEXT    PRIMARY KEY,
  value       TEXT    NOT NULL,
  etag        TEXT,
  status      INTEGER NOT NULL DEFAULT 200,
  stored_at   INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  stale_until INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cache_expiry ON response_cache(expires_at);

-- Persisted view of the GitHub rate-limit budget so restarts keep the state.
CREATE TABLE IF NOT EXISTS rate_state (
  resource   TEXT    PRIMARY KEY,
  limit_val  INTEGER,
  remaining  INTEGER,
  used       INTEGER,
  reset_at   INTEGER,
  updated_at INTEGER NOT NULL
);
`;
