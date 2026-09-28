import type { ReactNode } from 'react';
import { cn } from '@/lib/format';

interface StatTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: 'cyan' | 'indigo' | 'pink' | 'lime' | 'amber' | 'mint';
  className?: string;
}

const TONES = {
  cyan: 'from-energy-cyan/18 text-energy-cyan border-energy-cyan/25',
  indigo: 'from-energy-indigo/18 text-energy-indigo border-energy-indigo/25',
  pink: 'from-energy-pink/18 text-energy-pink border-energy-pink/25',
  lime: 'from-energy-lime/18 text-energy-lime border-energy-lime/25',
  amber: 'from-energy-amber/18 text-energy-amber border-energy-amber/25',
  mint: 'from-energy-mint/18 text-energy-mint border-energy-mint/25',
} as const;

/** KPI card with a soft gradient wash and optional icon. */
export function StatTile({ label, value, sub, icon, tone = 'indigo', className }: StatTileProps) {
  return (
    <div
      className={cn(
        'glass card lit relative flex flex-col justify-center overflow-hidden p-4 transition-transform duration-300 hover:-translate-y-0.5',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl',
          TONES[tone],
        )}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500 sm:text-[11px] sm:tracking-[0.14em]">
            {label}
          </p>
          <p className="num mt-1.5 text-2xl font-bold leading-none text-ink-100">{value}</p>
          {sub ? <p className="mt-1.5 text-xs text-ink-500">{sub}</p> : null}
        </div>
        {icon ? (
          <span
            className={cn(
              'grid h-8 w-8 shrink-0 place-items-center rounded-xl border bg-gradient-to-br to-transparent text-sm sm:h-9 sm:w-9',
              TONES[tone],
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}
