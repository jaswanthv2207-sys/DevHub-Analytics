import { Button } from './Button';

interface PaginationProps {
  page: number;
  hasMore: boolean;
  onChange: (page: number) => void;
  busy?: boolean;
}

export function Pagination({ page, hasMore, onChange, busy }: PaginationProps) {
  if (page <= 1 && !hasMore) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1 || busy}
        onClick={() => onChange(page - 1)}
      >
        ← Previous
      </Button>
      <span className="mono text-xs text-ink-500">page {page}</span>
      <Button
        variant="ghost"
        size="sm"
        disabled={!hasMore || busy}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </Button>
    </div>
  );
}
