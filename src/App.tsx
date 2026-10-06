import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { SettingsProvider } from './app/SettingsProvider';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './app/ErrorBoundary';
import { Layout } from './app/Layout';
import { LoginView } from './auth/LoginView';
import { MfaEnrollView } from './auth/MfaEnrollView';
import { MfaChallengeView } from './auth/MfaChallengeView';
import { AccessDeniedView } from './auth/AccessDeniedView';

// TanStack Query v5 client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Do not retry 42501 (RLS forbidden) or 401/403
        const err = error as { code?: string };
        if (err?.code === '42501' || err?.code === 'PGRST301') return false;
        return failureCount < 1;
      },
      staleTime: 30 * 1000, // 30s default
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedApp() {
  const {
    session,
    isLoading,
    isAdmin,
    needsMfaEnrollment,
    needsMfaVerification,
    authError,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <div className="text-xs text-neutral-400 font-mono">Verifying admin session...</div>
        </div>
      </div>
    );
  }

  if (authError) {
    return <AccessDeniedView message={authError} />;
  }

  if (!session) {
    return <LoginView />;
  }

  if (!isAdmin) {
    return <AccessDeniedView message="You are not authorised." />;
  }

  if (needsMfaEnrollment) {
    return <MfaEnrollView />;
  }

  if (needsMfaVerification) {
    return <MfaChallengeView />;
  }

  return (
    <SettingsProvider>
      <Layout />
    </SettingsProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/*" element={<ProtectedApp />}>
                  <Route
                    index
                    element={
                      <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                        <h2 className="text-lg font-bold text-neutral-900">Dashboard</h2>
                        <p className="text-xs text-neutral-500 mt-1">Foundation ready. Proceeding to Phase 2.</p>
                      </div>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
