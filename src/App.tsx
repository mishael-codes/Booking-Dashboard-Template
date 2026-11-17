import React, { Suspense, lazy } from 'react';
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

const StorefrontView = lazy(() =>
  import('./features/storefront/StorefrontView').then((m) => ({ default: m.StorefrontView }))
);

const DashboardView = lazy(() =>
  import('./features/dashboard/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const BookingsListView = lazy(() =>
  import('./features/bookings/BookingsListView').then((m) => ({ default: m.BookingsListView }))
);
const CalendarView = lazy(() =>
  import('./features/calendar/CalendarView').then((m) => ({ default: m.CalendarView }))
);
const ServicesListView = lazy(() =>
  import('./features/services/ServicesListView').then((m) => ({ default: m.ServicesListView }))
);
const ResourcesListView = lazy(() =>
  import('./features/resources/ResourcesListView').then((m) => ({ default: m.ResourcesListView }))
);
const AvailabilityEditorView = lazy(() =>
  import('./features/availability/AvailabilityEditorView').then((m) => ({
    default: m.AvailabilityEditorView,
  }))
);
const PaymentsListView = lazy(() =>
  import('./features/payments/PaymentsListView').then((m) => ({ default: m.PaymentsListView }))
);
const CustomersListView = lazy(() =>
  import('./features/customers/CustomersListView').then((m) => ({ default: m.CustomersListView }))
);
const SettingsView = lazy(() =>
  import('./features/settings/SettingsView').then((m) => ({ default: m.SettingsView }))
);
const AuditLogView = lazy(() =>
  import('./features/audit/AuditLogView').then((m) => ({ default: m.AuditLogView }))
);
const AdminsListView = lazy(() =>
  import('./features/admins/AdminsListView').then((m) => ({ default: m.AdminsListView }))
);

function RouteLoadingFallback() {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-2">
      <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
      <span className="text-xs text-neutral-400 font-mono">Loading...</span>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const err = error as { code?: string };
        if (err?.code === '42501' || err?.code === 'PGRST301') return false;
        return failureCount < 1;
      },
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedAdminApp() {
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

  return <Layout />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <SettingsProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public White-Label Customer Storefront */}
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<RouteLoadingFallback />}>
                        <StorefrontView />
                      </Suspense>
                    }
                  />
                  <Route path="/book" element={<Navigate to="/" replace />} />
                  <Route path="/login" element={<Navigate to="/admin" replace />} />

                  {/* Protected Admin Operations Dashboard */}
                  <Route path="/admin" element={<ProtectedAdminApp />}>
                    <Route
                      index
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <DashboardView />
                        </Suspense>
                      }
                    />
                    <Route
                      path="bookings"
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <BookingsListView />
                        </Suspense>
                      }
                    />
                    <Route
                      path="calendar"
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <CalendarView />
                        </Suspense>
                      }
                    />
                    <Route
                      path="services"
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <ServicesListView />
                        </Suspense>
                      }
                    />
                    <Route
                      path="resources"
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <ResourcesListView />
                        </Suspense>
                      }
                    />
                    <Route
                      path="availability"
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <AvailabilityEditorView />
                        </Suspense>
                      }
                    />
                    <Route
                      path="payments"
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <PaymentsListView />
                        </Suspense>
                      }
                    />
                    <Route
                      path="customers"
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <CustomersListView />
                        </Suspense>
                      }
                    />
                    <Route
                      path="settings"
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <SettingsView />
                        </Suspense>
                      }
                    />
                    <Route
                      path="audit"
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <AuditLogView />
                        </Suspense>
                      }
                    />
                    <Route
                      path="admins"
                      element={
                        <Suspense fallback={<RouteLoadingFallback />}>
                          <AdminsListView />
                        </Suspense>
                      }
                    />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </SettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
