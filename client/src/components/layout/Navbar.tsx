import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useApiQuery } from '@/lib/hooks';
import { cn, countdown, formatCompact, initials, secondsUntil } from '@/lib/format';
import type { RateLimitSummary } from '@/lib/types';
import { IconButton } from '@/components/ui/Button';
import { LogoMark, Wordmark } from './Logo';

const NAV_ITEMS = [
  { to: '/explore', label: 'Explore' },
  { to: '/compare', label: 'Compare' },
  { to: '/dashboard', label: 'Dashboard', auth: true },
  { to: '/collections', label: 'Collections', auth: true },
];

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [term, setTerm] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    if (!query) return;
    navigate(
      `/explore${query.includes('/') && !query.includes(' ') ? '?type=repos' : '?type=devs'}&q=${encodeURIComponent(query)}`,
    );
  };

  const visibleItems = NAV_ITEMS.filter((item) => !item.auth || isAuthenticated);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="glass-solid border-x-0 border-t-0">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-2.5" aria-label="DevHub home">
            <LogoMark
              size={30}
              className="transition-transform duration-500 group-hover:rotate-180"
            />
            <Wordmark />
          </Link>

          <nav className="ml-4 hidden items-center gap-6 md:flex" aria-label="Primary">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="nav-link"
                data-active={location.pathname.startsWith(item.to)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <form
            onSubmit={submitSearch}
            className="ml-auto hidden max-w-xs flex-1 lg:flex"
            role="search"
          >
            <div className="relative w-full">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600">
                ⌕
              </span>
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search devs or repos…"
                aria-label="Search developers and repositories"
                className="input py-2 pl-8 pr-3 text-[13px]"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2 lg:ml-3">
            <RatePill />

            {isLoading ? (
              <span className="skeleton h-9 w-24" />
            ) : isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5 transition hover:border-energy-indigo/50"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar name={user.displayName || user.username} size={30} />
                  <span className="hidden max-w-24 truncate text-[13px] font-semibold text-ink-200 sm:block">
                    {user.username}
                  </span>
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="glass-solid card absolute right-0 top-12 w-56 overflow-hidden p-1.5 shadow-2xl"
                    style={{ animation: 'rise .18s ease both' }}
                  >
                    <div className="border-b border-white/8 px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-ink-100">
                        {user.displayName}
                      </p>
                      <p className="mono truncate text-[11px] text-ink-500">{user.email}</p>
                    </div>
                    <MenuLink to="/dashboard">Dashboard</MenuLink>
                    <MenuLink to="/collections">Collections</MenuLink>
                    <MenuLink to="/compare">Compare</MenuLink>
                    <button
                      role="menuitem"
                      onClick={async () => {
                        await logout();
                        navigate('/');
                      }}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-energy-rose transition hover:bg-energy-rose/10"
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn btn-quiet hidden sm:inline-flex">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary px-4 py-2.5 text-[13px]">
                  Get started
                </Link>
              </div>
            )}

            <IconButton
              className="md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span className="text-base leading-none">{mobileOpen ? '✕' : '☰'}</span>
            </IconButton>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div
          className="glass-solid border-x-0 px-4 pb-4 pt-3 md:hidden"
          style={{ animation: 'fade-in .2s ease both' }}
        >
          <form onSubmit={submitSearch} className="mb-3" role="search">
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search devs or repos…"
              aria-label="Search"
              className="input py-2.5 text-sm"
            />
          </form>
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-300 transition hover:bg-white/6 hover:text-ink-100"
              >
                {item.label}
              </NavLink>
            ))}
            {!isAuthenticated ? (
              <div className="mt-2 flex gap-2">
                <Link to="/login" className="btn btn-ghost flex-1 justify-center">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary flex-1 justify-center">
                  Get started
                </Link>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function MenuLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      role="menuitem"
      to={to}
      className="mt-1 block rounded-lg px-3 py-2 text-[13px] font-medium text-ink-300 transition hover:bg-white/6 hover:text-ink-100"
    >
      {children}
    </Link>
  );
}

/** Live GitHub budget widget — doubles as an "API is healthy" indicator. */
function RatePill() {
  const { data, isFetching } = useApiQuery<RateLimitSummary>(['rate-limit'], '/github/rate-limit', {
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const core = data?.data.core;
  if (!core?.limit) {
    return (
      <span className="mono hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-ink-500 xl:inline-flex">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            isFetching ? 'animate-pulse bg-energy-amber' : 'bg-energy-mint',
          )}
        />
        api
      </span>
    );
  }

  const remaining = core.remaining ?? 0;
  const percent = Math.max(0, Math.min(100, (remaining / (core.limit || 1)) * 100));
  const tone =
    percent > 40 ? 'bg-energy-mint' : percent > 15 ? 'bg-energy-amber' : 'bg-energy-rose';

  return (
    <span
      className="mono hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-ink-400 xl:inline-flex"
      title={`GitHub API budget: ${remaining} of ${core.limit} requests left${
        core.resetAt ? ` · resets in ${countdown(secondsUntil(core.resetAt))}` : ''
      }`}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone, remaining <= 10 && 'animate-pulse')} />
      {formatCompact(remaining)}/{formatCompact(core.limit)}
    </span>
  );
}

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/12 bg-gradient-to-br from-energy-cyan/30 via-energy-indigo/30 to-energy-pink/30 font-semibold text-ink-100',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.34) }}
    >
      {src && !broken ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
