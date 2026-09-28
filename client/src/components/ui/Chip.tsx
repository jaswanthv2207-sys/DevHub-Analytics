import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/format';

export function Chip({
  active,
  interactive,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; interactive?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'chip',
        interactive && 'chip-interactive',
        active && 'chip-active',
        !interactive && !rest.onClick && 'cursor-default',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'cyan' | 'indigo' | 'pink' | 'lime' | 'amber' | 'rose' | 'mint';
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: 'bg-white/6 text-ink-300 border-white/10',
    cyan: 'bg-energy-cyan/12 text-energy-cyan border-energy-cyan/35',
    indigo: 'bg-energy-indigo/12 text-energy-indigo border-energy-indigo/35',
    pink: 'bg-energy-pink/12 text-energy-pink border-energy-pink/35',
    lime: 'bg-energy-lime/12 text-energy-lime border-energy-lime/35',
    amber: 'bg-energy-amber/12 text-energy-amber border-energy-amber/35',
    rose: 'bg-energy-rose/12 text-energy-rose border-energy-rose/35',
    mint: 'bg-energy-mint/12 text-energy-mint border-energy-mint/35',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TopicChip({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip chip-interactive mono max-w-36 truncate text-[11px]"
      title={label}
    >
      {label}
    </button>
  );
}
