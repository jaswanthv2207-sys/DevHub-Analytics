import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApiQuery, useRecordActivity } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import type { DeveloperBundle, ResponseMeta } from '@/lib/types';
import { Avatar } from '@/components/layout/Navbar';
import { PageHeader } from '@/components/layout/AppShell';
import { FavoriteButton } from '@/components/github/FavoriteButton';
import { CacheBadge } from '@/components/github/CacheBadge';
import { EventFeed, LanguageStack } from '@/components/github/Panels';
import { RepoCard } from '@/components/github/RepoCard';
import { Bars, Donut, Heatmap } from '@/components/charts';
import { GridSkeleton, HeroSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { StatTile } from '@/components/ui/StatTile';
import { Badge } from '@/components/ui/Chip';
import { Tabs } from '@/components/ui/Tabs';
import { formatCompact, formatDate } from '@/lib/format';

export function Developer() {
  const { login = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const recordActivity = useRecordActivity();

  const sort = params.get('sort') ?? 'stars';

  const query = useApiQuery<DeveloperBundle>(['developer', login], `/github/users/${login}`, {
    enabled: Boolean(login),
    staleTime: 120_000,
  });

  const bundle = query.data?.data;
  const meta = query.data?.meta as ResponseMeta | undefined;

  useEffect(() => {
    if (!bundle || !isAuthenticated) return;
    recordActivity.mutate({
      type: 'view',
      kind: 'developer',
      ref: bundle.profile.login,
      snapshot: bundle.profile,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle?.profile.login, isAuthenticated]);

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <HeroSkeleton />
        <GridSkeleton count={3} />
      </div>
    );
  }

  if (query.isError || !bundle) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const { profile, stats, repositories, languages, activity } = bundle;
  const sortedRepos = [...repositories].sort((a, b) =>
    sort === 'stars'
      ? b.stars - a.stars
      : Date.parse(b.pushedAt ?? '0') - Date.parse(a.pushedAt ?? '0'),
  );

  const contributionSeries =
    activity?.heatmap?.days
      .filter((_, index) => index % 7 === 0)
      .map((day) => ({ date: day.date, value: day.count })) ?? [];

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow={`developer · @${profile.login}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {profile.name ?? profile.login}
            {profile.type === 'Organization' ? <Badge tone="indigo">organization</Badge> : null}
            {profile.hireable ? <Badge tone="mint">hireable</Badge> : null}
          </span>
        }
        description={profile.bio ?? 'This developer has not written a bio yet.'}
        align="between"
        actions={
          <div className="flex items-center gap-2">
            {meta ? <CacheBadge meta={meta} /> : null}
            <FavoriteButton
              kind="developer"
              reference={profile.login}
              snapshot={profile}
              variant="pill"
            />
            <a
              href={profile.htmlUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-ghost"
            >
              GitHub ↗
            </a>
          </div>
        }
      />

      {/* ── Profile hero ─────────────────────────────────────────────────── */}
      <section className="glass card lit relative overflow-hidden">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(34,211,238,.16),transparent_55%),radial-gradient(ellipse_at_85%_0%,rgba(244,114,182,.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-start lg:p-7">
          <Avatar
            name={profile.login}
            src={profile.avatarUrl}
            size={104}
            className="ring-2 ring-energy-indigo/50 shadow-[0_0_50px_-12px_rgba(129,140,248,.9)]"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={profile.htmlUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mono text-sm font-semibold text-energy-cyan hover:underline"
              >
                @{profile.login}
              </a>
              {profile.blog ? (
                <a
                  href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="chip chip-interactive mono text-[11px]"
                >
                  ↗ {profile.blog.replace(/^https?:\/\//, '').slice(0, 34)}
                </a>
              ) : null}
              {profile.location ? (
                <span className="chip text-[11px]">⌖ {profile.location}</span>
              ) : null}
              {profile.company ? (
                <span className="chip text-[11px]">⚑ {profile.company}</span>
              ) : null}
              {profile.twitter ? (
                <a
                  href={`https://twitter.com/${profile.twitter}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="chip chip-interactive mono text-[11px]"
                >
                  ✕ {profile.twitter}
                </a>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile
                label="Followers"
                value={formatCompact(profile.followers)}
                tone="cyan"
                icon="◌"
              />
              <StatTile
                label="Following"
                value={formatCompact(profile.following)}
                tone="indigo"
                icon="⇄"
              />
              <StatTile
                label="Public repos"
                value={formatCompact(profile.publicRepos)}
                tone="pink"
                icon="⛁"
              />
              <StatTile
                label="Stars earned"
                value={formatCompact(stats.totalStars)}
                tone="amber"
                icon="★"
              />
              <StatTile
                label="Forks received"
                value={formatCompact(stats.totalForks)}
                tone="mint"
                icon="⑂"
              />
              <StatTile
                label="Followers / day"
                value={stats.followersPerDay}
                sub={`since ${formatDate(profile.createdAt)}`}
                tone="lime"
                icon="↗"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* left: repositories */}
        <section className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Repositories{' '}
              <span className="mono text-sm font-normal text-ink-500">({stats.reposAnalyzed})</span>
            </h2>
            <Tabs
              size="sm"
              items={[
                { value: 'stars', label: 'Top stars' },
                { value: 'pushed', label: 'Recently pushed' },
              ]}
              value={sort}
              onChange={(value) => {
                const next = new URLSearchParams(params);
                next.set('sort', value);
                setParams(next, { replace: true });
              }}
            />
          </div>

          {sortedRepos.length === 0 ? (
            <EmptyState
              icon="⛁"
              title="No repositories yet"
              description="This account has not published any repositories."
            />
          ) : (
            <div className="stagger grid gap-4 sm:grid-cols-2">
              {sortedRepos.slice(0, 8).map((repo) => (
                <RepoCard key={repo.id} repo={repo} compact />
              ))}
            </div>
          )}

          {stats.mostStarred ? (
            <div className="glass card lit flex flex-wrap items-center gap-4 border-energy-amber/25 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-energy-amber/12 text-xl text-energy-amber">
                ★
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-ink-500">
                  Most starred repository
                </p>
                <Link
                  to={`/repo/${stats.mostStarred.fullName}`}
                  className="block truncate font-display text-base font-bold hover:text-energy-cyan"
                >
                  {stats.mostStarred.fullName}
                </Link>
              </div>
              <p className="num text-2xl font-bold text-energy-amber">
                {formatCompact(stats.mostStarred.stars)}
              </p>
              <p className="mono text-[11px] text-ink-500">
                {stats.starsPerRepo} stars / repo average
              </p>
            </div>
          ) : null}
        </section>

        {/* right: signals */}
        <aside className="space-y-6">
          <section className="glass card lit p-5">
            <h2 className="mb-4 text-base font-bold">Language distribution</h2>
            {languages.length > 0 ? (
              <Donut
                data={languages.slice(0, 6).map((language) => ({
                  label: language.name,
                  value: language.bytes,
                  color: language.color,
                }))}
                size={180}
                thickness={20}
                centerLabel="by bytes"
              />
            ) : (
              <p className="text-xs text-ink-600">No language data available.</p>
            )}
          </section>

          <section className="glass card lit p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">Contribution pulse</h2>
              <span className="mono text-[10px] text-ink-600">last 12 months</span>
            </div>
            {activity?.heatmap ? (
              <Heatmap heatmap={activity.heatmap} />
            ) : (
              <p className="text-xs text-ink-600">
                Contribution data is not public for this account.
              </p>
            )}
            {contributionSeries.length > 0 ? (
              <Bars points={contributionSeries} height={90} accent="cyan" className="mt-5" />
            ) : null}
          </section>

          <section className="glass card lit p-5">
            <h2 className="mb-4 text-base font-bold">Recent activity</h2>
            <EventFeed events={activity?.events ?? []} />
          </section>

          <section className="glass card lit p-5">
            <h2 className="mb-3 text-base font-bold">Top languages</h2>
            <LanguageStack languages={languages} />
          </section>
        </aside>
      </div>
    </div>
  );
}
