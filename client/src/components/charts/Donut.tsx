import { useState } from 'react';
import { cn, formatBytes, formatPercent } from '@/lib/format';

export interface Slice {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  className?: string;
}

/**
 * Animated donut used for language distribution.
 * Segments draw themselves in on mount and expand slightly on hover.
 */
export function Donut({
  data,
  size = 200,
  thickness = 22,
  centerValue,
  centerLabel,
  className,
}: DonutProps) {
  const [active, setActive] = useState<number | null>(null);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, slice) => sum + slice.value, 0) || 1;

  let offsetAccumulator = 0;
  const segments = data.map((slice) => {
    const fraction = slice.value / total;
    const length = fraction * circumference;
    const offset = offsetAccumulator;
    offsetAccumulator += length;
    return { ...slice, fraction, length, offset };
  });

  const activeSlice = active !== null ? segments[active] : null;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Language distribution"
        >
          <defs>
            <linearGradient id="donut-track" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.07)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#donut-track)"
            strokeWidth={thickness}
          />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {segments.map((segment, index) => (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={active === index ? thickness + 6 : thickness}
                strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                strokeDashoffset={-segment.offset}
                strokeLinecap="butt"
                opacity={active === null || active === index ? 1 : 0.32}
                style={{
                  transition: 'stroke-width .25s ease, opacity .25s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              >
                <title>{`${segment.label} — ${formatPercent(segment.fraction * 100, 1)}`}</title>
              </circle>
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="num text-2xl font-bold leading-none text-ink-100">
              {activeSlice
                ? formatPercent(activeSlice.fraction * 100, 1)
                : (centerValue ?? formatPercent(100, 0))}
            </p>
            <p className="mt-1 max-w-24 truncate text-[11px] font-medium text-ink-500">
              {activeSlice ? activeSlice.label : (centerLabel ?? 'total')}
            </p>
          </div>
        </div>
      </div>

      <LanguageLegend
        data={segments.map((segment) => ({
          label: segment.label,
          value: segment.value,
          color: segment.color,
          percentage: segment.fraction * 100,
        }))}
        active={active}
        onActive={setActive}
      />
    </div>
  );
}

export function LanguageLegend({
  data,
  active,
  onActive,
  showBytes = true,
}: {
  data: { label: string; value: number; color: string; percentage: number }[];
  active?: number | null;
  onActive?: (index: number | null) => void;
  showBytes?: boolean;
}) {
  return (
    <ul className="w-full space-y-1.5">
      {data.map((item, index) => (
        <li key={item.label}>
          <button
            type="button"
            onMouseEnter={() => onActive?.(index)}
            onMouseLeave={() => onActive?.(null)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition',
              active === index ? 'bg-white/7' : 'hover:bg-white/4',
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}` }}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-300">{item.label}</span>
            {showBytes ? (
              <span className="mono text-[10px] text-ink-600">{formatBytes(item.value)}</span>
            ) : null}
            <span className="num w-12 text-right text-[13px] font-semibold text-ink-100">
              {formatPercent(item.percentage, 1)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
