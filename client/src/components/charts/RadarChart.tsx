import { useMemo, useState } from 'react';
import { cn } from '@/lib/format';
import type { RadarAxis } from '@/lib/types';

interface RadarChartProps {
  axes: RadarAxis[];
  labelA: string;
  labelB: string;
  size?: number;
  className?: string;
}

/**
 * Comparison radar — two overlapping polygons on a pentagon/hexagon grid.
 * Used by both bonus features: repo vs repo and dev vs dev.
 */
export function RadarChart({ axes, labelA, labelB, size = 340, className }: RadarChartProps) {
  const [hover, setHover] = useState<string | null>(null);
  const center = size / 2;
  const radius = size / 2 - 58;
  const count = Math.max(axes.length, 3);

  const pointAt = (index: number, fraction: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius * fraction,
      y: center + Math.sin(angle) * radius * fraction,
    };
  };

  const polygonFor = (side: 'a' | 'b') =>
    axes
      .map((axis, index) => {
        const { x, y } = pointAt(index, Math.max(axis[side], 2) / 100);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

  const rings = [0.25, 0.5, 0.75, 1];

  const labelPositions = useMemo(
    () =>
      axes.map((axis, index) => {
        const { x, y } = pointAt(index, 1.24);
        return { ...axis, x, y };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [axes, size],
  );

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <svg
        width="100%"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${labelA} vs ${labelB} comparison`}
      >
        <defs>
          <linearGradient id="radar-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(34,211,238,.55)" />
            <stop offset="100%" stopColor="rgba(129,140,248,.35)" />
          </linearGradient>
          <linearGradient id="radar-b" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(244,114,182,.5)" />
            <stop offset="100%" stopColor="rgba(251,191,36,.3)" />
          </linearGradient>
        </defs>

        {/* grid rings */}
        {rings.map((fraction) => (
          <polygon
            key={fraction}
            points={axes
              .map((_, index) => {
                const { x, y } = pointAt(index, fraction);
                return `${x.toFixed(2)},${y.toFixed(2)}`;
              })
              .join(' ')}
            fill="none"
            stroke="rgba(255,255,255,.09)"
            strokeWidth={fraction === 1 ? 1.2 : 1}
            strokeDasharray={fraction === 1 ? undefined : '3 4'}
          />
        ))}

        {/* spokes + labels */}
        {labelPositions.map((axis) => (
          <g key={axis.key}>
            <line
              x1={center}
              y1={center}
              x2={pointAt(labelPositions.indexOf(axis), 1).x}
              y2={pointAt(labelPositions.indexOf(axis), 1).y}
              stroke="rgba(255,255,255,.08)"
            />
            <text
              x={axis.x}
              y={axis.y}
              textAnchor={axis.x > center + 6 ? 'start' : axis.x < center - 6 ? 'end' : 'middle'}
              dominantBaseline="middle"
              className="fill-ink-400 text-[11px] font-semibold"
              style={{ fontSize: 11 }}
            >
              {axis.label}
            </text>
          </g>
        ))}

        {/* series */}
        <polygon
          points={polygonFor('b')}
          fill="url(#radar-b)"
          stroke="#f472b6"
          strokeWidth={2}
          style={{ animation: 'fade-in .6s .15s ease both' }}
        />
        <polygon
          points={polygonFor('a')}
          fill="url(#radar-a)"
          stroke="#22d3ee"
          strokeWidth={2}
          style={{ animation: 'fade-in .6s ease both' }}
        />

        {/* vertices */}
        {axes.map((axis, index) => {
          const a = pointAt(index, Math.max(axis.a, 2) / 100);
          const b = pointAt(index, Math.max(axis.b, 2) / 100);
          return (
            <g
              key={axis.key}
              onMouseEnter={() => setHover(axis.key)}
              onMouseLeave={() => setHover(null)}
            >
              <circle cx={a.x} cy={a.y} r={hover === axis.key ? 5.5 : 3.5} fill="#22d3ee" />
              <circle cx={b.x} cy={b.y} r={hover === axis.key ? 5.5 : 3.5} fill="#f472b6" />
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-ink-300">
          <span className="h-2.5 w-2.5 rounded-full bg-energy-cyan" /> {labelA}
        </span>
        <span className="flex items-center gap-1.5 text-ink-300">
          <span className="h-2.5 w-2.5 rounded-full bg-energy-pink" /> {labelB}
        </span>
      </div>
    </div>
  );
}
