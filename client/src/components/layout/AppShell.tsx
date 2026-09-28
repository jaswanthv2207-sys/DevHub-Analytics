import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Background } from './Background';
import { Footer } from './Footer';
import { Navbar } from './Navbar';
import { cn } from '@/lib/format';
import { Button } from '@/components/ui/Button';

/** App chrome: fixed backdrop, navbar, animated main region, footer. */
export function AppShell() {
  const location = useLocation();

  return (
    <div className="relative flex min-h-screen flex-col">
      <Background />
      <Navbar />
      <main
        key={location.pathname}
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-24 sm:px-6 lg:px-8 page-enter"
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

/** Redirects anonymous visitors to the login screen, preserving the target. */
export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <span className="skeleton h-9 w-40" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children ?? <Outlet />}</>;
}

/** Scrolls to top on route change (except when only the query string changes). */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches render-time crashes so a single broken widget never blanks the app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[DevHub] render error', error);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-4 text-center">
        <div className="glass card lit w-full p-8">
          <p className="eyebrow mb-3">runtime fault</p>
          <h1 className="mb-2 text-2xl font-bold">Something went sideways</h1>
          <p className="mb-6 text-sm leading-relaxed text-ink-500">
            A component crashed while rendering. Reloading usually clears it.
          </p>
          <pre className="mono mb-6 max-h-32 overflow-auto rounded-lg border border-white/8 bg-black/40 p-3 text-left text-[11px] text-energy-rose">
            {this.state.error.message}
          </pre>
          <div className="flex justify-center gap-2">
            <Button variant="ghost" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

/** Reusable page heading with eyebrow, title and actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  align = 'left',
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  align?: 'left' | 'between';
}) {
  return (
    <header
      className={cn(
        'mb-8 flex flex-col gap-4',
        align === 'between' ? 'md:flex-row md:items-end md:justify-between' : '',
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 text-[15px] leading-relaxed text-ink-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Scroll-reveal wrapper (IntersectionObserver, reduced-motion aware). */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(22px)',
        transition: `opacity .7s cubic-bezier(.2,.8,.2,1) ${delay}ms, transform .7s cubic-bezier(.2,.8,.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
