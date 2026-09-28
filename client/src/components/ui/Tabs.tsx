import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/format';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  badge?: string | number;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/** Pill-style tab bar that scrolls horizontally on small screens. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  size = 'md',
}: TabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={cn(
        'hide-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/8 bg-white/4 p-1',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            data-active={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full font-semibold transition-all duration-300',
              size === 'sm' ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-2 text-[13px]',
              active
                ? 'bg-gradient-to-r from-energy-cyan/85 to-energy-indigo/85 text-void-950 shadow-[0_10px_24px_-14px_rgb(34_211_238_/_95%)]'
                : 'text-ink-400 hover:bg-white/6 hover:text-ink-100',
            )}
          >
            {item.icon}
            {item.label}
            {item.badge !== undefined ? (
              <span
                className={cn(
                  'mono rounded-full px-1.5 py-0.5 text-[10px]',
                  active ? 'bg-void-950/20' : 'bg-white/8 text-ink-300',
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Underline-style tabs used on the compare page. */
export function Segmented<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex rounded-xl border border-white/10 bg-white/4 p-1 backdrop-blur',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition',
              active ? 'bg-white/10 text-ink-100' : 'text-ink-500 hover:text-ink-200',
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
