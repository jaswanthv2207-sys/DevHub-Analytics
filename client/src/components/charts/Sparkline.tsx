import { useMemo } from 'react';
import { cn } from '@/lib/format';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: boolean;
  className?: string;
  label?: string;
}

/** Tiny area chart used inside stat cards and the compare verdict. */
export function Sparkline({
  values,
  width = 120,
  height = 36,
  stroke = '#818cf8',
  fill = true,
  className,
  label,
}: SparklineProps) {
  const path = useMemo(() => {
    if (values.length < 2) return { line: '', area: '' };
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const stepX = width / (values.length - 1);
    const points = values.map((value, index) => ({
      x: index * stepX,
      y: height - ((value - min) / range) * (height - 4) - 2,
    }));

    // Smooth curve (Catmull-Rom → cubic bezier).
    let line = `M ${points[0]!.x.toFixed(1)},${points[0]!.y.toFixed(1)}`;
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index]!;
      const next = points[index + 1]!;
      const controlX = (current.x + next.x) / 2;
      line += ` C ${controlX.toFixed(1)},${current.y.toFixed(1)} ${controlX.toFixed(1)},${next.y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
    }
    const area = `${line} L ${width},${height} L 0,${height} Z`;
    return { line, area };
  }, [values, width, height]);

  const gradientId = `spark-${stroke.replace(/[^a-z0-9]/gi, '')}-${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      role="img"
      aria-label={label ?? 'trend'}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.45" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && path.area ? <path d={path.area} fill={`url(#${gradientId})`} /> : null}
      <path
        d={path.line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 400,
          animation: 'draw-ring .9s ease both',
          ['--dash-length' as string]: 400,
        }}
      />
      {values.length > 0 ? (
        <circle
          cx={width}
          cy={
            height -
            ((values[values.length - 1]! - Math.min(...values, 0)) /
              (Math.max(...values, 1) - Math.min(...values, 0) || 1)) *
              (height - 4) -
            2
          }
          r="2.6"
          fill={stroke}
        />
      ) : null}
    </svg>
  );
}
