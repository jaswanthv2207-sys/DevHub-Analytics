import { cn, countdown, secondsUntil } from '@/lib/format';
import type { ResponseMeta } from '@/lib/types';

const SOURCE_LABEL: Record<string, { label: string; tone: string }> = {
  network: { label: 'live', tone: 'text-energy-mint border-energy-mint/30 bg-energy-mint/10' },
  cache: { label: 'cached', tone: 'text-energy-cyan border-energy-cyan/30 bg-energy-cyan/10' },
  revalidated: {
    label: 'revalidated',
    tone: 'text-energy-indigo border-energy-indigo/30 bg-energy-indigo/10',
  },
  stale: {
    label: 'serving stale',
    tone: 'text-energy-amber border-energy-amber/35 bg-energy-amber/10',
  },
};

const LIVE_SOURCE = SOURCE_LABEL['network'] ?? {
  label: 'live',
  tone: 'text-energy-mint border-energy-mint/30 bg-energy-mint/10',
};

/**
 * Tiny provenance chip — shows whether the payload came from GitHub right now
 * or from DevHub's cache (and how old it is).
 */
export function CacheBadge({ meta, className }: { meta?: ResponseMeta; className?: string }) {
  if (!meta) return null;
  const source = SOURCE_LABEL[meta.source] ?? LIVE_SOURCE;
  const age = meta.ageSeconds ?? 0;
  const ageLabel =
    age < 60
      ? `${age}s ago`
      : age < 3600
        ? `${Math.round(age / 60)}m ago`
        : `${Math.round(age / 3600)}h ago`;

  return (
    <span
      className={cn(
        'mono inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]',
        source.tone,
        className,
      )}
      title={
        meta.cachedAt
          ? `Payload ${meta.source} · fetched ${new Date(meta.cachedAt).toLocaleString()}`
          : 'Payload fetched live from GitHub'
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {source.label}
      {meta.source !== 'network' ? ` · ${ageLabel}` : ''}
    </span>
  );
}

/** Compact "budget" meter for the repository/developer pages. */
export function RateBadge({
  remaining,
  limit,
  resetAt,
}: {
  remaining: number | null;
  limit: number | null;
  resetAt: string | null;
}) {
  if (remaining === null || limit === null) return null;
  const percent = Math.max(0, Math.min(100, (remaining / (limit || 1)) * 100));
  const tone =
    percent > 40 ? 'text-energy-mint' : percent > 15 ? 'text-energy-amber' : 'text-energy-rose';

  return (
    <span
      className={cn('mono inline-flex items-center gap-2 text-[10px]', tone)}
      title={`Resets in ${countdown(secondsUntil(resetAt))}`}
    >
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-current transition-[width] duration-700"
          style={{ width: `${percent}%` }}
        />
      </span>
      {remaining}/{limit}
    </span>
  );
}
