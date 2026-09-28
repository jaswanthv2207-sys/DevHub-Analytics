import { useMemo, useState } from 'react';
import { cn, formatDate } from '@/lib/format';
import type { ContributionHeatmap, HeatmapDay } from '@/lib/types';

const LEVEL_COLORS = [
  'rgba(255,255,255,0.055)',
  'rgba(34,211,238,0.28)',
  'rgba(34,211,238,0.55)',
  'rgba(129,140,248,0.8)',
  '#c7d2fe',
] as const;

const CELL = 11;
const GAP = 3;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface HeatmapProps {
  heatmap: ContributionHeatmap;
  className?: string;
}

/** Contribution calendar — 53×7 grid with hover tooltips. */
export function Heatmap({ heatmap, className }: HeatmapProps) {
  const [hovered, setHovered] = useState<{ day: HeatmapDay; left: number; top: number } | null>(
    null,
  );

  const { columns, monthLabels } = useMemo(() => {
    const days = heatmap.days;
    if (days.length === 0)
      return { columns: [] as (HeatmapDay | null)[][], monthLabels: [] as (string | null)[] };

    const firstWeekday = new Date(`${days[0]!.date}T00:00:00Z`).getUTCDay();
    const padding: (HeatmapDay | null)[] = Array.from(
      { length: firstWeekday },
      (): HeatmapDay | null => null,
    );
    const padded: (HeatmapDay | null)[] = [...padding, ...days];

    const columns: (HeatmapDay | null)[][] = [];
    for (let index = 0; index < padded.length; index += 7) {
      columns.push(padded.slice(index, index + 7));
    }

    const monthLabels = columns.map((column) => {
      const firstReal = column.find((day): day is HeatmapDay => Boolean(day));
      if (!firstReal) return null;
      const date = new Date(`${firstReal.date}T00:00:00Z`);
      // Label a column when it contains the 1st–7th of a month (start of a month).
      return date.getUTCDate() <= 7 &&
        column.some((day) => day && Number(day.date.slice(8, 10)) === 1)
        ? MONTHS[date.getUTCMonth()]
        : null;
    });

    return { columns, monthLabels };
  }, [heatmap.days]);

  if (heatmap.days.length === 0) {
    return (
      <div
        className={cn(
          'grid place-items-center rounded-xl border border-dashed border-white/10 px-4 py-8 text-xs text-ink-600',
          className,
        )}
      >
        No contribution data available for this account.
      </div>
    );
  }

  const width = columns.length * (CELL + GAP);

  return (
    <div className={cn('relative', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-400">
          <span className="num font-bold text-ink-100">{heatmap.total.toLocaleString()}</span>{' '}
          contributions in the last year
          <span
            className={cn(
              'chip ml-2 px-2 py-0.5 text-[10px]',
              heatmap.source === 'graphql' && 'text-energy-mint',
            )}
          >
            {heatmap.source === 'graphql' ? 'live calendar' : 'public events'}
          </span>
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-600">
          <span>Less</span>
          {LEVEL_COLORS.map((color) => (
            <span
              key={color}
              className="h-[10px] w-[10px] rounded-[3px]"
              style={{ backgroundColor: color }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="hide-scrollbar overflow-x-auto pb-1" onMouseLeave={() => setHovered(null)}>
        <div style={{ width }}>
          <div
            className="mono mb-1 grid text-[9px] text-ink-600"
            style={{ gridTemplateColumns: `repeat(${columns.length}, ${CELL}px)`, gap: GAP }}
          >
            {monthLabels.map((label, index) => (
              <span key={index} className="truncate">
                {label}
              </span>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gridAutoFlow: 'column',
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              gridTemplateColumns: `repeat(${columns.length}, ${CELL}px)`,
              gap: GAP,
            }}
          >
            {columns.flatMap((column, columnIndex) =>
              Array.from({ length: 7 }, (_, rowIndex) => {
                const day = column[rowIndex];
                if (!day)
                  return (
                    <span
                      key={`${columnIndex}-${rowIndex}`}
                      style={{ width: CELL, height: CELL }}
                    />
                  );
                const left = columnIndex * (CELL + GAP);
                const top = rowIndex * (CELL + GAP);
                return (
                  <button
                    key={day.date}
                    type="button"
                    aria-label={`${day.count} contributions on ${day.date}`}
                    onMouseEnter={(event) => {
                      const parent = (
                        event.currentTarget.offsetParent as HTMLElement | null
                      )?.getBoundingClientRect();
                      const rect = event.currentTarget.getBoundingClientRect();
                      setHovered({
                        day,
                        left: parent ? rect.left - parent.left + rect.width / 2 : left,
                        top: parent ? rect.top - parent.top : top,
                      });
                    }}
                    className="rounded-[3px] transition-transform duration-150 hover:scale-[1.35]"
                    style={{
                      width: CELL,
                      height: CELL,
                      backgroundColor: LEVEL_COLORS[day.level],
                      boxShadow: day.level === 4 ? '0 0 8px rgba(199,210,254,.5)' : undefined,
                    }}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>

      {hovered ? (
        <div
          className="glass-solid card pointer-events-none absolute z-20 -translate-x-1/2 px-2.5 py-1.5 text-center"
          style={{
            left: hovered.left,
            top: Math.max(0, hovered.top - 46),
            animation: 'fade-in .12s ease both',
          }}
        >
          <p className="num text-xs font-bold text-ink-100">
            {hovered.day.count} contribution{hovered.day.count === 1 ? '' : 's'}
          </p>
          <p className="text-[10px] text-ink-500">{formatDate(hovered.day.date)}</p>
        </div>
      ) : null}
    </div>
  );
}
