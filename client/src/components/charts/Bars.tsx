import { useMemo, useState } from 'react';
import { cn, formatCompact, relativeTime } from '@/lib/format';
import type { ActivityPoint } from '@/lib/types';

interface BarsProps {
  points: ActivityPoint[];
  height?: number;
  className?: string;
  accent?: 'cyan' | 'indigo' | 'pink' | 'mint';
  emptyLabel?: string;
}

const ACCENTS = {
  cyan: ['rgba(34,211,238,.35)', '#22d3ee'],
  indigo: ['rgba(129,140,248,.35)', '#818cf8'],
  pink: ['rgba(244,114,182,.35)', '#f472b6'],
  mint: ['rgba(52,211,153,.35)', '#34d399'],
} as const;

/** Weekly commit-activity column chart with hover tooltips. */
export function Bars({
  points,
  height = 132,
  className,
  accent = 'indigo',
  emptyLabel = 'No activity recorded yet.',
}: BarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = useMemo(() => Math.max(...points.map((point) => point.value), 1), [points]);
  const average = useMemo(
    () => (points.length ? points.reduce((sum, point) => sum + point.value, 0) / points.length : 0),
    [points],
  );

  if (points.length === 0) {
    return (
      <div
        className={cn(
          'grid place-items-center rounded-xl border border-dashed border-white/10 text-xs text-ink-600',
          className,
        )}
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  const [from, to] = ACCENTS[accent];
  const hoveredPoint = hovered !== null ? points[hovered] : null;

  return (
    <div className={cn('relative', className)}>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs text-ink-500">
          <span className="num font-semibold text-ink-200">
            {formatCompact(points.reduce((s, p) => s + p.value, 0))}
          </span>{' '}
          total · avg {average.toFixed(1)}/week
        </p>
        <p className="mono text-[11px] text-ink-600">peak {formatCompact(max)}</p>
      </div>

      <div
        className="relative flex items-end gap-[3px] rounded-xl border border-white/8 bg-white/[.02] p-2"
        style={{ height }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* average reference line */}
        <div
          className="pointer-events-none absolute inset-x-2 border-t border-dashed border-energy-amber/35"
          style={{ bottom: `${(average / max) * 100 * 0.86 + 6}%` }}
        />
        {points.map((point, index) => {
          const ratio = Math.max(point.value / max, point.value > 0 ? 0.04 : 0);
          return (
            <button
              key={`${point.date}-${index}`}
              type="button"
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              aria-label={`${point.date}: ${point.value} commits`}
              className="group relative flex-1 self-end rounded-t-[3px] transition-[height,filter] duration-500"
              style={{
                height: `${ratio * 88}%`,
                minHeight: point.value > 0 ? 3 : 1,
                background:
                  point.value > 0
                    ? `linear-gradient(180deg, ${to}, ${from})`
                    : 'rgba(255,255,255,.06)',
                filter:
                  hovered === null || hovered === index ? 'none' : 'grayscale(.7) brightness(.7)',
                animation: 'bar-grow .6s cubic-bezier(.2,.8,.2,1) both',
                animationDelay: `${Math.min(index * 6, 500)}ms`,
                transformOrigin: 'bottom',
              }}
            />
          );
        })}

        {hoveredPoint ? (
          <div
            className="glass-solid card pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 px-3 py-1.5 text-center"
            style={{ animation: 'fade-in .15s ease both' }}
          >
            <p className="num text-sm font-bold text-ink-100">
              {formatCompact(hoveredPoint.value)}
            </p>
            <p className="text-[10px] text-ink-500">{relativeTime(hoveredPoint.date)}</p>
          </div>
        ) : null}
      </div>

      <div className="mono mt-1.5 flex justify-between text-[10px] text-ink-600">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}
