import type { Paged, RepoSummary } from '../../types/domain.js';
import { ghGet, type GhResult } from './client.js';
import { normaliseRepoSummary, type Raw } from './normalise.js';

export async function searchRepositories(
  query: string,
  opts: { page: number; perPage: number; sort?: string; order?: string },
): Promise<GhResult<Paged<RepoSummary>>> {
  const result = await ghGet<{ total_count: number; items: Raw[] }>('/search/repositories', {
    query: {
      q: query,
      page: opts.page,
      per_page: opts.perPage,
      sort: opts.sort,
      order: opts.order,
    },
    ttl: 120,
    resource: 'search',
  });
  return {
    data: {
      items: result.data.items.map(normaliseRepoSummary),
      total: result.data.total_count,
      page: opts.page,
      perPage: opts.perPage,
      hasMore: opts.page * opts.perPage < Math.min(result.data.total_count, 1000),
    },
    meta: result.meta,
  };
}
