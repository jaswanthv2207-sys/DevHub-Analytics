import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api, qs, ApiError, type Envelope } from './api';
import { useAuth } from './auth';
import type { CollectionKind, DashboardData, FavoriteRecord } from './types';

/* ── Generic API helpers ──────────────────────────────────────────────────── */

type QueryOpts<T> = Omit<
  UseQueryOptions<Envelope<T>, ApiError, Envelope<T>>,
  'queryKey' | 'queryFn'
>;

export function useApiQuery<T>(queryKey: QueryKey, path: string | null, options?: QueryOpts<T>) {
  return useQuery<Envelope<T>, ApiError>({
    queryKey,
    queryFn: () => api.get<T>(path as string),
    ...options,
    enabled: Boolean(path) && (options?.enabled ?? true),
  });
}

export function useApiMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  options?: UseMutationOptions<TOutput, ApiError, TInput>,
) {
  return useMutation<TOutput, ApiError, TInput>({ mutationFn, ...options });
}

/* ── Collections (favourite developers & repositories) ────────────────────── */

export function useFavorites() {
  const { isAuthenticated } = useAuth();
  const query = useApiQuery<FavoriteRecord[]>(
    ['favorites'],
    isAuthenticated ? '/collections/favorites' : null,
    { staleTime: 30_000 },
  );

  const favorites = query.data?.data ?? [];

  const isFavorite = (kind: CollectionKind, ref: string) =>
    favorites.some((entry) => entry.kind === kind && entry.ref.toLowerCase() === ref.toLowerCase());

  return {
    favorites,
    isLoading: query.isPending,
    isFavorite,
    refetch: query.refetch,
  };
}

export function useFavoriteToggle() {
  const { isAuthenticated } = useAuth();
  const { isFavorite, favorites } = useFavorites();

  return useMutation({
    mutationFn: async (input: { kind: CollectionKind; ref: string; snapshot: unknown }) => {
      if (!isAuthenticated) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to build your collection.');
      }
      if (isFavorite(input.kind, input.ref)) {
        await api.del(`/collections/favorites${qs({ kind: input.kind, ref: input.ref })}`);
        return { kind: input.kind, ref: input.ref, saved: false };
      }
      await api.post('/collections/favorites', {
        kind: input.kind,
        ref: input.ref,
        snapshot: input.snapshot,
      });
      return { kind: input.kind, ref: input.ref, saved: true };
    },
    onSettled: () => {
      // Refresh the collections + dashboard caches regardless of outcome.
      void import('./queryClient').then(({ queryClient }) => {
        void queryClient.invalidateQueries({ queryKey: ['favorites'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      });
    },
    meta: { favorites },
  });
}

/* ── Dashboard ────────────────────────────────────────────────────────────── */

export function useDashboard() {
  const { isAuthenticated } = useAuth();
  return useApiQuery<DashboardData>(['dashboard'], isAuthenticated ? '/dashboard' : null, {
    staleTime: 30_000,
  });
}

/* ── Fire-and-forget activity recording ───────────────────────────────────── */

export function useRecordActivity() {
  const { isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: async (
      input:
        | { type: 'view'; kind: CollectionKind; ref: string; snapshot: unknown }
        | { type: 'search'; kind: CollectionKind; query: string },
    ) => {
      if (!isAuthenticated) return null;
      if (input.type === 'view') {
        return api.post('/dashboard/views', {
          kind: input.kind,
          ref: input.ref,
          snapshot: input.snapshot,
        });
      }
      return api.post('/dashboard/searches', { kind: input.kind, query: input.query });
    },
  });
}
