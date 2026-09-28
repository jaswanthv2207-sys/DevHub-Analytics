import { badRequest } from '../lib/errors.js';
import {
  assertLogin,
  getDeveloper,
  getDeveloperActivity,
  getDeveloperRepos,
} from './github/developers.js';
import { getRepositoryBundle } from './github/repositories.js';
import type { Contributor, DevProfile, RepoBundle } from '../types/domain.js';

/* ── Shared shape returned to the UI ─────────────────────────────────────── */

export interface CompareMetric {
  key: string;
  label: string;
  a: number;
  b: number;
  displayA: string;
  displayB: string;
  winner: 'a' | 'b' | 'tie';
}

export interface RadarAxis {
  key: string;
  label: string;
  a: number;
  b: number;
}

export interface Comparison<T> {
  a: T;
  b: T;
  metrics: CompareMetric[];
  radar: RadarAxis[];
  verdict: { winner: 'a' | 'b' | 'tie'; scoreA: number; scoreB: number; headline: string };
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const clamp01 = (value: number) => Math.max(0, Math.min(100, value));
const toScale = (value: number, ceiling: number): number =>
  clamp01((Math.log10(Math.max(0, value) + 1) / Math.log10(ceiling + 1)) * 100);

function metric(
  key: string,
  label: string,
  a: number,
  b: number,
  format: (value: number) => string = (v) => formatNumber(v),
  better: 'high' | 'low' = 'high',
): CompareMetric {
  const winner = a === b ? 'tie' : (better === 'high' ? a > b : a < b) ? 'a' : 'b';
  return { key, label, a, b, displayA: format(a), displayB: format(b), winner };
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(value * 100) / 100);
}

function daysSince(date: string | null): number {
  if (!date) return 9999;
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return 9999;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function scoreFromRadar(radar: RadarAxis[], side: 'a' | 'b'): number {
  if (radar.length === 0) return 0;
  const total = radar.reduce((sum, axis) => sum + axis[side], 0);
  return Math.round(total / radar.length);
}

function headline(
  nameA: string,
  nameB: string,
  scoreA: number,
  scoreB: number,
  metricLabel: string,
): string {
  const diff = Math.abs(scoreA - scoreB);
  if (diff < 4) return `${nameA} and ${nameB} are statistically neck-and-neck.`;
  const winner = scoreA > scoreB ? nameA : nameB;
  const loser = scoreA > scoreB ? nameB : nameA;
  if (diff < 12) return `${winner} edges out ${loser}, mainly on ${metricLabel}.`;
  return `${winner} leads decisively — ${metricLabel} is where the gap widens.`;
}

function topMetric(radar: RadarAxis[], side: 'a' | 'b'): string {
  const sorted = [...radar].sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b));
  return sorted[0]?.label.toLowerCase() ?? 'overall polish';
}

/* ── Repository comparison ───────────────────────────────────────────────── */

export interface RepoCompareSide extends RepoBundle {
  score: number;
}

