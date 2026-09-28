import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApiQuery, useRecordActivity } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import type { DevSummary, Paged, RepoSummary, ResponseMeta } from '@/lib/types';
import { DevCard } from '@/components/github/DevCard';
import { RepoCard } from '@/components/github/RepoCard';
import { CacheBadge } from '@/components/github/CacheBadge';
import { PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { Tabs } from '@/components/ui/Tabs';
import { Select } from '@/components/ui/Field';
import { formatCompact } from '@/lib/format';

type SearchType = 'devs' | 'repos';

const DEV_SORTS = [
  { value: '', label: 'Best match' },
  { value: 'followers', label: 'Followers' },
  { value: 'repositories', label: 'Repositories' },
  { value: 'joined', label: 'Newest' },
];

const REPO_SORTS = [
  { value: '', label: 'Best match' },
  { value: 'stars', label: 'Stars' },
  { value: 'forks', label: 'Forks' },
  { value: 'updated', label: 'Recently updated' },
];

const STARTERS = {
  devs: ['sindresorhus', 'gaearon', 'kentcdodds', 'dan-abramov', 'tj'],
  repos: ['react', 'rust-lang/rust', 'vercel/next.js', 'tailwindlabs/tailwindcss', 'vite'],
} as const;

export function Explore() {
  const [params, setParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const recordActivity = useRecordActivity();

  const type = (params.get('type') === 'repos' ? 'repos' : 'devs') as SearchType;
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const sort = params.get('sort') ?? '';

  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  const path = q
    ? type === 'devs'
      ? `/github/search/users?q=${encodeURIComponent(q)}&page=${page}&perPage=12${sort ? `&sort=${sort}` : ''}`
      : `/github/search/repositories?q=${encodeURIComponent(q)}&page=${page}&perPage=12${sort ? `&sort=${sort}` : ''}`
    : null;

  const results = useApiQuery<Paged<DevSummary> | Paged<RepoSummary>>(
    ['search', type, q, page, sort],
    path,
    { enabled: Boolean(q), staleTime: 60_000 },
  );

  // Persist recent searches for the dashboard (authenticated users only).
  useEffect(() => {
    if (!q || !isAuthenticated) return;
    recordActivity.mutate({
      type: 'search',
      kind: type === 'devs' ? 'developer' : 'repository',
      query: q,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, isAuthenticated]);

  const update = (next: Record<string, string | number | undefined>) => {
    const updated = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '') updated.delete(key);
      else updated.set(key, String(value));
    }
    setParams(updated, { replace: false });
  };

  const runSearch = (value: string) => update({ q: value.trim() || undefined, page: 1 });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    runSearch(term);
  };

  const data = results.data?.data as Paged<DevSummary> | Paged<RepoSummary> | undefined;
  const meta = results.data?.meta as ResponseMeta | undefined;
  const items = data?.items ?? [];

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="explore"
        title={
          <>
            Search the entire <span className="text-gradient">GitHub graph</span>.
          </>
        }
        description="Query 400M+ developers and 300M+ repositories. Results are cached for two minutes and revalidated with ETags so the quota goes further."
        actions={meta ? <CacheBadge meta={meta} /> : null}
      />

      {/* ── Search console ─────────────────────────────────────────────── */}
      <div className="glass card lit relative mb-6 overflow-hidden p-4 sm:p-5">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-ink-600">
              ⌕
            </span>
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={
                type === 'devs'
                  ? 'Search developers — try “kent c. dodds”'
                  : 'Search repositories — try “state management”'
              }
              aria-label="Search query"
              className="input py-3.5 pl-11 pr-4 text-[15px]"
            />
          </div>
          <div className="flex gap-2">
            <Select
              aria-label="Sort results"
              value={sort}
              onChange={(event) => update({ sort: event.target.value || undefined, page: 1 })}
              className="min-w-40"
            >
              {(type === 'devs' ? DEV_SORTS : REPO_SORTS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={results.isFetching && Boolean(q)}
            >
              Search
            </Button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            items={[
              { value: 'devs', label: 'Developers', icon: '◍' },
              { value: 'repos', label: 'Repositories', icon: '⛁' },
            ]}
            value={type}
            onChange={(value) => update({ type: value, page: 1 })}
          />
          {data ? (
            <p className="mono text-[11px] text-ink-500">
              {formatCompact(data.total)} results · page {data.page}
            </p>
          ) : null}
        </div>

        {!q ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/6 pt-4">
            <span className="text-[11px] uppercase tracking-wider text-ink-600">Try</span>
            {STARTERS[type].map((starter) => (
              <button
                key={starter}
                onClick={() => runSearch(starter)}
                className="chip chip-interactive mono text-[11px]"
              >
                {starter}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Results ────────────────────────────────────────────────────── */}
      {!q ? (
        <EmptyState
          icon="⌕"
          title="What are you looking for?"
          description="Search for a developer profile or a repository to unlock stars, languages, contributors and activity charts."
          action={
            <Button variant="ghost" size="sm" onClick={() => runSearch(STARTERS[type][0])}>
              Try “{STARTERS[type][0]}”
            </Button>
          }
        />
      ) : results.isPending ? (
        <GridSkeleton count={6} />
      ) : results.isError ? (
        <ErrorState error={results.error} onRetry={() => void results.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="◌"
          title={`No matches for “${q}”`}
          description="Check the spelling, or try a broader term. GitHub search matches names, descriptions and topics."
          action={
            <Button variant="ghost" size="sm" onClick={() => update({ q: undefined, page: 1 })}>
              Clear search
            </Button>
          }
        />
      ) : (
        <>
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {type === 'devs'
              ? items.map((item) => <DevCard key={item.id} dev={item as DevSummary} />)
              : items.map((item) => <RepoCard key={item.id} repo={item as RepoSummary} />)}
          </div>
          <Pagination
            page={page}
            hasMore={Boolean(data?.hasMore)}
            busy={results.isFetching}
            onChange={(next) => {
              update({ page: next });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}
