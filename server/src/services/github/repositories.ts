import type {
  CommitActivity,
  Contributor,
  LanguageStat,
  Paged,
  RecentCommit,
  RepoBundle,
  RepoDetails,
  RepoSummary,
} from '../../types/domain.js';
import { notFound } from '../../lib/errors.js';
import { ghGet, ghGetStats, type GhResult } from './client.js';
import {
  buildCommitActivity,
  normaliseCodeFrequency,
  normaliseCommit,
  normaliseContributor,
  normaliseLanguages,
  normaliseParticipation,
  normaliseRepoDetails,
  normaliseRepoSummary,
  type Raw,
} from './normalise.js';
import { searchRepositories } from './search.js';

export function assertRepoName(fullName: string): [string, string] {
  const parts = fullName.split('/').map((part) => part.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw notFound('Expected a repository in the form "owner/name".');
  }
  return [parts[0], parts[1]];
}

/* ── Details ─────────────────────────────────────────────────────────────── */

export async function getRepository(owner: string, repo: string): Promise<GhResult<RepoDetails>> {
  const result = await ghGet<Raw>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { ttl: 300 },
  );
  return { data: normaliseRepoDetails(result.data), meta: result.meta };
}

export async function getRepositoryLanguages(owner: string, repo: string) {
  const result = await ghGet<Raw>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
    { ttl: 3600 },
  );
  return { data: normaliseLanguages(result.data), meta: result.meta };
}

export async function getRepositoryContributors(
  owner: string,
  repo: string,
  perPage = 100,
): Promise<Contributor[]> {
  try {
    const result = await ghGet<Raw[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors`,
      { query: { per_page: perPage }, ttl: 1800 },
    );
    return result.data.map(normaliseContributor);
  } catch {
    return [];
  }
}

export interface IssueBreakdown {
  openIssues: number;
  openPullRequests: number;
}

/**
 * `open_issues_count` mixes issues and pull requests, so we ask the Search API
 * for each side separately (its quota is independent of the core API).
 */
export async function getIssueBreakdown(fullName: string): Promise<IssueBreakdown> {
  try {
    const [prs, all] = await Promise.all([
      ghGet<{ total_count: number }>('/search/issues', {
        query: { q: `repo:${fullName} is:pr is:open`, per_page: 1 },
        ttl: 600,
        resource: 'search',
      }),
      ghGet<{ total_count: number }>('/search/issues', {
        query: { q: `repo:${fullName} is:open`, per_page: 1 },
        ttl: 600,
        resource: 'search',
      }),
    ]);
    const openPullRequests = prs.data.total_count;
    return { openPullRequests, openIssues: Math.max(0, all.data.total_count - openPullRequests) };
  } catch {
    return { openIssues: 0, openPullRequests: 0 };
  }
}

export async function getRepositoryActivity(
  owner: string,
  repo: string,
): Promise<CommitActivity | null> {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const [participation, codeFrequency] = await Promise.all([
    ghGetStats<Raw>(`${base}/stats/participation`, { ttl: 3600 }),
    ghGetStats<Raw>(`${base}/stats/code_frequency`, { ttl: 3600 }),
  ]);
  return buildCommitActivity(
    participation ? normaliseParticipation(participation.data) : null,
    codeFrequency ? normaliseCodeFrequency(codeFrequency.data) : null,
  );
}

export async function getRecentCommits(
  owner: string,
  repo: string,
  perPage = 6,
): Promise<RecentCommit[]> {
  try {
    const result = await ghGet<Raw[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`,
      { query: { per_page: perPage }, ttl: 600 },
    );
    return result.data.map(normaliseCommit);
  } catch {
    return [];
  }
}

/* ── Bundles ─────────────────────────────────────────────────────────────── */

export async function getRepositoryBundle(owner: string, repo: string): Promise<RepoBundle> {
  const [details, languages, contributors, activity, recentCommits] = await Promise.all([
    getRepository(owner, repo),
    getRepositoryLanguages(owner, repo).catch(() => ({ data: [] as LanguageStat[], meta: null })),
    getRepositoryContributors(owner, repo),
    getRepositoryActivity(owner, repo).catch(() => null),
    getRecentCommits(owner, repo),
  ]);

  // GitHub may transfer/rename a repository — always key follow-up queries on
  // the canonical `full_name` returned with the details payload.
  const canonical = details.data.fullName || `${owner}/${repo}`;
  const breakdown = await getIssueBreakdown(canonical).catch(() => ({
    openIssues: 0,
    openPullRequests: 0,
  }));

  const repository: RepoDetails = {
    ...details.data,
    openIssues: breakdown.openIssues,
    openPullRequests: breakdown.openPullRequests,
  };

  return {
    repository,
    languages: languages.data,
    contributors,
    activity,
    recentCommits,
  };
}

/* ── Exploration helpers used by the dashboard / explore page ────────────── */

export async function trendingRepositories(period: 'daily' | 'weekly' | 'monthly' = 'weekly') {
  const since = new Date(
    Date.now() - (period === 'daily' ? 1 : period === 'weekly' ? 7 : 30) * 86_400_000,
  );
  const created = `created:>=${since.toISOString().slice(0, 10)}`;
  const result = await searchRepositories(`${created} stars:>10`, {
    page: 1,
    perPage: 8,
    sort: 'stars',
    order: 'desc',
  });
  return result;
}
