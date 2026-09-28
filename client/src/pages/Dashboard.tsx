import { Link } from 'react-router-dom';
import { useApiQuery, useDashboard } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import type { DashboardData, RateLimitSummary, RepoSummary } from '@/lib/types';
import { PageHeader } from '@/components/layout/AppShell';
import { Avatar } from '@/components/layout/Navbar';
import { RepoCard } from '@/components/github/RepoCard';
import { Donut, Sparkline } from '@/components/charts';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { GridSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { Badge } from '@/components/ui/Chip';
import { cn, countdown, formatCompact, relativeTime, secondsUntil } from '@/lib/format';

export function Dashboard() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const rate = useApiQuery<RateLimitSummary>(['rate-limit'], '/github/rate-limit', {
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const trending = useApiQuery<{ items: RepoSummary[] }>(
    ['trending', 'dashboard'],
    '/github/trending?period=weekly',
  );

  if (dashboard.isPending) {
    return (
      <div className="space-y-6">
        <div className="glass card lit p-6">
          <Skeleton className="h-6 w-56" />
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        </div>
        <GridSkeleton count={3} />
      </div>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  }

  const data: DashboardData = dashboard.data.data;
  const core = rate.data?.data.core;
  const search = rate.data?.data.search;
  const trendingItems = (trending.data?.data.items ?? []) as RepoSummary[];

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="dashboard"
        title={
          <>
            Welcome back,{' '}
            <span className="text-gradient">{user?.displayName ?? user?.username}</span>.
          </>
        }
        description="Your collections, recent signals and the live GitHub budget — all in one console."
        actions={
          <div className="flex gap-2">
            <Link to="/explore" className="btn btn-primary">
              New search
            </Link>
            <Link to="/compare" className="btn btn-ghost">
              ⇄ Compare
            </Link>
          </div>
        }
      />

      {/* ── KPI + rate limit ────────────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Saved devs"
            value={formatCompact(data.counts.developers)}
            tone="cyan"
            icon="◍"
            sub="in collection"
          />
          <StatTile
            label="Saved repos"
            value={formatCompact(data.counts.repositories)}
            tone="pink"
            icon="⛁"
            sub="in collection"
          />
          <StatTile
            label="Searches"
            value={formatCompact(data.counts.searches)}
            tone="indigo"
            icon="⌕"
            sub="recent queries"
          />
          <StatTile
            label="Page views"
            value={formatCompact(data.counts.views)}
            tone="lime"
            icon="↗"
            sub="this session"
          />
        </div>

        <RateCard core={core} search={search} loading={rate.isPending} />
      </section>

      {/* ── Collections + languages ─────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="glass card lit p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Your collection</h2>
            <Link
              to="/collections"
              className="text-[13px] font-semibold text-energy-cyan hover:underline"
            >
              Manage →
            </Link>
          </div>

          {data.favorites.length === 0 ? (
            <EmptyState
              icon="★"
              title="Nothing saved yet"
              description="Star developers and repositories while browsing — they'll show up here and on your collections page."
              action={
                <Link to="/explore" className="btn btn-ghost">
                  Explore the graph
                </Link>
              }
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.favorites.slice(0, 6).map((favorite) => (
                <li key={`${favorite.kind}-${favorite.ref}`}>
                  <Link
                    to={
                      favorite.kind === 'developer'
                        ? `/dev/${favorite.ref}`
                        : `/repo/${favorite.ref}`
                    }
                    className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[.03] px-3 py-2.5 transition hover:border-energy-indigo/45 hover:bg-white/6"
                  >
                    <Avatar
                      name={favorite.ref}
                      src={
                        'avatarUrl' in favorite.snapshot
                          ? favorite.snapshot.avatarUrl
                          : 'owner' in favorite.snapshot
                            ? favorite.snapshot.owner.avatarUrl
                            : undefined
                      }
                      size={36}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold group-hover:text-energy-cyan">
                        {favorite.ref}
                      </span>
                      <span className="block text-[11px] text-ink-600">
                        {favorite.kind === 'developer' ? 'developer' : 'repository'} · saved{' '}
                        {relativeTime(favorite.createdAt)}
                      </span>
                    </span>
                    <Badge tone={favorite.kind === 'developer' ? 'cyan' : 'pink'}>
                      {favorite.kind === 'developer' ? '◍' : '⛁'}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {data.recentViews.length > 0 ? (
            <>
              <h3 className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
                Continue exploring
              </h3>
              <ul className="flex flex-wrap gap-2">
                {data.recentViews.slice(0, 8).map((view) => (
                  <li key={`${view.kind}-${view.ref}`}>
                    <Link
                      to={view.kind === 'developer' ? `/dev/${view.ref}` : `/repo/${view.ref}`}
                      className="chip chip-interactive mono text-[11px]"
                    >
                      {view.kind === 'developer' ? '◍' : '⛁'} {view.ref}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="glass card lit p-5">
          <h2 className="mb-4 text-lg font-bold">Collection languages</h2>
          {data.topLanguages.length > 0 ? (
            <Donut
              data={data.topLanguages.map((language) => ({
                label: language.name,
                value: language.bytes,
                color: language.color,
              }))}
              size={180}
              thickness={20}
              centerLabel="by code size"
            />
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs leading-relaxed text-ink-600">
              Save a few repositories and DevHub will chart the language mix of your stack here.
            </p>
          )}
        </div>
      </section>

      {/* ── Searches + trending ─────────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="glass card lit p-5">
          <h2 className="mb-4 text-lg font-bold">Recent searches</h2>
          {data.recentSearches.length === 0 ? (
            <p className="text-xs text-ink-600">Queries you run in Explore will appear here.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.recentSearches.map((search) => (
                <li key={search.id}>
                  <Link
                    to={`/explore?type=${search.kind === 'developer' ? 'devs' : 'repos'}&q=${encodeURIComponent(search.query)}`}
                    className="flex items-center justify-between rounded-lg border border-transparent px-2 py-1.5 transition hover:border-white/8 hover:bg-white/4"
                  >
                    <span className="mono truncate text-[13px] text-ink-300">⌕ {search.query}</span>
                    <span className="mono text-[10px] text-ink-600">
                      {relativeTime(search.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {data.topDevelopers.length > 0 ? (
            <>
              <h3 className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
                Most followed in your list
              </h3>
              <ul className="flex flex-wrap gap-2">
                {data.topDevelopers.map((dev) => (
                  <li key={dev.login}>
                    <Link to={`/dev/${dev.login}`} className="chip chip-interactive gap-2 pr-3">
                      <Avatar name={dev.login} src={dev.avatarUrl} size={20} />
                      <span className="mono text-[11px]">{dev.login}</span>
                      <span className="num text-[11px] text-ink-500">
                        {dev.followers === null ? 'saved' : formatCompact(dev.followers)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Trending right now</h2>
            <Link
              to="/explore?type=repos"
              className="text-[13px] font-semibold text-energy-cyan hover:underline"
            >
              See all →
            </Link>
          </div>
          {trending.isPending ? (
            <GridSkeleton count={3} />
          ) : trending.isError ? (
            <ErrorState
              error={trending.error}
              onRetry={() => void trending.refetch()}
              className="py-8"
            />
          ) : (
            <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {trendingItems.slice(0, 3).map((repo) => (
                <RepoCard key={repo.id} repo={repo} compact />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function RateCard({
  core,
  search,
  loading,
}: {
  core?: RateLimitSummary['core'];
  search?: RateLimitSummary['search'];
  loading?: boolean;
}) {
  if (loading || !core) {
    return (
      <div className="glass card lit p-5">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const percent = core.limit
    ? Math.max(0, Math.min(100, ((core.remaining ?? 0) / core.limit) * 100))
    : 0;
  const tone =
    percent > 40 ? 'bg-energy-mint' : percent > 15 ? 'bg-energy-amber' : 'bg-energy-rose';
  const toneText =
    percent > 40 ? 'text-energy-mint' : percent > 15 ? 'text-energy-amber' : 'text-energy-rose';

  return (
    <div className="glass card lit relative overflow-hidden p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            GitHub API budget
          </p>
          <p className="num mt-1 text-3xl font-bold leading-none">
            {formatCompact(core.remaining ?? 0)}
            <span className="text-base font-medium text-ink-600">
              {' '}
              / {formatCompact(core.limit ?? 0)}
            </span>
          </p>
        </div>
        <Badge tone={percent > 15 ? 'mint' : 'rose'}>
          <span
            className={cn('h-1.5 w-1.5 rounded-full bg-current', percent <= 15 && 'animate-pulse')}
          />
          {percent > 15 ? 'healthy' : 'limited'}
        </Badge>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className={cn('h-full rounded-full transition-[width] duration-700', tone)}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className={cn('mono mt-3 flex items-center justify-between text-[11px]', toneText)}>
        <span>{percent.toFixed(0)}% remaining</span>
        <span>resets {core.resetAt ? countdown(secondsUntil(core.resetAt)) : '—'}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/6 pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-600">search quota</p>
          <p className="num text-sm font-semibold text-ink-200">
            {formatCompact(search?.remaining ?? 0)}
            <span className="text-ink-600"> / {formatCompact(search?.limit ?? 0)}</span>
          </p>
          <Sparkline
            values={[8, 12, 9, 14, 11, 16, 13, Math.max(search?.remaining ?? 1, 1)]}
            width={110}
            height={26}
            stroke="#22d3ee"
          />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-600">strategy</p>
          <p className="mt-1 text-[12px] leading-snug text-ink-400">
            ETag revalidation + stale-on-limit fallback.
          </p>
          <Button
            size="xs"
            variant="ghost"
            className="mt-2"
            onClick={() =>
              window.open(
                'https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api',
                '_blank',
                'noopener',
              )
            }
          >
            How it works
          </Button>
        </div>
      </div>
    </div>
  );
}
