import { Link } from 'react-router-dom';
import { cn, formatCompact, relativeTime } from '@/lib/format';
import type { DevProfile, DevSummary } from '@/lib/types';
import { FavoriteButton } from './FavoriteButton';
import { Avatar } from '@/components/layout/Navbar';

interface DevCardProps {
  dev: DevSummary | DevProfile;
  className?: string;
}

function isProfile(dev: DevSummary | DevProfile): dev is DevProfile {
  return 'followers' in dev;
}

export function DevCard({ dev, className }: DevCardProps) {
  const profile = isProfile(dev) ? dev : null;

  return (
    <article
      className={cn(
        'glass card card-hover lit group relative flex h-full flex-col gap-3 p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          name={dev.login}
          src={dev.avatarUrl}
          size={44}
          className="ring-1 ring-white/10 transition duration-500 group-hover:ring-energy-indigo/60"
        />
        <div className="min-w-0 flex-1">
          <Link
            to={`/dev/${dev.login}`}
            className="block truncate font-display text-[15px] font-bold text-ink-100 transition group-hover:text-energy-cyan"
          >
            {profile?.name ?? dev.login}
          </Link>
          <p className="mono truncate text-[11px] text-ink-500">@{dev.login}</p>
        </div>
        <FavoriteButton
          kind="developer"
          reference={dev.login}
          snapshot={dev}
          className="relative z-10"
        />
      </div>

      <p
        className={cn(
          'text-[13px] leading-relaxed text-ink-400',
          profile?.bio ? 'line-clamp-3' : 'italic text-ink-600',
        )}
      >
        {profile?.bio ??
          (dev.type === 'Organization' ? 'Organization profile' : 'No bio provided.')}
      </p>

      <div className="mt-auto space-y-2.5 border-t border-white/6 pt-3">
        {profile ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="repos" value={profile.publicRepos} />
            <Stat label="followers" value={profile.followers} />
            <Stat label="following" value={profile.following} />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="chip px-2 py-0.5 text-[10px]">{dev.type}</span>
            <Link
              to={`/dev/${dev.login}`}
              className="text-[12px] font-semibold text-energy-cyan transition hover:underline"
            >
              View profile →
            </Link>
          </div>
        )}
        {profile ? (
          <div className="flex items-center justify-between text-[11px] text-ink-500">
            <span className="truncate">{profile.location ?? profile.company ?? '—'}</span>
            <Link
              to={`/dev/${dev.login}`}
              className="font-semibold text-energy-cyan hover:underline"
            >
              Open →
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-lg bg-white/4 px-1 py-1.5">
      <span className="num block text-sm font-bold text-ink-100">{formatCompact(value)}</span>
      <span className="block text-[9px] uppercase tracking-wider text-ink-600">{label}</span>
    </span>
  );
}

/** Compact horizontal row used inside dashboards and comparison sidebars. */
export function DevRow({ dev, action }: { dev: DevSummary; action?: React.ReactNode }) {
  return (
    <Link
      to={`/dev/${dev.login}`}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 transition hover:border-white/8 hover:bg-white/4"
    >
      <Avatar name={dev.login} src={dev.avatarUrl} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-200 group-hover:text-energy-cyan">
          {dev.login}
        </span>
        <span className="mono block truncate text-[10px] text-ink-600">{dev.type}</span>
      </span>
      {action}
    </Link>
  );
}

export function RelativeTime({ value }: { value: string | null | undefined }) {
  return <span className="text-ink-500">{relativeTime(value)}</span>;
}
