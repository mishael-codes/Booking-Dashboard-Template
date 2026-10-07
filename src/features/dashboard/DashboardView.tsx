import React, { useState, Suspense, lazy } from 'react';
import {
  useDashboardStats,
  useDashboardBookingsByDay,
  useTodayBookings,
  useExpiringHolds,
} from '../../api/dashboard';
import { useRealtimeSync } from '../../api/realtime';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { DateRangePicker, type DateRange } from '../../components/DateRangePicker';
import { StatusBadge } from '../../components/StatusBadge';
import { BookingDetailDrawer } from '../bookings/BookingDetailDrawer';
import { formatCurrency } from '../../lib/money';
import {
  getMonthBoundsUtc,
  getDayBoundsUtc,
  utcToWallClock,
  DEFAULT_TIMEZONE,
} from '../../lib/time';
import {
  CalendarCheck,
  TrendingUp,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Lazy-load Recharts component per section 6 requirements
const BookingsChart = lazy(() => import('./BookingsChart'));

export function DashboardView() {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;

  // Realtime subscription
  useRealtimeSync();

  // Bounded date range for stats & chart (default: this month in business timezone)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const bounds = getMonthBoundsUtc(new Date(), timezone);
    return {
      fromUtc: bounds.startUtc,
      toUtc: bounds.endUtc,
      label: 'This Month',
    };
  });

  // Selected booking for drawer
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Queries
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useDashboardStats(dateRange.fromUtc, dateRange.toUtc);

  const {
    data: chartData,
    isLoading: chartLoading,
    refetch: refetchChart,
  } = useDashboardBookingsByDay(dateRange.fromUtc, dateRange.toUtc);

  // Today's range in business timezone
  const todayBounds = getDayBoundsUtc(new Date(), timezone);
  const { data: todayBookings, isLoading: todayLoading } = useTodayBookings(
    todayBounds.startUtc,
    todayBounds.endUtc
  );

  const { data: expiringHolds, isLoading: holdsLoading } = useExpiringHolds();

  const handleRefresh = () => {
    refetchStats();
    refetchChart();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Operations Dashboard</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Realtime metrics and appointment schedule. All timestamps shown in{' '}
            <span className="font-mono font-medium text-neutral-700">{timezone}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} timezone={timezone} />
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 border border-neutral-300 rounded bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
            title="Refresh dashboard metrics"
            aria-label="Refresh dashboard metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards (admin_dashboard_stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Total Bookings</span>
            <CalendarCheck className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
            {statsLoading ? (
              <div className="h-8 w-16 bg-neutral-200 rounded animate-pulse" />
            ) : (
              stats?.bookings_total ?? 0
            )}
          </div>
          <div className="text-[11px] text-neutral-400">All bookings in period</div>
        </div>

        {/* Confirmed Bookings */}
        <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Confirmed</span>
            <span className="text-emerald-700 text-xs font-semibold">✓</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800">
            {statsLoading ? (
              <div className="h-8 w-16 bg-neutral-200 rounded animate-pulse" />
            ) : (
              stats?.bookings_confirmed ?? 0
            )}
          </div>
          <div className="text-[11px] text-neutral-400">Active or completed appointments</div>
        </div>

        {/* Cancelled Bookings */}
        <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Cancelled</span>
            <XCircle className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-700">
            {statsLoading ? (
              <div className="h-8 w-16 bg-neutral-200 rounded animate-pulse" />
            ) : (
              stats?.bookings_cancelled ?? 0
            )}
          </div>
          <div className="text-[11px] text-neutral-400">Cancelled or released slots</div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Booked Value</span>
            <TrendingUp className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
            {statsLoading ? (
              <div className="h-8 w-28 bg-neutral-200 rounded animate-pulse" />
            ) : (
              formatCurrency(stats?.revenue_minor ?? 0, settings.currency)
            )}
          </div>
          <div className="text-[11px] text-neutral-400">Confirmed booking revenue</div>
        </div>
      </div>

      {/* Bookings Per Day Chart */}
      <div className="p-5 bg-white border border-neutral-200 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Bookings Trend</h2>
            <p className="text-xs text-neutral-500">
              Daily booking volume calculated in {timezone} via <code className="font-mono">admin_bookings_by_day</code>.
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
              Loading chart...
            </div>
          }
        >
          {chartLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
              <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
            </div>
          ) : (
            <BookingsChart data={chartData ?? []} currency={settings.currency} />
          )}
        </Suspense>
      </div>

      {/* Two-Column Grid: Today's Bookings & Expiring Holds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Bookings */}
        <div className="p-5 bg-white border border-neutral-200 rounded-lg space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Today&apos;s Appointments</h2>
              <p className="text-xs text-neutral-500">
                Scheduled for {utcToWallClock(todayBounds.startUtc, timezone).displayDate}
              </p>
            </div>
            <Link
              to="/bookings"
              className="text-xs text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 font-medium"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 max-h-80">
            {todayLoading ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mx-auto mb-2" />
                <span>Loading appointments...</span>
              </div>
            ) : !todayBookings || todayBookings.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No appointments scheduled for today.
              </div>
            ) : (
              todayBookings.map((b) => {
                const wall = utcToWallClock(b.starts_at, timezone);
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBookingId(b.id)}
                    className="py-3 flex items-center justify-between hover:bg-neutral-50 cursor-pointer rounded px-2 -mx-2 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-neutral-900">
                          {wall.displayTime}
                        </span>
                        <span className="text-xs font-medium text-neutral-800">
                          {b.contact_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {b.service_name} · {b.resource_name}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={b.status} />
                      <div className="font-mono text-xs font-medium text-neutral-700">
                        {formatCurrency(b.price_minor, b.currency)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expiring Holds */}
        <div className="p-5 bg-white border border-neutral-200 rounded-lg space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Pending Holds Expiring Soon</h2>
                <p className="text-xs text-neutral-500">
                  Holds expiring within the {settings.hold_minutes}m booking window
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 max-h-80">
            {holdsLoading ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mx-auto mb-2" />
                <span>Checking expiring holds...</span>
              </div>
            ) : !expiringHolds || expiringHolds.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No active pending holds currently awaiting confirmation.
              </div>
            ) : (
              expiringHolds.map((h) => {
                const expires = h.hold_expires_at
                  ? utcToWallClock(h.hold_expires_at, timezone)
                  : null;

                return (
                  <div
                    key={h.id}
                    onClick={() => setSelectedBookingId(h.id)}
                    className="py-3 flex items-center justify-between hover:bg-neutral-50 cursor-pointer rounded px-2 -mx-2 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-neutral-900">
                          #{h.reference}
                        </span>
                        <span className="text-xs font-medium text-neutral-800">
                          {h.contact_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {h.service_name} · {h.resource_name}
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      {expires && (
                        <div className="font-mono text-xs text-amber-700 font-medium">
                          Expires: {expires.displayTime}
                        </div>
                      )}
                      <div className="font-mono text-xs font-medium text-neutral-700">
                        {formatCurrency(h.price_minor, h.currency)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
      />
    </div>
  );
}
