import { cn } from '@/lib/format';

/**
 * Fixed atmospheric backdrop: aurora blooms, perspective grid, star dust and
 * a whisper of film grain. Sits behind every page at `z-0`.
 */
export function Background({ dense = false }: { dense?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* aurora blooms */}
      <div
        className="aurora left-[-12%] top-[-18%] h-[36rem] w-[36rem] bg-[radial-gradient(circle,rgba(34,211,238,.5),transparent_65%)]"
        style={{ animation: 'float 16s ease-in-out infinite' }}
      />
      <div
        className="aurora right-[-14%] top-[6%] h-[30rem] w-[30rem] bg-[radial-gradient(circle,rgba(129,140,248,.45),transparent_65%)]"
        style={{ animation: 'float 21s ease-in-out infinite reverse' }}
      />
      <div
        className="aurora bottom-[-22%] left-[35%] h-[34rem] w-[34rem] bg-[radial-gradient(circle,rgba(244,114,182,.35),transparent_65%)]"
        style={{ animation: 'float-slow 24s ease-in-out infinite' }}
      />

      {/* structure */}
      <div className="absolute inset-0 bg-grid opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(129,140,248,.16),transparent_60%)]" />

      {/* star dust */}
      <div className={cn('absolute inset-0', dense && 'opacity-100')}>
        {STARS.map((star) => (
          <span
            key={star.key}
            className="absolute rounded-full bg-white"
            style={{
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animation: star.pulse ? 'ping-soft 4s ease-in-out infinite' : undefined,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      {/* vignette + grain */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,5,10,.85)_100%)]" />
    </div>
  );
}

/** Deterministic pseudo-random stars so the sky doesn't reflow on re-render. */
const STARS = Array.from({ length: 46 }, (_, index) => {
  const seed = Math.sin(index * 999) * 10_000;
  const x = Math.abs(seed % 100);
  const y = Math.abs((seed * 1.7) % 100);
  return {
    key: index,
    x: `${x.toFixed(2)}%`,
    y: `${y.toFixed(2)}%`,
    size: index % 7 === 0 ? 2.5 : index % 3 === 0 ? 2 : 1.5,
    opacity: 0.12 + ((index * 37) % 50) / 100,
    pulse: index % 9 === 0,
    delay: `${(index % 11) * 0.4}s`,
  };
});
