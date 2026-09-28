import type {
  ActivityPoint,
  CommitActivity,
  Contributor,
  DevProfile,
  DevSummary,
  HeatmapDay,
  LanguageStat,
  RecentCommit,
  RepoDetails,
  RepoSummary,
} from '../../types/domain.js';
import { colorForLanguage } from './language-colors.js';

/** Loose view of the GitHub payloads we consume (only the fields we read). */
export type Raw = Record<string, any>;

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const nullableStr = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;
const dateStr = (value: unknown): string | null => nullableStr(value);

export function normaliseDevSummary(raw: Raw): DevSummary {
  return {
    login: str(raw.login),
    id: num(raw.id),
    avatarUrl: str(raw.avatar_url),
    htmlUrl: str(raw.html_url ?? `https://github.com/${raw.login}`),
    type: str(raw.type, 'User'),
    ...(typeof raw.score === 'number' ? { score: raw.score } : {}),
  };
}

export function normaliseDevProfile(raw: Raw): DevProfile {
  return {
    ...normaliseDevSummary(raw),
    name: nullableStr(raw.name),
    company: nullableStr(raw.company),
    blog: nullableStr(raw.blog),
    location: nullableStr(raw.location),
    email: nullableStr(raw.email),
    bio: nullableStr(raw.bio),
    twitter: nullableStr(raw.twitter_username),
    hireable: typeof raw.hireable === 'boolean' ? raw.hireable : null,
    publicRepos: num(raw.public_repos),
    publicGists: num(raw.public_gists),
    followers: num(raw.followers),
    following: num(raw.following),
    createdAt: dateStr(raw.created_at) ?? '',
    updatedAt: dateStr(raw.updated_at),
  };
}

export function normaliseRepoSummary(raw: Raw): RepoSummary {
  const owner = (raw.owner ?? {}) as Raw;
  return {
    id: num(raw.id),
    name: str(raw.name),
    fullName: str(raw.full_name),
    description: nullableStr(raw.description),
    owner: {
      login: str(owner.login),
      avatarUrl: str(owner.avatar_url),
      htmlUrl: str(owner.html_url ?? `https://github.com/${owner.login}`),
      type: str(owner.type, 'User'),
    },
    htmlUrl: str(raw.html_url),
    homepage: nullableStr(raw.homepage),
    language: nullableStr(raw.language),
    topics: Array.isArray(raw.topics) ? raw.topics.map(String) : [],
    stars: num(raw.stargazers_count ?? raw.stars_count),
    forks: num(raw.forks_count ?? raw.forks),
    openIssues: num(raw.open_issues_count),
    watchers: num(raw.watchers_count ?? raw.stargazers_count),
    license: raw.license ? str(raw.license.spdx_id || raw.license.name, 'Unknown') : null,
    createdAt: dateStr(raw.created_at),
    updatedAt: dateStr(raw.updated_at),
    pushedAt: dateStr(raw.pushed_at),
    archived: Boolean(raw.archived),
    fork: Boolean(raw.fork),
    private: Boolean(raw.private),
    size: num(raw.size),
    ...(typeof raw.score === 'number' ? { score: raw.score } : {}),
  };
}

export function normaliseRepoDetails(raw: Raw): RepoDetails {
  const base = normaliseRepoSummary(raw);
  return {
    ...base,
    defaultBranch: str(raw.default_branch, 'main'),
    hasIssues: Boolean(raw.has_issues),
    hasWiki: Boolean(raw.has_wiki),
    hasPages: Boolean(raw.has_pages),
    subscribers: typeof raw.subscribers_count === 'number' ? raw.subscribers_count : null,
    networkCount: typeof raw.network_count === 'number' ? raw.network_count : null,
    openPullRequests: raw.open_issues
      ? Math.max(0, num(raw.open_issues) - num(raw.open_issues_count))
      : null,
    rawLanguage: nullableStr(raw.language),
  };
}

export function normaliseContributor(raw: Raw): Contributor {
  return {
    login: str(raw.login, 'ghost'),
    id: num(raw.id),
    avatarUrl: str(raw.avatar_url, 'https://avatars.githubusercontent.com/u/0?v=4'),
    htmlUrl: str(raw.html_url, 'https://github.com/ghost'),
    contributions: num(raw.contributions),
    type: str(raw.type, 'User'),
  };
}

/** GitHub's `languages` endpoint: `{ Rust: 12345, TS: 999 }` → ranked percentages. */
export function normaliseLanguages(raw: Raw): LanguageStat[] {
  const entries = Object.entries(raw ?? {}).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  );
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  return entries
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: total > 0 ? (bytes / total) * 100 : 0,
      color: colorForLanguage(name),
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

