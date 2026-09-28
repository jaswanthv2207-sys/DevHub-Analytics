import { useNavigate } from 'react-router-dom';
import { useFavoriteToggle, useFavorites } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/format';
import type { CollectionKind } from '@/lib/types';

interface FavoriteButtonProps {
  kind: CollectionKind;
  reference: string;
  snapshot: unknown;
  className?: string;
  /** `icon` = star only, `pill` = star + label */
  variant?: 'icon' | 'pill';
}

/** Optimistic star toggle used across cards, profile and repository headers. */
export function FavoriteButton({
  kind,
  reference,
  snapshot,
  className,
  variant = 'icon',
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const { isFavorite } = useFavorites();
  const toggle = useFavoriteToggle();
  const toast = useToast();
  const navigate = useNavigate();

  const active = isFavorite(kind, reference);

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      toast.info('Sign in to save this', 'Collections are tied to your DevHub account.');
      navigate('/login');
      return;
    }

    try {
      const result = await toggle.mutateAsync({ kind, ref: reference, snapshot });
      if (result.saved) toast.success('Added to your collection', reference);
      else toast.info('Removed from your collection', reference);
    } catch (error) {
      toast.error(
        'Could not update collection',
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={
        active ? `Remove ${reference} from collection` : `Save ${reference} to collection`
      }
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-full border transition-all duration-300',
        variant === 'pill' ? 'px-3 py-1.5 text-xs font-semibold' : 'h-8 w-8 justify-center text-sm',
        active
          ? 'border-energy-amber/50 bg-energy-amber/15 text-energy-amber shadow-[0_0_20px_-8px_rgba(251,191,36,.9)]'
          : 'border-white/12 bg-white/5 text-ink-400 hover:border-energy-amber/50 hover:text-energy-amber',
        toggle.isPending && 'opacity-60',
        className,
      )}
      style={active ? { animation: 'fade-in .3s ease both' } : undefined}
    >
      <span aria-hidden className="transition-transform duration-300 group-hover:scale-125">
        {active ? '★' : '☆'}
      </span>
      {variant === 'pill' ? <span>{active ? 'Saved' : 'Save'}</span> : null}
    </button>
  );
}
