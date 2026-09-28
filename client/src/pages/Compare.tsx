import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApiQuery } from '@/lib/hooks';
import type { Comparison, DevCompareSide, RepoCompareSide } from '@/lib/types';
import { PageHeader } from '@/components/layout/AppShell';
import { Avatar } from '@/components/layout/Navbar';
import { Bars, RadarChart } from '@/components/charts';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Tabs';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Chip';
import { cn, formatCompact, formatPercent } from '@/lib/format';

type Mode = 'repos' | 'devs';

const EXAMPLES: Record<Mode, [string, string][]> = {
  repos: [
    ['facebook/react', 'vuejs/core'],
    ['expressjs/express', 'honojs/hono'],
    ['tailwindlabs/tailwindcss', 'primer-css/primer'],
  ],
  devs: [
    ['sindresorhus', 'gaearon'],
    ['tj', 'guillermo'],
    ['kentcdodds', 'dan-abramov'],
  ],
};

export function Compare() {
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('mode') === 'devs' ? 'devs' : 'repos';
  const [a, setA] = useState(params.get('a') ?? '');
  const [b, setB] = useState(params.get('b') ?? '');
  const [submitted, setSubmitted] = useState(Boolean(params.get('a') && params.get('b')));

  useEffect(() => {
    const urlA = params.get('a');
    const urlB = params.get('b');
    if (urlA && urlB) {
      setA(urlA);
      setB(urlB);
      setSubmitted(true);
    }
  }, [params]);

  const ready = submitted && a.trim().length > 0 && b.trim().length > 0;

  const query = useApiQuery<Comparison<RepoCompareSide> | Comparison<DevCompareSide>>(
    ['compare', mode, a.trim(), b.trim()],
    ready
      ? `/compare/${mode === 'repos' ? 'repositories' : 'developers'}?a=${encodeURIComponent(a.trim())}&b=${encodeURIComponent(b.trim())}`
      : null,
    { enabled: ready, staleTime: 300_000, retry: false },
  );

  const syncUrl = (next: { mode?: Mode; a?: string; b?: string }) => {
    const updated = new URLSearchParams(params);
    if (next.mode) updated.set('mode', next.mode);
    if (next.a !== undefined) next.a ? updated.set('a', next.a) : updated.delete('a');
    if (next.b !== undefined) next.b ? updated.set('b', next.b) : updated.delete('b');
    setParams(updated, { replace: true });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    syncUrl({ a: a.trim(), b: b.trim() });
  };

  const swap = () => {
    const previousA = a;
    setA(b);
    setB(previousA);
    if (submitted) syncUrl({ a: b, b: previousA });
  };

  const data = query.data?.data;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="bonus · comparison engine"
        title={
          <>
            Who wins in a <span className="text-gradient">head-to-head</span>?
          </>
        }
        description="Score two repositories or developers across six weighted axes — popularity, community, activity, momentum and codebase size — with a shared radar and a per-metric breakdown."
        actions={
          <Segmented
            items={[
              { value: 'repos', label: 'Repositories', icon: '⛁' },
              { value: 'devs', label: 'Developers', icon: '◍' },
            ]}
            value={mode}
            onChange={(value) => {
              setSubmitted(false);
              setA('');
              setB('');
              syncUrl({ mode: value as Mode, a: '', b: '' });
            }}
          />
        }
      />

      {/* ── Duel form ────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="glass card lit relative overflow-hidden p-5 sm:p-6">
        <div className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr_auto]">
          <Field
            label={mode === 'repos' ? 'First repository' : 'First developer'}
            hint={mode === 'repos' ? 'owner/name' : 'github username'}
          >
            {({ id }) => (
              <Input
                id={id}
                value={a}
                onChange={(event) => setA(event.target.value)}
                placeholder={mode === 'repos' ? 'facebook/react' : 'sindresorhus'}
                className="mono"
              />
            )}
          </Field>

          <div className="hidden pb-2 md:block">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/6 font-display text-xs font-bold text-ink-300">
              VS
            </span>
          </div>

          <Field
            label={mode === 'repos' ? 'Second repository' : 'Second developer'}
            hint={mode === 'repos' ? 'owner/name' : 'github username'}
          >
            {({ id }) => (
              <Input
                id={id}
                value={b}
                onChange={(event) => setB(event.target.value)}
                placeholder={mode === 'repos' ? 'vuejs/core' : 'gaearon'}
                className="mono"
              />
            )}
          </Field>

          <div className="flex gap-2 pb-0.5">
            <Button
              type="button"
              variant="ghost"
              onClick={swap}
              title="Swap sides"
              aria-label="Swap sides"
            >
              ⇄
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={query.isFetching}
              disabled={!a.trim() || !b.trim()}
            >
              Compare
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/6 pt-4">
          <span className="text-[11px] uppercase tracking-wider text-ink-600">Try</span>
          {EXAMPLES[mode].map(([first, second]) => (
            <button
              key={`${first}-${second}`}
              type="button"
              onClick={() => {
                setA(first);
                setB(second);
                setSubmitted(true);
                syncUrl({ a: first, b: second });
              }}
              className="chip chip-interactive mono text-[11px]"
            >
              {first} vs {second}
            </button>
          ))}
        </div>
      </form>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {!ready ? (
        <div className="glass card lit grid place-items-center gap-3 px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-ink-500">
            ⇄
          </span>
          <h2 className="text-lg font-bold">Pick two contenders</h2>
          <p className="max-w-md text-sm leading-relaxed text-ink-500">
            Enter a pair above — DevHub fetches both profiles in parallel, normalises the metrics
            and renders the radar.
          </p>
        </div>
      ) : query.isPending ? (
        <LoadingState label="Crunching both sides…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : data ? (
        <ComparisonResults data={data} mode={mode} />
      ) : null}
    </div>
  );
}

function ComparisonResults({
  data,
  mode,
}: {
  data: Comparison<RepoCompareSide> | Comparison<DevCompareSide>;
  mode: Mode;
}) {
  const { verdict, metrics, radar } = data;
  const asRepos = data as Comparison<RepoCompareSide>;
  const asDevs = data as Comparison<DevCompareSide>;
  const nameA = mode === 'repos' ? asRepos.a.repository.fullName : asDevs.a.profile.login;
  const nameB = mode === 'repos' ? asRepos.b.repository.fullName : asDevs.b.profile.login;
  const labelA = mode === 'repos' ? 'repository A' : 'developer A';

  return (
    <div className="space-y-6" style={{ animation: 'rise .5s cubic-bezier(.2,.8,.2,1) both' }}>
      {/* verdict */}
      <section className="glass card lit relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(129,140,248,.2),transparent_60%)]" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <p className="eyebrow mb-2">verdict</p>
            <h2 className="text-2xl font-bold leading-snug">{verdict.headline}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="cyan">{labelA}</Badge>
              <Badge tone={verdict.winner === 'b' ? 'pink' : 'neutral'}>{nameB}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            <ScoreBar
              label={nameA}
              score={verdict.scoreA}
              tone="cyan"
              highlight={verdict.winner === 'a'}
            />
            <ScoreBar
              label={nameB}
              score={verdict.scoreB}
              tone="pink"
              highlight={verdict.winner === 'b'}
            />
            <p className="mono text-[11px] text-ink-600">
              composite = mean of {radar.length} normalised axes · 0–100
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* radar */}
        <section className="glass card lit p-5 sm:p-6">
          <h3 className="mb-4 text-lg font-bold">Axis breakdown</h3>
          <RadarChart axes={radar} labelA={nameA} labelB={nameB} size={330} />
        </section>

        {/* metrics */}
        <section className="glass card lit p-5 sm:p-6">
          <h3 className="mb-4 text-lg font-bold">Metric by metric</h3>
          <ul className="space-y-1">
            {metrics.map((metric) => (
              <li
                key={metric.key}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white/4"
              >
                <span
                  className={cn(
                    'num text-right text-sm font-bold',
                    metric.winner === 'a' ? 'text-energy-cyan' : 'text-ink-400',
                  )}
                >
                  {metric.displayA}
                </span>
                <span className="w-36 text-center text-[11px] uppercase tracking-wider text-ink-600">
                  {metric.label}
                </span>
                <span
                  className={cn(
                    'num text-left text-sm font-bold',
                    metric.winner === 'b' ? 'text-energy-pink' : 'text-ink-400',
                  )}
                >
                  {metric.displayB}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* side cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {mode === 'repos' ? (
          <>
            <RepoSide repo={asRepos.a} name={nameA} tone="cyan" />
            <RepoSide repo={asRepos.b} name={nameB} tone="pink" />
          </>
        ) : (
          <>
            <DevSide dev={asDevs.a} name={nameA} tone="cyan" />
            <DevSide dev={asDevs.b} name={nameB} tone="pink" />
          </>
        )}
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  score,
  tone,
  highlight,
}: {
  label: string;
  score: number;
  tone: 'cyan' | 'pink';
  highlight: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span
          className={cn('mono truncate text-[12px]', highlight ? 'text-ink-100' : 'text-ink-500')}
        >
          {label}
        </span>
        <span
          className={cn(
            'num text-lg font-bold',
            tone === 'cyan' ? 'text-energy-cyan' : 'text-energy-pink',
          )}
        >
          {score}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700',
            tone === 'cyan'
              ? 'bg-gradient-to-r from-energy-cyan to-energy-indigo'
              : 'bg-gradient-to-r from-energy-pink to-energy-amber',
          )}
          style={{ width: `${Math.max(score, 2)}%` }}
        />
      </div>
    </div>
  );
}

