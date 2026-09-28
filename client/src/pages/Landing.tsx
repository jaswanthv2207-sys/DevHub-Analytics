import { Link } from 'react-router-dom';
import { useApiQuery } from '@/lib/hooks';
import type { Paged, RepoSummary } from '@/lib/types';
import { Avatar } from '@/components/layout/Navbar';
import { RepoCard } from '@/components/github/RepoCard';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Reveal } from '@/components/layout/AppShell';
import { Bars, Donut, Heatmap, RadarChart } from '@/components/charts';
import { formatCompact } from '@/lib/format';
import type { HeatmapDay } from '@/lib/types';

const ORBIT_A = ['torvalds', 'gaearon', 'kentcdodds'];
const ORBIT_B = ['sindresorhus', 'yyx990803', 'addyosmani'];

const LANGUAGE_MIX = [
  { label: 'TypeScript', value: 34, color: '#3178c6' },
  { label: 'Python', value: 24, color: '#3572A5' },
  { label: 'Rust', value: 16, color: '#dea584' },
  { label: 'Go', value: 14, color: '#00ADD8' },
  { label: 'Other', value: 12, color: '#818cf8' },
];

const SAMPLE_WEEKS = Array.from({ length: 26 }, (_, index) => ({
  date: `week ${index}`,
  value: Math.round(18 + Math.sin(index / 2.4) * 12 + (index % 5) * 3),
}));

const SAMPLE_HEATMAP: HeatmapDay[] = Array.from({ length: 189 }, (_, index) => {
  const count = (index * 7) % 11 === 0 ? 0 : Math.abs(Math.round(Math.sin(index / 5) * 7));
  return {
    date: new Date(Date.now() - (188 - index) * 86_400_000).toISOString().slice(0, 10),
    count,
    level: (count === 0 ? 0 : count < 3 ? 1 : count < 5 ? 2 : count < 7 ? 3 : 4) as
      0 | 1 | 2 | 3 | 4,
  };
});

const FEATURES = [
  {
    icon: '⌕',
    title: 'Developer search',
    text: 'Fuzzy search across 400M+ GitHub accounts with instant profile deep-dives.',
    tone: 'text-energy-cyan',
  },
  {
    icon: '★',
    title: 'Repository intelligence',
    text: 'Stars, forks, open issues, pull requests, license and topics in one card.',
    tone: 'text-energy-amber',
  },
  {
    icon: '◍',
    title: 'Language DNA',
    text: 'Byte-weighted language distribution for any repo or developer portfolio.',
    tone: 'text-energy-indigo',
  },
  {
    icon: '⚡',
    title: 'Activity pulse',
    text: '52-week commit cadence, code frequency and contribution calendars.',
    tone: 'text-energy-mint',
  },
  {
    icon: '⇄',
    title: 'Head-to-head compare',
    text: 'Radar-score two repositories or developers across six weighted axes.',
    tone: 'text-energy-pink',
  },
  {
    icon: '⛃',
    title: 'Smart caching',
    text: 'ETag revalidation + stale-on-limit fallback keeps the app alive at 0 quota.',
    tone: 'text-energy-lime',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Search the graph',
    text: 'Type a developer or repository into Explore — results stream in from the GitHub Search API.',
  },
  {
    number: '02',
    title: 'Read the signal',
    text: 'Profile pages unpack stars, languages, commit cadence and contribution history into charts.',
  },
  {
    number: '03',
    title: 'Save your orbit',
    text: 'Star what matters. Collections persist in SQLite and resurface on your dashboard.',
  },
];

const MARQUEE = [
  'TypeScript',
  'React',
  'Node.js',
  'Rust',
  'Go',
  'Python',
  'Kotlin',
  'Swift',
  'Docker',
  'PostgreSQL',
  'GraphQL',
  'Kubernetes',
  'Vite',
  'Tailwind',
  'Deno',
  'Bun',
  'Elixir',
  'Zig',
];