/** Merge per-repo language stats into one distribution (weighted by bytes). */
export function mergeLanguages(groups: LanguageStat[][]): LanguageStat[] {
  const totals = new Map<string, number>();
  for (const group of groups) {
    for (const stat of group) totals.set(stat.name, (totals.get(stat.name) ?? 0) + stat.bytes);
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: sum > 0 ? (bytes / sum) * 100 : 0,
      color: colorForLanguage(name),
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

const weekStart = (epochSeconds: number): string =>
  new Date(epochSeconds * 1000).toISOString().slice(0, 10);

/** `/stats/participation` → `{ all: number[] }` (52 weekly commit counts). */
export function normaliseParticipation(raw: Raw): ActivityPoint[] {
  const weeks: number[] = Array.isArray(raw?.all) ? raw.all : [];
  const now = Date.now();
  return weeks.map((value, index) => {
    const date = new Date(now - (weeks.length - 1 - index) * 7 * 86_400_000);
    return { date: date.toISOString().slice(0, 10), value: num(value) };
  });
}

/** `/stats/code_frequency` → `[[week, additions, deletions]]`. */
export function normaliseCodeFrequency(raw: unknown): ActivityPoint[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[][]).flatMap((row) => {
    const [week, additions, deletions] = row as [number, number, number];
    if (typeof week !== 'number') return [];
    return [
      {
        date: weekStart(week),
        value: num(additions) + Math.abs(num(deletions)),
        additions: num(additions),
        deletions: num(deletions),
      },
    ];
  });
}

export function buildCommitActivity(
  participation: ActivityPoint[] | null,
  codeFrequency: ActivityPoint[] | null,
): CommitActivity | null {
  if (!participation?.length && !codeFrequency?.length) return null;
  const weeks = participation ?? [];
  const code = codeFrequency ?? [];
  return {
    total: weeks.reduce((sum, point) => sum + point.value, 0),
    weeks,
    additions: code.reduce((sum, point) => sum + (point.additions ?? 0), 0),
    deletions: code.reduce((sum, point) => sum + Math.abs(point.deletions ?? 0), 0),
    codeFrequency: code,
  };
}

export function normaliseCommit(raw: Raw): RecentCommit {
  const commit = (raw.commit ?? {}) as Raw;
  const author = (commit.author ?? {}) as Raw;
  const verification = (commit.verification ?? {}) as Raw;
  return {
    sha: str(raw.sha).slice(0, 7),
    message: str(commit.message).split('\n')[0] ?? '',
    author: nullableStr(author.name) ?? nullableStr(raw.author?.login),
    authorDate: dateStr(author.date),
    htmlUrl: str(raw.html_url),
    verified: Boolean(verification.verified),
  };
}

export interface RawEvent {
  type?: string;
  repo?: { name?: string };
  created_at?: string;
  payload?: Raw;
}

/** Public events → compact activity feed entries. */
export function normaliseEvents(events: RawEvent[]): {
  type: string;
  action: string;
  repo: string;
  createdAt: string;
  url: string;
}[] {
  const verbFor: Record<string, (event: RawEvent) => string> = {
    PushEvent: (e) => `pushed ${e.payload?.size ?? e.payload?.commits?.length ?? 1} commit(s) to`,
    CreateEvent: (e) =>
      `created ${e.payload?.ref_type ?? 'a resource'}${e.payload?.ref ? ` “${e.payload.ref}”` : ''} in`,
    DeleteEvent: (e) => `deleted ${e.payload?.ref_type ?? 'a resource'} in`,
    IssuesEvent: (e) => `${e.payload?.action ?? 'updated'} an issue in`,
    IssueCommentEvent: (e) => `${e.payload?.action ?? 'commented on'} an issue in`,
    PullRequestEvent: (e) => `${e.payload?.action ?? 'updated'} a pull request in`,
    PullRequestReviewEvent: (e) => `${e.payload?.action ?? 'reviewed'} a pull request in`,
    ForkEvent: (e) => `forked`,
    WatchEvent: () => `starred`,
    ReleaseEvent: (e) => `${e.payload?.action ?? 'published'} a release in`,
    PublicEvent: () => `open-sourced`,
    MemberEvent: (e) => `${e.payload?.action ?? 'added'} a collaborator to`,
    GollumEvent: () => `updated the wiki in`,
    CommitCommentEvent: () => `commented on a commit in`,
  };

  return events.slice(0, 20).flatMap((event) => {
    const type = event.type ?? 'Event';
    const verb = verbFor[type]?.(event) ?? 'updated';
    const repo = event.repo?.name ?? '';
    if (!repo) return [];
    return [
      {
        type: type.replace(/Event$/, ''),
        action: verb,
        repo,
        createdAt: event.created_at ?? '',
        url: `https://github.com/${repo}`,
      },
    ];
  });
}

/** Build heatmap buckets (level 0-4) from raw daily counts. */
export function buildHeatmap(
  countsByDay: Map<string, number>,
  total: number,
  source: 'graphql' | 'events',
  days = 371,
): { total: number; days: HeatmapDay[]; source: 'graphql' | 'events' } {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const out: HeatmapDay[] = [];
  const values = [...countsByDay.values()];
  const max = values.length ? Math.max(...values, 1) : 1;
  const thresholds = [
    Math.max(1, Math.round(max * 0.25)),
    Math.round(max * 0.5),
    Math.round(max * 0.75),
  ];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    const count = countsByDay.get(key) ?? 0;
    const level: 0 | 1 | 2 | 3 | 4 =
      count === 0
        ? 0
        : count < thresholds[0]!
          ? 1
          : count < thresholds[1]!
            ? 2
            : count < thresholds[2]!
              ? 3
              : 4;
    out.push({ date: key, count, level });
  }
  return { total, days: out, source };
}
