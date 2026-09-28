import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { AppShell, ErrorBoundary, ProtectedRoute, ScrollToTop } from '@/components/layout/AppShell';
import { Landing } from '@/pages/Landing';
import { Explore } from '@/pages/Explore';
import { Developer } from '@/pages/Developer';
import { Repository } from '@/pages/Repository';
import { Compare } from '@/pages/Compare';
import { Dashboard } from '@/pages/Dashboard';
import { Collections } from '@/pages/Collections';
import { AuthPage } from '@/pages/Auth';
import { NotFound } from '@/pages/NotFound';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <ErrorBoundary>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Landing />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/dev/:login" element={<Developer />} />
                  <Route path="/repo/:owner/:repo" element={<Repository />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/login" element={<AuthPage mode="login" />} />
                  <Route path="/register" element={<AuthPage mode="register" />} />

                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/collections" element={<Collections />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