export async function compareRepositories(
  nameA: string,
  nameB: string,
): Promise<Comparison<RepoCompareSide>> {
  const [a, b] = [nameA.trim(), nameB.trim()];
  if (a.toLowerCase() === b.toLowerCase()) {
    throw badRequest('Pick two different repositories to compare.');
  }

  const [bundleA, bundleB] = await Promise.all([
    getRepositoryBundle(...split(a)),
    getRepositoryBundle(...split(b)),
  ]);

  const contribTotal = (list: Contributor[]) =>
    list.reduce((sum, contributor) => sum + contributor.contributions, 0);

  const radar: RadarAxis[] = [
    {
      key: 'popularity',
      label: 'Popularity',
      a: toScale(bundleA.repository.stars, 100_000),
      b: toScale(bundleB.repository.stars, 100_000),
    },
    {
      key: 'community',
      label: 'Community',
      a: toScale(bundleA.repository.forks + contribTotal(bundleA.contributors) * 5, 50_000),
      b: toScale(bundleB.repository.forks + contribTotal(bundleB.contributors) * 5, 50_000),
    },
    {
      key: 'activity',
      label: 'Activity',
      a: clamp01(((bundleA.activity?.total ?? 0) / 520) * 100),
      b: clamp01(((bundleB.activity?.total ?? 0) / 520) * 100),
    },
    {
      key: 'momentum',
      label: 'Momentum',
      a: clamp01(100 - (daysSince(bundleA.repository.pushedAt) / 180) * 100),
      b: clamp01(100 - (daysSince(bundleB.repository.pushedAt) / 180) * 100),
    },
    {
      key: 'codebase',
      label: 'Codebase',
      a: toScale(bundleA.repository.size, 100_000),
      b: toScale(bundleB.repository.size, 100_000),
    },
  ];

  const metrics: CompareMetric[] = [
    metric('stars', 'Stars', bundleA.repository.stars, bundleB.repository.stars),
    metric('forks', 'Forks', bundleA.repository.forks, bundleB.repository.forks),
    metric(
      'openIssues',
      'Open issues',
      bundleA.repository.openIssues,
      bundleB.repository.openIssues,
      (v) => String(Math.round(v)),
    ),
    metric(
      'pullRequests',
      'Open pull requests',
      bundleA.repository.openPullRequests ?? 0,
      bundleB.repository.openPullRequests ?? 0,
      (v) => String(Math.round(v)),
    ),
    metric(
      'contributors',
      'Contributors',
      bundleA.contributors.length,
      bundleB.contributors.length,
      (v) => String(Math.round(v)),
    ),
    metric(
      'commits',
      'Commits (last year)',
      bundleA.activity?.total ?? 0,
      bundleB.activity?.total ?? 0,
    ),
    metric(
      'pushed',
      'Last push',
      daysSince(bundleA.repository.pushedAt),
      daysSince(bundleB.repository.pushedAt),
      (v) => `${Math.round(v)}d ago`,
      'low',
    ),
    metric('size', 'Repository size (KB)', bundleA.repository.size, bundleB.repository.size),
    metric(
      'topics',
      'Topics',
      bundleA.repository.topics.length,
      bundleB.repository.topics.length,
      (v) => String(Math.round(v)),
    ),
  ];

  const scoreA = scoreFromRadar(radar, 'a');
  const scoreB = scoreFromRadar(radar, 'b');
  const winner: 'a' | 'b' | 'tie' = scoreA === scoreB ? 'tie' : scoreA > scoreB ? 'a' : 'b';

  return {
    a: { ...bundleA, score: scoreA },
    b: { ...bundleB, score: scoreB },
    metrics,
    radar,
    verdict: {
      winner,
      scoreA,
      scoreB,
      headline:
        winner === 'tie'
          ? 'Dead heat — both repositories score identically.'
          : headline(
              bundleA.repository.fullName,
              bundleB.repository.fullName,
              scoreA,
              scoreB,
              topMetric(radar, winner),
            ),
    },
  };
}

function split(fullName: string): [string, string] {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) throw badRequest('Repositories must be given as "owner/name".');
  return [owner, repo];
}

/* ── Developer comparison ────────────────────────────────────────────────── */

export interface DevCompareSide {
  profile: DevProfile;
  totalStars: number;
  totalForks: number;
  repoCount: number;
  followers: number;
  following: number;
  contributions: number;
  activeDays: number;
  accountAgeDays: number;
  primaryLanguage: string | null;
  topRepo: string | null;
  score: number;
}

