import { cn, formatCompact, formatPercent, relativeTime } from '@/lib/format';
import type { ActivityEvent, Contributor, LanguageStat, RecentCommit } from '@/lib/types';
import { Avatar } from '@/components/layout/Navbar';
import { useState } from 'react';

/* ── Stacked language bar ────────────────────────────────────────────────── */

export function LanguageStack({
  languages,
  className,
}: {
  languages: LanguageStat[];
  className?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (languages.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/8 bg-white/4">
        {languages.map((language, index) => (
          <span
            key={language.name}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            title={`${language.name} — ${formatPercent(language.percentage, 1)}`}
            className="h-full transition-[filter,transform] duration-300"
            style={{
              width: `${Math.max(language.percentage, 1.2)}%`,
              backgroundColor: language.color,
              opacity: hovered === null || hovered === index ? 1 : 0.35,
              filter: hovered === index ? 'brightness(1.35)' : undefined,
              boxShadow: hovered === index ? `0 0 14px ${language.color}` : undefined,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {languages.slice(0, 6).map((language, index) => (
          <span
            key={language.name}
            className={cn(
              'flex items-center gap-1.5 text-[11px] transition',
              hovered === index ? 'text-ink-100' : 'text-ink-500',
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: language.color }} />
            {language.name}
            <span className="mono text-ink-600">{formatPercent(language.percentage, 0)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Contributors ────────────────────────────────────────────────────────── */

export function ContributorList({
  contributors,
  limit = 8,
  className,
}: {
  contributors: Contributor[];
  limit?: number;
  className?: string;
}) {
  const shown = contributors.slice(0, limit);
  const total = contributors.reduce((sum, contributor) => sum + contributor.contributions, 0) || 1;

  if (shown.length === 0) {
    return (
      <p
        className={cn(
          'rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-ink-600',
          className,
        )}
      >
        Contributor data is unavailable for this repository.
      </p>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/6">
        {shown.map((contributor, index) => (
          <span
            key={contributor.login}
            title={`${contributor.login} — ${formatCompact(contributor.contributions)}`}
            className="h-full transition-opacity hover:opacity-100"
            style={{
              width: `${(contributor.contributions / total) * 100}%`,
              backgroundColor: `hsl(${(index * 47 + 186) % 360} 75% 62%)`,
              opacity: 0.85,
            }}
          />
        ))}
      </div>

      <ul className="space-y-1.5">
        {shown.map((contributor, index) => {
          const share = (contributor.contributions / total) * 100;
          return (
            <li key={contributor.login}>
              <a
                href={contributor.htmlUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/5"
              >
                <span className="mono w-4 text-[11px] text-ink-600">{index + 1}</span>
                <Avatar name={contributor.login} src={contributor.avatarUrl} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink-200 group-hover:text-energy-cyan">
                    {contributor.login}
                  </span>
                  <span className="mono block text-[10px] text-ink-600">
                    {formatCompact(contributor.contributions)} commits · {share.toFixed(1)}%
                  </span>
                </span>
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/8" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-energy-cyan to-energy-indigo"
                    style={{ width: `${share}%` }}
                  />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      {contributors.length > limit ? (
        <p className="mono text-center text-[10px] text-ink-600">
          +{contributors.length - limit} more contributors tracked
        </p>
      ) : null}
    </div>
  );
}

/* ── Activity feed ───────────────────────────────────────────────────────── */

const EVENT_ICON: Record<string, string> = {
  Push: '⑂',
  Create: '✚',
  Delete: '✕',
  Issues: '◇',
  IssueComment: '💬',
  PullRequest: '⤳',
  PullRequestReview: '✓',
  Fork: '⑃',
  Watch: '★',
  Release: '🏷',
  Public: '🌐',
  Member: '👤',
  Gollum: '📄',
  CommitComment: '✍',
};

export function EventFeed({ events, className }: { events: ActivityEvent[]; className?: string }) {
  if (events.length === 0) {
    return (
      <p
        className={cn(
          'rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-ink-600',
          className,
        )}
      >
        No recent public activity to show.
      </p>
    );
  }

  return (
    <ul className={cn('relative space-y-1', className)}>
      <span
        className="absolute bottom-3 left-[17px] top-3 w-px bg-gradient-to-b from-energy-indigo/50 via-white/10 to-transparent"
        aria-hidden
      />
      {events.map((event, index) => (
        <li key={`${event.repo}-${index}`} className="relative flex gap-3 px-1 py-2">
          <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-void-850 text-xs text-energy-cyan">
            {EVENT_ICON[event.type] ?? '•'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug text-ink-400">
              {event.action}{' '}
              <a
                href={event.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mono font-semibold text-ink-100 transition hover:text-energy-cyan"
              >
                {event.repo}
              </a>
            </p>
            <p className="mono text-[10px] text-ink-600">{relativeTime(event.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── Recent commits ──────────────────────────────────────────────────────── */

export function CommitList({
  commits,
  className,
}: {
  commits: RecentCommit[];
  className?: string;
}) {
  if (commits.length === 0) {
    return (
      <p
        className={cn(
          'rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-ink-600',
          className,
        )}
      >
        No commits are visible for this repository.
      </p>
    );
  }

  return (
    <ul className={cn('space-y-1.5', className)}>
      {commits.map((commit) => (
        <li key={commit.sha}>
          <a
            href={commit.htmlUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex items-start gap-3 rounded-xl border border-transparent px-2.5 py-2 transition hover:border-white/8 hover:bg-white/4"
          >
            <span className="mono mt-0.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-energy-cyan">
              {commit.sha}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink-200 group-hover:text-energy-cyan">
                {commit.message || 'Untitled commit'}
              </span>
              <span className="mono block text-[10px] text-ink-600">
                {commit.author ?? 'unknown'} · {relativeTime(commit.authorDate)}
              </span>
            </span>
            {commit.verified ? (
              <span className="chip mt-0.5 border-energy-mint/30 bg-energy-mint/10 px-1.5 py-0.5 text-[9px] text-energy-mint">
                verified
              </span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
