import { cn } from '@/lib/format';

/** DevHub mark — two orbiting rings around a bright core. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="DevHub"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <ellipse
        cx="32"
        cy="32"
        rx="22"
        ry="10"
        fill="none"
        stroke="url(#logo-grad)"
        strokeWidth="3"
        transform="rotate(-28 32 32)"
        opacity="0.95"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="22"
        ry="10"
        fill="none"
        stroke="url(#logo-grad)"
        strokeWidth="3"
        transform="rotate(36 32 32)"
        opacity="0.5"
      />
      <circle cx="32" cy="32" r="7.5" fill="url(#logo-grad)" />
      <circle cx="50.5" cy="21.5" r="3.6" fill="#f472b6" />
      <circle cx="13.5" cy="43" r="2.6" fill="#22d3ee" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex items-baseline gap-0.5 font-display text-lg font-bold tracking-tight',
        className,
      )}
    >
      <span className="text-ink-100">Dev</span>
      <span className="text-gradient-static">Hub</span>
    </span>
  );
}
