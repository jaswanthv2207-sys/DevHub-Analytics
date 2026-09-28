import { useMemo, useState } from 'react';
import { cn, formatCompact } from '@/lib/format';
import type { ActivityPoint } from '@/lib/types';

interface CodeFrequencyProps {
  points: ActivityPoint[];
  height?: number;
  className?: string;
}

/** Diverging bars: additions above the baseline, deletions below. */
export function CodeFrequency({ points, height = 140, className }: CodeFrequencyProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const maxAbs = useMemo(
    () =>
      Math.max(
        ...points.map((point) => Math.max(point.additions ?? 0, Math.abs(point.deletions ?? 0))),
        1,
      ),
    [points],
  );

  const totals = useMemo(
    () =>
      points.reduce(
        (acc, point) => ({
          additions: acc.additions + (point.additions ?? 0),
          deletions: acc.deletions + Math.abs(point.deletions ?? 0),
        }),
        { additions: 0, deletions: 0 },
      ),
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
        No code-frequency data for this repository.
      </div>
    );
  }

  const width = 100; // viewBox units, scaled by SVG
  const svgHeight = 100;
  const baseline = svgHeight / 2;
  const barWidth = width / points.length;

  return (
    <div className={cn('relative', className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-energy-mint">
            <span className="h-2 w-2 rounded-full bg-energy-mint" />+
            {formatCompact(totals.additions)}
          </span>
          <span className="flex items-center gap-1.5 text-energy-rose">
            <span className="h-2 w-2 rounded-full bg-energy-rose" />−
            {formatCompact(totals.deletions)}
          </span>
        </div>
        <span className="mono text-[10px] text-ink-600">
          {points.length} weeks · peak {formatCompact(maxAbs)}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${svgHeight}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHovered(null)}
        role="img"
        aria-label="Weekly additions and deletions"
      >
        <defs>
          <linearGradient id="cf-add" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="rgba(52,211,153,.35)" />
          </linearGradient>
          <linearGradient id="cf-del" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="rgba(251,113,133,.35)" />
          </linearGradient>
        </defs>

        <line
          x1="0"
          y1={baseline}
          x2={width}
          y2={baseline}
          stroke="rgba(255,255,255,.14)"
          strokeWidth="0.4"
        />

        {points.map((point, index) => {
          const additions = (point.additions ?? 0) / maxAbs;
          const deletions = Math.abs(point.deletions ?? 0) / maxAbs;
          const x = index * barWidth;
          const isHovered = hovered === index;
          return (
            <g key={point.date} onMouseEnter={() => setHovered(index)}>
              <rect
                x={x + barWidth * 0.15}
                y={baseline - additions * (baseline - 4)}
                width={barWidth * 0.7}
                height={Math.max(additions * (baseline - 4), 0.5)}
                fill="url(#cf-add)"
                opacity={hovered === null || isHovered ? 1 : 0.4}
              />
              <rect
                x={x + barWidth * 0.15}
                y={baseline}
                width={barWidth * 0.7}
                height={Math.max(deletions * (baseline - 4), 0.5)}
                fill="url(#cf-del)"
                opacity={hovered === null || isHovered ? 1 : 0.4}
              />
              <rect x={x} y={0} width={barWidth} height={svgHeight} fill="transparent" />
            </g>
          );
        })}
      </svg>

      {hovered !== null && points[hovered] ? (
        <div
          className="glass-solid card pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 px-3 py-1.5 text-center"
          style={{ animation: 'fade-in .15s ease both' }}
        >
          <p className="num text-xs font-bold text-energy-mint">
            +{formatCompact(points[hovered]!.additions ?? 0)}
          </p>
          <p className="num text-xs font-bold text-energy-rose">
            −{formatCompact(Math.abs(points[hovered]!.deletions ?? 0))}
          </p>
          <p className="text-[10px] text-ink-500">{points[hovered]!.date}</p>
        </div>
      ) : null}

      <div className="mono mt-1.5 flex justify-between text-[10px] text-ink-600">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}
