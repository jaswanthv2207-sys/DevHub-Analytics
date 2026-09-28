import { db, transaction } from '../db/index.js';
import { badRequest, conflict } from '../lib/errors.js';
import { colorForLanguage } from './github/language-colors.js';
import type {
  AuthUser,
  CollectionKind,
  DashboardData,
  DevProfile,
  DevSummary,
  FavoriteRecord,
  LanguageStat,
  RepoSummary,
} from '../types/domain.js';

type Snapshot = DevSummary | RepoSummary | DevProfile;

const MAX_RECENT_SEARCHES = 8;
const MAX_RECENT_VIEWS = 10;

/* ── Favourites ──────────────────────────────────────────────────────────── */

interface FavoriteRow {
  id: number;
  kind: CollectionKind;
  ref: string;
  snapshot: string;
  created_at: string;
}

function parseSnapshot(row: FavoriteRow): FavoriteRecord {
  let snapshot: Snapshot;
  try {
    snapshot = JSON.parse(row.snapshot) as Snapshot;
  } catch {
    snapshot = { login: row.ref } as DevSummary;
  }
  return { id: row.id, kind: row.kind, ref: row.ref, snapshot, createdAt: row.created_at };
}

export function listFavorites(user: AuthUser): FavoriteRecord[] {
  const rows = db
    .prepare<[number], FavoriteRow>(
      'SELECT id, kind, ref, snapshot, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
    )
    .all(user.id);
  return rows.map(parseSnapshot);
}

export function addFavorite(
  user: AuthUser,
  kind: CollectionKind,
  ref: string,
  snapshot: Snapshot,
): FavoriteRecord {
  const cleaned = ref.trim();
  if (!cleaned) throw badRequest('A collection entry needs a reference.');
  if (kind === 'repository' && !cleaned.includes('/')) {
    throw badRequest('Repository references must look like "owner/name".');
  }
  const existing = db
    .prepare<[number, string, string], { id: number }>(
      'SELECT id FROM favorites WHERE user_id = ? AND kind = ? AND ref = ?',
    )
    .get(user.id, kind, cleaned);
  if (existing) throw conflict('That entry is already in your collection.');

  const info = db
    .prepare('INSERT INTO favorites (user_id, kind, ref, snapshot) VALUES (?, ?, ?, ?)')
    .run(user.id, kind, cleaned, JSON.stringify(snapshot));

  const row = db
    .prepare<[number], FavoriteRow>(
      'SELECT id, kind, ref, snapshot, created_at FROM favorites WHERE id = ?',
    )
    .get(Number(info.lastInsertRowid));
  if (!row) throw badRequest('Could not save that entry.');
  return parseSnapshot(row);
}

export function removeFavorite(user: AuthUser, kind: CollectionKind, ref: string): boolean {
  const info = db
    .prepare('DELETE FROM favorites WHERE user_id = ? AND kind = ? AND ref = ?')
    .run(user.id, kind, ref.trim());
  return info.changes > 0;
}

export function isFavorite(user: AuthUser, kind: CollectionKind, ref: string): boolean {
  return Boolean(
    db
      .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND kind = ? AND ref = ?')
      .get(user.id, kind, ref.trim()),
  );
}

/* ── Search history ──────────────────────────────────────────────────────── */

export function recordSearch(user: AuthUser, kind: CollectionKind, query: string): void {
  const cleaned = query.trim();
  if (!cleaned) return;
  transaction(() => {
    db.prepare('DELETE FROM search_history WHERE user_id = ? AND kind = ? AND query = ?').run(
      user.id,
      kind,
      cleaned,
    );
    db.prepare('INSERT INTO search_history (user_id, kind, query) VALUES (?, ?, ?)').run(
      user.id,
      kind,
      cleaned,
    );
    const excess = db
      .prepare<[number, number], { id: number }>(
        'SELECT id FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT -1 OFFSET ?',
      )
      .all(user.id, MAX_RECENT_SEARCHES);
    const remove = db.prepare('DELETE FROM search_history WHERE id = ?');
    for (const row of excess) remove.run(row.id);
  });
}

/* ── Recent views ────────────────────────────────────────────────────────── */

export function recordView(
  user: AuthUser,
  kind: CollectionKind,
  ref: string,
  snapshot: Snapshot,
): void {
  transaction(() => {
    db.prepare('DELETE FROM recent_views WHERE user_id = ? AND kind = ? AND ref = ?').run(
      user.id,
      kind,
      ref,
    );
    db.prepare('INSERT INTO recent_views (user_id, kind, ref, snapshot) VALUES (?, ?, ?, ?)').run(
      user.id,
      kind,
      ref,
      JSON.stringify(snapshot),
    );
    const excess = db
      .prepare<[number, number], { id: number }>(
        'SELECT id FROM recent_views WHERE user_id = ? ORDER BY viewed_at DESC LIMIT -1 OFFSET ?',
      )
      .all(user.id, MAX_RECENT_VIEWS);
    const remove = db.prepare('DELETE FROM recent_views WHERE id = ?');
    for (const row of excess) remove.run(row.id);
  });
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */

interface SearchRow {
  id: number;
  kind: CollectionKind;
  query: string;
  created_at: string;
}

export function buildDashboard(user: AuthUser): DashboardData {
  const favorites = listFavorites(user);
  const views = db
    .prepare<[number], FavoriteRow>(
      'SELECT id, kind, ref, snapshot, viewed_at AS created_at FROM recent_views WHERE user_id = ? ORDER BY viewed_at DESC',
    )
    .all(user.id)
    .map(parseSnapshot);
  const searches = db
    .prepare<[number], SearchRow>(
      'SELECT id, kind, query, created_at FROM search_history WHERE user_id = ? ORDER BY created_at DESC',
    )
    .all(user.id);

  const counts = {
    developers: favorites.filter((entry) => entry.kind === 'developer').length,
    repositories: favorites.filter((entry) => entry.kind === 'repository').length,
    searches: searches.length,
    views: views.length,
  };

  // Language mix across the saved repositories (weighted by code size).
  const languageBytes = new Map<string, number>();
  for (const entry of favorites) {
    if (entry.kind !== 'repository') continue;
    const repo = entry.snapshot as RepoSummary;
    if (!repo.language) continue;
    languageBytes.set(repo.language, (languageBytes.get(repo.language) ?? 0) + (repo.size || 1));
  }
  const totalBytes = [...languageBytes.values()].reduce((sum, value) => sum + value, 0);
  const topLanguages: LanguageStat[] = [...languageBytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: totalBytes ? (bytes / totalBytes) * 100 : 0,
      color: colorForLanguage(name),
    }));

  const topDevelopers = favorites
    .filter((entry) => entry.kind === 'developer')
    .map((entry) => {
      const dev = entry.snapshot as DevProfile;
      return {
        login: dev.login,
        avatarUrl: dev.avatarUrl,
        followers: typeof dev.followers === 'number' ? dev.followers : null,
      };
    })
    .sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1))
    .slice(0, 6);

  return {
    counts,
    favorites,
    recentViews: views,
    recentSearches: searches.map((row) => ({
      id: row.id,
      kind: row.kind,
      query: row.query,
      createdAt: row.created_at,
    })),
    topLanguages,
    topDevelopers,
  };
}
