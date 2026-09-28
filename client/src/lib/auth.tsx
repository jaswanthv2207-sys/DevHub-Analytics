import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { AuthUser } from './types';

interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const result = await api.get<{ user: AuthUser }>('/auth/me');
      return result.data.user;
    },
    retry: false,
    staleTime: 5 * 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: async (input: { identifier: string; password: string }) => {
      const result = await api.post<{ user: AuthUser }>('/auth/login', input);
      return result.data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      void queryClient.invalidateQueries();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const result = await api.post<{ user: AuthUser }>('/auth/register', input);
      return result.data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      void queryClient.invalidateQueries();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (displayName: string) => {
      const result = await api.patch<{ user: AuthUser }>('/auth/profile', { displayName });
      return result.data.user;
    },
    onSuccess: (user) => queryClient.setQueryData(AUTH_QUERY_KEY, user),
  });

  const login = useCallback(
    async (identifier: string, password: string) => {
      await loginMutation.mutateAsync({ identifier, password });
    },
    [loginMutation],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      await registerMutation.mutateAsync(input);
    },
    [registerMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      await profileMutation.mutateAsync(displayName);
    },
    [profileMutation],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session.data ?? null,
      isAuthenticated: Boolean(session.data),
      isLoading: session.isPending,
      login,
      register,
      logout,
      updateDisplayName,
    }),
    [session.data, session.isPending, login, register, logout, updateDisplayName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