export function Landing() {
  const trending = useApiQuery<Paged<RepoSummary>>(
    ['trending', 'weekly'],
    '/github/trending?period=weekly',
  );

  return (
    <div className="space-y-24 pb-8">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative grid items-center gap-12 pt-6 lg:grid-cols-[1.05fr_.95fr] lg:pt-10">
        <div className="relative z-10">
          <Reveal>
            <span className="chip mb-5 border-energy-cyan/30 bg-energy-cyan/10 px-3 py-1 text-energy-cyan">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-energy-cyan" />
              github analytics, reimagined
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Explore the GitHub
              <br />
              universe in <span className="text-gradient">high definition</span>.
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-400">
              DevHub turns raw GitHub data into decisions — search developers and repositories,
              decode stars, forks, languages and contribution activity, then keep the best of it in
              your own collections.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn btn-primary px-6 py-3.5 text-[15px]">
                Start exploring <span aria-hidden>→</span>
              </Link>
              <Link to="/explore" className="btn btn-ghost px-6 py-3.5 text-[15px]">
                Browse the graph
              </Link>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <dl className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-white/8">
              {[
                { value: '400M+', label: 'developer profiles' },
                { value: '300M+', label: 'repositories indexed' },
                { value: '<200ms', label: 'cached responses' },
              ].map((item) => (
                <div key={item.label} className="px-3 first:pl-0">
                  <dt className="num text-xl font-bold text-ink-100 sm:text-2xl">{item.value}</dt>
                  <dd className="mt-1 text-[11px] leading-tight text-ink-500">{item.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* Orbit visual */}
        <Reveal delay={200} className="relative mx-auto w-full max-w-lg">
          <div className="relative aspect-square">
            <div className="absolute inset-[6%] rounded-full border border-white/10" />
            <div className="absolute inset-[19%] rounded-full border border-dashed border-white/10" />
            <div className="absolute inset-[33%] rounded-full border border-white/8" />
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,.28),transparent_62%)] blur-2xl" />

            {/* ring A — avatars orbiting clockwise */}
            <div className="absolute inset-[6%] animate-spin-slow">
              {ORBIT_A.map((login, index) => (
                <div
                  key={login}
                  className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${index * 120}deg) translateY(-100%) rotate(${-index * 120}deg)`,
                  }}
                >
                  <div className="animate-spin-slower" style={{ animationDirection: 'reverse' }}>
                    <Avatar
                      name={login}
                      src={`https://github.com/${login}.png?size=96`}
                      size={46}
                      className="ring-2 ring-energy-cyan/50 shadow-[0_0_24px_-6px_rgba(34,211,238,.9)]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ring B — counter-rotating */}
            <div
              className="absolute inset-[33%]"
              style={{ animation: 'spin 34s linear infinite reverse' }}
            >
              {ORBIT_B.map((login, index) => (
                <div
                  key={login}
                  className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${index * 120}deg) translateY(-100%) rotate(${-index * 120}deg)`,
                  }}
                >
                  <div className="animate-spin-slow" style={{ animationDirection: 'reverse' }}>
                    <Avatar
                      name={login}
                      src={`https://github.com/${login}.png?size=96`}
                      size={40}
                      className="ring-2 ring-energy-pink/50 shadow-[0_0_24px_-6px_rgba(244,114,182,.9)]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* core */}
            <div className="absolute left-1/2 top-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-void-900/80 shadow-[0_0_70px_-10px_rgba(129,140,248,.9)] backdrop-blur">
              <span className="text-gradient font-display text-[11px] font-bold uppercase tracking-[0.18em]">
                DevHub
              </span>
            </div>

            {/* floating stat chips */}
            <div
              className="glass card absolute -left-2 top-[16%] px-3 py-2"
              style={{ animation: 'float 8s ease-in-out infinite' }}
            >
              <p className="mono text-[10px] text-ink-500">stars / repo</p>
              <p className="num text-base font-bold text-energy-amber">251k</p>
            </div>
            <div
              className="glass card absolute -right-3 bottom-[20%] px-3 py-2"
              style={{ animation: 'float 10s ease-in-out infinite reverse' }}
            >
              <p className="mono text-[10px] text-ink-500">contributors</p>
              <p className="num text-base font-bold text-energy-cyan">1,600+</p>
            </div>
            <div
              className="glass card absolute bottom-[8%] left-[18%] px-3 py-2"
              style={{ animation: 'float-slow 12s ease-in-out infinite' }}
            >
              <p className="mono text-[10px] text-ink-500">cache hit rate</p>
              <p className="num text-base font-bold text-energy-mint">92%</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Language marquee ─────────────────────────────────────────────── */}
      <section
        aria-hidden
        className="relative -mx-4 overflow-hidden border-y border-white/6 py-4 sm:-mx-6 lg:-mx-8"
      >
        <div className="flex w-max animate-marquee gap-10">
          {[...MARQUEE, ...MARQUEE].map((language, index) => (
            <span
              key={`${language}-${index}`}
              className="mono flex items-center gap-3 text-sm text-ink-600 transition-colors hover:text-ink-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-energy-indigo/70" />
              {language}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-void-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-void-950 to-transparent" />
      </section>

      {/* ── Feature bento ────────────────────────────────────────────────── */}
      <section className="space-y-8">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">the toolkit</p>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Everything the GitHub UI doesn&apos;t{' '}
              <span className="text-gradient">connect for you</span>.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-400">
              Six surfaces, one consistent design language — built on a REST API you can inspect,
              cache and extend.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-6">
          {/* feature cards */}
          <Reveal className="md:col-span-2" delay={40}>
            <BentoCard {...FEATURES[0]!}>
              <MiniSearch />
            </BentoCard>
          </Reveal>
          <Reveal className="md:col-span-2" delay={100}>
            <BentoCard {...FEATURES[1]!}>
              <MiniStats />
            </BentoCard>
          </Reveal>
          <Reveal className="md:col-span-2" delay={160}>
            <BentoCard {...FEATURES[2]!}>
              <Donut data={LANGUAGE_MIX} size={150} thickness={18} className="[&_ul]:hidden" />
            </BentoCard>
          </Reveal>
          <Reveal className="md:col-span-3" delay={60}>
            <BentoCard {...FEATURES[3]!}>
              <Bars points={SAMPLE_WEEKS} height={96} accent="mint" />
            </BentoCard>
          </Reveal>
          <Reveal className="md:col-span-3" delay={120}>
            <BentoCard {...FEATURES[4]!}>
              <MiniRadar />
            </BentoCard>
          </Reveal>
          <Reveal className="md:col-span-4" delay={80}>
            <BentoCard {...FEATURES[5]!}>
              <Heatmap heatmap={{ total: 4213, days: SAMPLE_HEATMAP, source: 'events' }} />
            </BentoCard>
          </Reveal>
          <Reveal className="md:col-span-2" delay={140}>
            <div className="glass card lit flex h-full flex-col justify-between gap-4 border-energy-mint/20 p-6">
              <div>
                <span className="text-energy-mint text-xl">⛃</span>
                <h3 className="mt-3 text-lg font-bold">Zero-downtime data</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                  When GitHub throttles, DevHub serves the last known good payload with a visible
                  “stale” badge instead of an error wall.
                </p>
              </div>
              <div className="mono space-y-1.5 rounded-xl border border-white/8 bg-black/30 p-3 text-[11px]">
                <p className="text-energy-mint">GET /api/github/repos/facebook/react</p>
                <p className="text-ink-500">x-devhub-cache: HIT · age 42s</p>
                <p className="text-energy-amber">x-ratelimit-remaining: 8 / 5000</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Live trending ────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3">live from github</p>
              <h2 className="text-3xl font-bold sm:text-4xl">Trending repositories this week</h2>
            </div>
            <Link to="/explore?type=repos" className="btn btn-ghost">
              Explore more →
            </Link>
          </div>
        </Reveal>

        {trending.isPending ? (
          <GridSkeleton count={3} />
        ) : trending.isError ? (
          <ErrorState error={trending.error} onRetry={() => void trending.refetch()} />
        ) : (
          <div className="stagger grid gap-4 md:grid-cols-3">
            {(trending.data?.data.items ?? []).slice(0, 3).map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </section>

      {/* ── Steps ────────────────────────────────────────────────────────── */}
      <section className="space-y-8">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">how it works</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Three moves from signal to insight.</h2>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.number} delay={index * 90}>
              <div className="glass card lit relative h-full overflow-hidden p-6">
                <span className="num absolute -right-3 -top-4 text-6xl font-bold text-white/5">
                  {step.number}
                </span>
                <p className="eyebrow mb-2">step {step.number}</p>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <Reveal>
        <section className="glass card lit relative overflow-hidden px-6 py-12 text-center sm:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,.16),transparent_65%)]" />
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-energy-cyan/70 to-transparent" />
          <div className="relative">
            <p className="eyebrow mb-3">free forever</p>
            <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
              Build your orbit around the repositories and developers that matter.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-400">
              Create an account to unlock collections, the dashboard and comparison workspaces.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn btn-primary px-6 py-3.5 text-[15px]">
                Create free account
              </Link>
              <Link to="/login" className="btn btn-ghost px-6 py-3.5 text-[15px]">
                I already have one
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

/* ── Bento helpers ───────────────────────────────────────────────────────── */

function BentoCard({
  icon,
  title,
  text,
  tone,
  children,
}: {
  icon: string;
  title: string;
  text: string;
  tone: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass card card-hover lit flex h-full flex-col gap-4 p-6">
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg ${tone}`}
        >
          {icon}
        </span>
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{text}</p>
        </div>
      </div>
      {children ? <div className="mt-auto">{children}</div> : null}
    </div>
  );
}

function MiniSearch() {
  const samples = [
    { name: 'sindresorhus', meta: '84k followers' },
    { name: 'vuejs/core', meta: '54k stars' },
    { name: 'rust-lang/rust', meta: '101k stars' },
  ];
  return (
    <div className="space-y-2">
      <div className="mono flex items-center gap-2 rounded-lg border border-energy-cyan/30 bg-energy-cyan/8 px-3 py-2 text-[12px] text-energy-cyan">
        <span>⌕</span>
        <span className="animate-pulse">query: “state management”</span>
      </div>
      {samples.map((sample) => (
        <div
          key={sample.name}
          className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[.03] px-3 py-1.5 text-[12px]"
        >
          <span className="mono text-ink-300">{sample.name}</span>
          <span className="mono text-ink-600">{sample.meta}</span>
        </div>
      ))}
    </div>
  );
}

function MiniStats() {
  const stats = [
    { label: 'stars', value: 251000, tone: 'text-energy-amber' },
    { label: 'forks', value: 51000, tone: 'text-energy-cyan' },
    { label: 'open prs', value: 366, tone: 'text-energy-indigo' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-white/8 bg-white/[.03] p-3 text-center"
        >
          <p className={`num text-lg font-bold ${stat.tone}`}>{formatCompact(stat.value)}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-600">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function MiniRadar() {
  return (
    <RadarChart
      labelA="express"
      labelB="fastify"
      size={230}
      axes={[
        { key: 'popularity', label: 'Popularity', a: 88, b: 62 },
        { key: 'community', label: 'Community', a: 74, b: 58 },
        { key: 'activity', label: 'Activity', a: 66, b: 81 },
        { key: 'momentum', label: 'Momentum', a: 52, b: 86 },
        { key: 'codebase', label: 'Codebase', a: 79, b: 44 },
      ]}
    />
  );
}
