import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center text-center page-enter">
      <div className="max-w-lg">
        <div className="relative mx-auto mb-8 h-40 w-40">
          <div className="absolute inset-0 rounded-full border border-dashed border-white/12" />
          <div
            className="absolute inset-6 rounded-full border border-white/10"
            style={{ animation: 'spin 18s linear infinite' }}
          >
            <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-energy-cyan shadow-[0_0_20px_rgba(34,211,238,.9)]" />
          </div>
          <div className="absolute inset-0 grid place-items-center">
            <span className="num text-5xl font-bold text-gradient">404</span>
          </div>
        </div>

        <p className="eyebrow mb-3">signal lost</p>
        <h1 className="text-3xl font-bold">This coordinate doesn&apos;t exist.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-400">
          The page you requested drifted out of orbit — it may have been renamed, made private, or
          never existed at all.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-primary">
            Back to base
          </Link>
          <Link to="/explore" className="btn btn-ghost">
            Explore the graph
          </Link>
        </div>
      </div>
    </div>
  );
}