function RepoSide({
  repo,
  name,
  tone,
}: {
  repo: RepoCompareSide;
  name: string;
  tone: 'cyan' | 'pink';
}) {
  return (
    <section className="glass card lit space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Avatar
          name={repo.repository.owner.login}
          src={repo.repository.owner.avatarUrl}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <Link
            to={`/repo/${repo.repository.fullName}`}
            className="block truncate font-display font-bold hover:text-energy-cyan"
          >
            {name}
          </Link>
          <p className="mono text-[11px] text-ink-600">
            {repo.repository.license ?? 'no license'} · pushed{' '}
            {repo.repository.pushedAt ? new Date(repo.repository.pushedAt).getFullYear() : '—'}
          </p>
        </div>
        <Badge tone={tone}>{repo.score}/100</Badge>
      </div>

      <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-400">
        {repo.repository.description ?? 'No description.'}
      </p>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Cell label="stars" value={formatCompact(repo.repository.stars)} />
        <Cell label="forks" value={formatCompact(repo.repository.forks)} />
        <Cell label="issues" value={formatCompact(repo.repository.openIssues)} />
        <Cell label="prs" value={formatCompact(repo.repository.openPullRequests ?? 0)} />
      </div>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-wider text-ink-600">commits / 52 weeks</p>
        <Bars
          points={repo.activity?.weeks ?? []}
          height={86}
          accent={tone === 'cyan' ? 'cyan' : 'pink'}
        />
      </div>

      {repo.languages.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-ink-600">languages</p>
          <div className="flex h-2.5 overflow-hidden rounded-full">
            {repo.languages.slice(0, 6).map((language) => (
              <span
                key={language.name}
                title={`${language.name} ${formatPercent(language.percentage, 1)}`}
                style={{
                  width: `${Math.max(language.percentage, 2)}%`,
                  backgroundColor: language.color,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DevSide({
  dev,
  name,
  tone,
}: {
  dev: DevCompareSide;
  name: string;
  tone: 'cyan' | 'pink';
}) {
  return (
    <section className="glass card lit space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Avatar
          name={dev.profile.login}
          src={dev.profile.avatarUrl}
          size={52}
          className={cn('ring-2', tone === 'cyan' ? 'ring-energy-cyan/60' : 'ring-energy-pink/60')}
        />
        <div className="min-w-0 flex-1">
          <Link
            to={`/dev/${dev.profile.login}`}
            className="block truncate font-display font-bold hover:text-energy-cyan"
          >
            {dev.profile.name ?? name}
          </Link>
          <p className="mono text-[11px] text-ink-600">
            @{dev.profile.login} · {dev.primaryLanguage ?? '—'}
          </p>
        </div>
        <Badge tone={tone}>{dev.score}/100</Badge>
      </div>

      <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-400">
        {dev.profile.bio ?? 'No bio provided.'}
      </p>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Cell label="followers" value={formatCompact(dev.followers)} />
        <Cell label="stars" value={formatCompact(dev.totalStars)} />
        <Cell label="repos" value={formatCompact(dev.repoCount)} />
        <Cell label="contrib." value={formatCompact(dev.contributions)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-ink-600">top repository</p>
          <p className="mono truncate text-[13px] text-ink-300">{dev.topRepo ?? '—'}</p>
        </div>
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-ink-600">active days</p>
          <p className="num text-[15px] font-bold text-ink-100">
            {dev.activeDays}
            <span className="text-xs font-normal text-ink-600"> / 365</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[.03] px-2 py-2">
      <p className="num text-base font-bold text-ink-100">{value}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wider text-ink-600">{label}</p>
    </div>
  );
}