async function loadDev(login: string): Promise<DevCompareSide> {
  const username = assertLogin(login);
  const [profileResult, reposResult, activity] = await Promise.all([
    getDeveloper(username),
    getDeveloperRepos(username, { perPage: 100 }),
    getDeveloperActivity(username).catch(() => null),
  ]);
  const profile = profileResult.data;
  const owned = reposResult.data.filter((repo) => !repo.fork);
  const list = owned.length ? owned : reposResult.data;

  const totalStars = list.reduce((sum, repo) => sum + (repo.stargazers_count ?? 0), 0);
  const totalForks = list.reduce((sum, repo) => sum + (repo.forks_count ?? 0), 0);

  const languageBytes = new Map<string, number>();
  for (const repo of list) {
    if (!repo.language) continue;
    languageBytes.set(repo.language, (languageBytes.get(repo.language) ?? 0) + (repo.size ?? 1));
  }
  const primaryLanguage =
    [...languageBytes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? profile.name ?? null;

  const topRepo = [...list].sort(
    (a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0),
  )[0];

  return {
    profile,
    totalStars,
    totalForks,
    repoCount: list.length,
    followers: profile.followers,
    following: profile.following,
    contributions: activity?.heatmap?.total ?? 0,
    activeDays: activity?.heatmap?.days.filter((day) => day.count > 0).length ?? 0,
    accountAgeDays: Math.max(
      1,
      Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86_400_000),
    ),
    primaryLanguage,
    topRepo: topRepo?.full_name ?? null,
    score: 0,
  };
}

export async function compareDevelopers(
  loginA: string,
  loginB: string,
): Promise<Comparison<DevCompareSide>> {
  if (loginA.trim().toLowerCase() === loginB.trim().toLowerCase()) {
    throw badRequest('Pick two different developers to compare.');
  }
  const [a, b] = await Promise.all([loadDev(loginA), loadDev(loginB)]);

  const radar: RadarAxis[] = [
    {
      key: 'stars',
      label: 'Stars earned',
      a: toScale(a.totalStars, 100_000),
      b: toScale(b.totalStars, 100_000),
    },
    {
      key: 'reach',
      label: 'Reach',
      a: toScale(a.followers, 100_000),
      b: toScale(b.followers, 100_000),
    },
    {
      key: 'output',
      label: 'Output',
      a: toScale(a.repoCount, 500),
      b: toScale(b.repoCount, 500),
    },
    {
      key: 'contributions',
      label: 'Contributions',
      a: toScale(a.contributions, 5000),
      b: toScale(b.contributions, 5000),
    },
    {
      key: 'consistency',
      label: 'Consistency',
      a: clamp01((a.activeDays / 365) * 100),
      b: clamp01((b.activeDays / 365) * 100),
    },
    {
      key: 'longevity',
      label: 'Longevity',
      a: toScale(a.accountAgeDays, 5000),
      b: toScale(b.accountAgeDays, 5000),
    },
  ];

  const metrics: CompareMetric[] = [
    metric('followers', 'Followers', a.followers, b.followers),
    metric('stars', 'Stars on own repos', a.totalStars, b.totalStars),
    metric('repos', 'Public repositories', a.repoCount, b.repoCount, (v) => String(Math.round(v))),
    metric('forks', 'Forks received', a.totalForks, b.totalForks),
    metric('contributions', 'Contributions', a.contributions, b.contributions),
    metric('activeDays', 'Active days (1y)', a.activeDays, b.activeDays, (v) =>
      String(Math.round(v)),
    ),
    metric('following', 'Following', a.following, b.following, (v) => String(Math.round(v))),
    metric('age', 'Account age (days)', a.accountAgeDays, b.accountAgeDays, (v) =>
      String(Math.round(v)),
    ),
  ];

  const scoreA = scoreFromRadar(radar, 'a');
  const scoreB = scoreFromRadar(radar, 'b');
  a.score = scoreA;
  b.score = scoreB;
  const winner: 'a' | 'b' | 'tie' = scoreA === scoreB ? 'tie' : scoreA > scoreB ? 'a' : 'b';
  const winningDev = (winner === 'a' ? a : b).profile.login;

  return {
    a,
    b,
    metrics,
    radar,
    verdict: {
      winner,
      scoreA,
      scoreB,
      headline:
        winner === 'tie'
          ? `${a.profile.login} and ${b.profile.login} are perfectly matched.`
          : `${winningDev} takes it — ${topMetric(radar, winner)} is the deciding axis.`,
    },
  };
}
