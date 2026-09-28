import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApiQuery, useRecordActivity } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import type { RepoBundle, ResponseMeta } from '@/lib/types';
import { PageHeader } from '@/components/layout/AppShell';
import { Avatar } from '@/components/layout/Navbar';
import { FavoriteButton } from '@/components/github/FavoriteButton';
import { CacheBadge } from '@/components/github/CacheBadge';
import { CommitList, ContributorList, LanguageStack } from '@/components/github/Panels';
import { Bars, CodeFrequency, Donut } from '@/components/charts';
import { Badge, TopicChip } from '@/components/ui/Chip';
import { GridSkeleton, HeroSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { StatTile } from '@/components/ui/StatTile';
import { Tabs } from '@/components/ui/Tabs';
import { cn, formatCompact, formatBytes, relativeTime } from '@/lib/format';

type ActivityTab = 'commits' | 'code';

export function Repository() {
  const { owner = '', repo = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const recordActivity = useRecordActivity();

  const tab = (params.get('tab') === 'code' ? 'code' : 'commits') as ActivityTab;
  const fullName = `${owner}/${repo}`;

  const query = useApiQuery<RepoBundle>(
    ['repository', fullName],
    `/github/repos/${owner}/${repo}`,
    {
      enabled: Boolean(owner && repo),
      staleTime: 120_000,
    },
  );

  const bundle = query.data?.data;
  const meta = query.data?.meta as ResponseMeta | undefined;

  useEffect(() => {
    if (!bundle || !isAuthenticated) return;
    recordActivity.mutate({
      type: 'view',
      kind: 'repository',
      ref: bundle.repository.fullName,
      snapshot: bundle.repository,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle?.repository.fullName, isAuthenticated]);

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

  const { repository, languages, contributors, activity, recentCommits } = bundle;
  const totalContributions = contributors.reduce(
    (sum, contributor) => sum + contributor.contributions,
    0,
  );
  const setTab = (value: ActivityTab) => {
    const next = new URLSearchParams(params);
    next.set('tab', value);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="repository"
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-ink-500">{repository.owner.login}/</span>
            <span className="text-gradient-static">{repository.name}</span>
            {repository.archived ? <Badge tone="amber">archived</Badge> : null}
            {repository.fork ? <Badge tone="neutral">fork</Badge> : null}
          </span>
        }
        description={repository.description ?? 'This repository has no description.'}
        align="between"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {meta ? <CacheBadge meta={meta} /> : null}
            <FavoriteButton
              kind="repository"
              reference={repository.fullName}
              snapshot={repository}
              variant="pill"
            />
            <a
              href={repository.htmlUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-ghost"
            >
              GitHub ↗
            </a>
            <Link
              to={`/compare?mode=repos&a=${encodeURIComponent(repository.fullName)}&b=vuejs/core`}
              className="btn btn-ghost"
            >
              ⇄ Compare
            </Link>
          </div>
        }
      />

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Stars"
          value={formatCompact(repository.stars)}
          tone="amber"
          icon="★"
          sub="watchers"
        />
        <StatTile
          label="Forks"
          value={formatCompact(repository.forks)}
          tone="cyan"
          icon="⑂"
          sub="networks"
        />
        <StatTile
          label="Open issues"
          value={formatCompact(repository.openIssues)}
          tone="indigo"
          icon="◇"
          sub="bugs & ideas"
        />
        <StatTile
          label="Pull requests"
          value={formatCompact(repository.openPullRequests ?? 0)}
          tone="pink"
          icon="⤳"
          sub="in review"
        />
        <StatTile
          label="Contributors"
          value={formatCompact(contributors.length)}
          tone="mint"
          icon="◌"
          sub={`${formatCompact(totalContributions)} commits`}
        />
        <StatTile
          label="Commits / year"
          value={formatCompact(activity?.total ?? 0)}
          tone="lime"
          icon="⚡"
          sub={activity ? '52-week window' : 'no data'}
        />
      </section>

      {/* ── Meta bar ─────────────────────────────────────────────────────── */}
      <section className="glass card lit flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
        <span className="flex items-center gap-2.5">
          <Avatar name={repository.owner.login} src={repository.owner.avatarUrl} size={30} />
          <Link
            to={`/dev/${repository.owner.login}`}
            className="text-sm font-semibold hover:text-energy-cyan"
          >
            {repository.owner.login}
          </Link>
        </span>
        <Meta label="language" value={repository.rawLanguage ?? '—'} />
        <Meta label="license" value={repository.license ?? '—'} />
        <Meta label="size" value={formatBytes(repository.size * 1024)} />
        <Meta label="default branch" value={repository.defaultBranch} />
        <Meta label="created" value={yearsSince(repository.createdAt ?? '') + ' years ago'} />
        <Meta label="last push" value={relativeTime(repository.pushedAt)} />
        {repository.homepage ? (
          <a
            href={
              repository.homepage.startsWith('http')
                ? repository.homepage
                : `https://${repository.homepage}`
            }
            target="_blank"
            rel="noreferrer noopener"
            className="chip chip-interactive ml-auto"
          >
            ↗ homepage
          </a>
        ) : null}
      </section>

      {/* ── Body grid ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="glass card lit p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Repository activity</h2>
              <Tabs
                size="sm"
                items={[
                  { value: 'commits', label: 'Commit cadence' },
                  { value: 'code', label: 'Code frequency' },
                ]}
                value={tab}
                onChange={setTab}
              />
            </div>

            {tab === 'commits' ? (
              <Bars
                points={activity?.weeks ?? []}
                height={168}
                accent="indigo"
                emptyLabel="GitHub is still computing commit statistics — try again in a minute."
              />
            ) : (
              <CodeFrequency points={activity?.codeFrequency ?? []} height={168} />
            )}

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/6 pt-5">
              <MiniMetric
                label="Additions"
                value={formatCompact(activity?.additions ?? 0)}
                tone="text-energy-mint"
              />
              <MiniMetric
                label="Deletions"
                value={formatCompact(activity?.deletions ?? 0)}
                tone="text-energy-rose"
              />
              <MiniMetric
                label="Net churn"
                value={formatCompact((activity?.additions ?? 0) - (activity?.deletions ?? 0))}
                tone="text-energy-cyan"
              />
            </div>
          </div>

          <div className="glass card lit p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Latest commits</h2>
              <span className="mono text-[10px] text-ink-600">
                default branch · {repository.defaultBranch}
              </span>
            </div>
            <CommitList commits={recentCommits} />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="glass card lit p-5">
            <h2 className="mb-4 text-base font-bold">Language DNA</h2>
            {languages.length > 0 ? (
              <>
                <Donut
                  data={languages.slice(0, 6).map((language) => ({
                    label: language.name,
                    value: language.bytes,
                    color: language.color,
                  }))}
                  size={176}
                  thickness={20}
                  centerLabel="by bytes"
                />
                <LanguageStack languages={languages} className="mt-5" />
              </>
            ) : (
              <p className="text-xs text-ink-600">No language breakdown available.</p>
            )}
          </section>

          <section className="glass card lit p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">Top contributors</h2>
              <span className="mono text-[10px] text-ink-600">share of commits</span>
            </div>
            <ContributorList contributors={contributors} limit={8} />
          </section>

          {repository.topics.length > 0 ? (
            <section className="glass card lit p-5">
              <h2 className="mb-3 text-base font-bold">Topics</h2>
              <div className="flex flex-wrap gap-2">
                {repository.topics.map((topic) => (
                  <TopicChip
                    key={topic}
                    label={topic}
                    onClick={() => navigate(`/explore?type=repos&q=${encodeURIComponent(topic)}`)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-ink-600">{label}</span>
      <span className="mono text-[13px] text-ink-200">{value}</span>
    </span>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[.03] px-3 py-2.5">
      <p className={cn('num text-lg font-bold', tone)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-ink-600">{label}</p>
    </div>
  );
}

function yearsSince(date: string): number {
  const time = Date.parse(date);
  if (!Number.isFinite(time)) return 0;
  return Math.floor((Date.now() - time) / (365 * 86_400_000));
}
