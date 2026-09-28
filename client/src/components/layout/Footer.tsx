import { Link } from 'react-router-dom';
import { LogoMark, Wordmark } from './Logo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Explore', to: '/explore' },
      { label: 'Compare', to: '/compare' },
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Collections', to: '/collections' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Create account', to: '/register' },
      { label: 'Sign in', to: '/login' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-energy-indigo/60 to-transparent" />
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <Wordmark />
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-ink-500">
            A full-stack analytics playground for the GitHub graph — developers, repositories,
            languages and contribution activity, with collections that are yours.
          </p>
          <p className="mono text-[11px] text-ink-600">
            Data © GitHub · cached, rate-limit aware, refreshed continuously
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
              {column.title}
            </h3>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-ink-400 transition hover:text-energy-cyan"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-[11px] text-ink-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} DevHub — built with React, Express, SQLite and the GitHub
            API.
          </p>
          <p className="mono">v1.0.0 · public release</p>
        </div>
      </div>
    </footer>
  );
}
