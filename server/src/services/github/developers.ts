import type {
  DevProfile,
  DevStats,
  LanguageStat,
  Paged,
  DevSummary,
  DeveloperActivity,
} from '../../types/domain.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { ghGet, ghGraphQL, type GhResult } from './client.js';
import {
  buildHeatmap,
  mergeLanguages,
  normaliseDevProfile,
  normaliseDevSummary,
  normaliseEvents,
  normaliseLanguages,
  normaliseRepoSummary,
  type Raw,
} from './normalise.js';

const LOGIN_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export function assertLogin(login: string): string {
  const value = login.trim();
  if (!LOGIN_RE.test(value)) throw badRequest('That is not a valid GitHub username.');
  return value;
}

/* ── Search ──────────────────────────────────────────────────────────────── */

export async function searchDevelopers(
  query: string,
  opts: { page: number; perPage: number; sort?: string },
): Promise<GhResult<Paged<DevSummary>>> {
  const result = await ghGet<{ total_count: number; items: Raw[] }>('/search/users', {
    query: {
      q: query,
      page: opts.page,
      per_page: opts.perPage,
      sort: opts.sort,
    },
    ttl: 120,
    resource: 'search',
  });
  return {
    data: {
      items: result.data.items.map(normaliseDevSummary),
      total: result.data.total_count,
      page: opts.page,
      perPage: opts.perPage,
      hasMore: opts.page * opts.perPage < Math.min(result.data.total_count, 1000),
    },
    meta: result.meta,
  };
}

/* ── Profile ─────────────────────────────────────────────────────────────── */

export async function getDeveloper(login: string): Promise<GhResult<DevProfile>> {
  const username = assertLogin(login);
  const result = await ghGet<Raw>(`/users/${encodeURIComponent(username)}`, { ttl: 300 });
  return { data: normaliseDevProfile(result.data), meta: result.meta };
}

export async function getDeveloperRepos(
  login: string,
  opts: { sort?: string; perPage?: number } = {},
): Promise<GhResult<Raw[]>> {
  const username = assertLogin(login);
  const sort = opts.sort ?? 'pushed';
  return ghGet<Raw[]>(`/users/${encodeURIComponent(username)}/repos`, {
    query: { per_page: opts.perPage ?? 100, sort, direction: 'desc', type: 'owner' },
    ttl: 300,
  });
}

/** Language distribution across a developer's repositories (exact for the top repos). */
export async function getDeveloperLanguages(login: string): Promise<LanguageStat[]> {
  const repos = await getDeveloperRepos(login, { sort: 'updated' });
  const top = [...repos.data]
    .filter((repo) => !repo.fork)
    .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))
    .slice(0, 6);

  const groups = await Promise.all(
    top.map(async (repo) => {
      try {
        const result = await ghGet<Raw>(`/repos/${encodeURIComponent(repo.full_name)}/languages`, {
          ttl: 3600,
        });
        return normaliseLanguages(result.data);
      } catch {
        return [] as LanguageStat[];
      }
    }),
  );

  const exact = mergeLanguages(groups.filter((group) => group.length > 0));
  if (exact.length > 0) return exact;

  // Fallback: weight each repository's primary language by repository size.
  return mergeLanguages(
    repos.data
      .filter((repo) => repo.language)
      .map((repo) => [
        {
          name: String(repo.language),
          bytes: Math.max(1, Number(repo.size ?? 1)) * 1024,
          percentage: 0,
          color: '',
        },
      ]),
  );
}

function accountAgeDays(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(1, Math.floor((Date.now() - created) / 86_400_000));
}

export function computeDevStats(
  profile: DevProfile,
  repos: Raw[],
  languages: LanguageStat[],
): DevStats {
  const owned = repos.filter((repo) => !repo.fork);
  const list = owned.length > 0 ? owned : repos;
  const totalStars = list.reduce((sum, repo) => sum + (repo.stargazers_count ?? 0), 0);
  const totalForks = list.reduce((sum, repo) => sum + (repo.forks_count ?? 0), 0);
  const best = list.reduce<Raw | null>(
    (acc, repo) =>
      !acc || (repo.stargazers_count ?? 0) > (acc.stargazers_count ?? 0) ? repo : acc,
    null,
  );
  const age = accountAgeDays(profile.createdAt);

  return {
    reposAnalyzed: list.length,
    totalStars,
    totalForks,
    topLanguages: languages.slice(0, 6),
    mostStarred: best ? normaliseRepoSummary(best) : null,
    accountAgeDays: age,
    followersPerDay: Number((profile.followers / age).toFixed(2)),
    starsPerRepo: list.length ? Number((totalStars / list.length).toFixed(1)) : 0,
  };
}

/* ── Activity ────────────────────────────────────────────────────────────── */

const CONTRIBUTIONS_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { date contributionCount }
          }
        }
      }
    }
  }`;

interface GraphQlCalendar {
  user?: {
    contributionsCollection?: {
      contributionCalendar?: {
        totalContributions: number;
        weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
      };
    };
  };
}

async function contributionCalendar(login: string) {
  const data = await ghGraphQL<GraphQlCalendar>(CONTRIBUTIONS_QUERY, { login }, 1800);
  const calendar = data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) return null;
  const counts = new Map<string, number>();
  for (const week of calendar.weeks ?? []) {
    for (const day of week.contributionDays ?? []) {
      counts.set(day.date, (counts.get(day.date) ?? 0) + day.contributionCount);
    }
  }
  return buildHeatmap(counts, calendar.totalContributions ?? 0, 'graphql');
}

async function activityFromEvents(login: string) {
  const result = await ghGet<Raw[]>(`/users/${encodeURIComponent(login)}/events/public`, {
    query: { per_page: 30 },
    ttl: 120,
  });
  const counts = new Map<string, number>();
  for (const event of result.data) {
    const date = String(event.created_at ?? '').slice(0, 10);
    if (date) counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  return {
    heatmap: buildHeatmap(counts, total, 'events'),
    events: normaliseEvents(result.data),
  };
}

export async function getDeveloperActivity(login: string): Promise<DeveloperActivity> {
  const username = assertLogin(login);
  const [calendar, eventsResult] = await Promise.all([
    contributionCalendar(username),
    activityFromEvents(username).catch(() => null),
  ]);

  if (!eventsResult) {
    return { heatmap: calendar, events: [] };
  }
  return { heatmap: calendar ?? eventsResult.heatmap, events: eventsResult.events };
}

/* ── Bundle ──────────────────────────────────────────────────────────────── */

export async function getDeveloperBundle(login: string) {
  const username = assertLogin(login);
  const profileResult = await getDeveloper(username);
  if (profileResult.data.type === 'Organization') {
    // Organizations are searchable but have a different shape; still render them.
  }
  const reposResult = await getDeveloperRepos(username);
  const [languages, activity] = await Promise.all([
    getDeveloperLanguages(username).catch(() => [] as LanguageStat[]),
    getDeveloperActivity(username).catch(() => null),
  ]);

  const repositories = reposResult.data
    .map(normaliseRepoSummary)
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 12);

  return {
    profile: profileResult.data,
    stats: computeDevStats(profileResult.data, reposResult.data, languages),
    repositories,
    languages,
    activity,
    meta: profileResult.meta,
  };
}
