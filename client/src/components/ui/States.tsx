import type { ReactNode } from 'react';
import { cn } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { Button } from './Button';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-energy-indigo border-t-transparent',
        className,
      )}
    />
  );
}

export function LoadingState({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}
    >
      <span className="relative grid h-12 w-12 place-items-center">
        <span className="absolute inset-0 animate-ping-soft rounded-full bg-energy-indigo/25" />
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-energy-cyan to-energy-pink">
          <span className="h-2.5 w-2.5 rounded-full bg-void-950" />
        </span>
      </span>
      <p className="text-sm text-ink-400">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon = '◎',
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'glass card relative flex flex-col items-center gap-3 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-ink-400">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-ink-100">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
  title,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  title?: string;
}) {
  const apiError = error instanceof ApiError ? error : null;
  const message =
    apiError?.message ??
    (error instanceof Error
      ? error.message
      : 'Something unexpected happened while loading this data.');
  const heading =
    title ??
    (apiError?.code === 'RATE_LIMITED'
      ? 'Rate limit reached'
      : apiError?.status === 404
        ? 'Not found'
        : 'Could not load this');

  return (
    <div
      role="alert"
      className={cn(
        'glass card relative flex flex-col items-center gap-3 border-energy-rose/25 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-energy-rose/30 bg-energy-rose/10 text-xl text-energy-rose">
        !
      </span>
      <h3 className="text-lg font-semibold text-ink-100">{heading}</h3>
      <p className="max-w-md text-sm leading-relaxed text-ink-400">{message}</p>
      {apiError?.fieldIssues.length ? (
        <ul className="text-xs text-ink-500">
          {apiError.fieldIssues.map((issue) => (
            <li key={issue.path}>
              <span className="mono text-energy-amber">{issue.path}</span> — {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
      {onRetry ? (
        <Button variant="ghost" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      ) : null}
    </div>
  );
}
