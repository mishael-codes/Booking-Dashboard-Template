import React, { useState } from 'react';
import {
  useCalendarBookings,
  useCalendarTimeOff,
  type CalendarBookingItem,
  type CalendarTimeOffItem,
} from '../../api/calendar';
import { useResourcesList } from '../../api/resources';
import { useRealtimeSync } from '../../api/realtime';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { StatusBadge } from '../../components/StatusBadge';
import { BookingDetailDrawer } from '../bookings/BookingDetailDrawer';
import {
  getDayBoundsUtc,
  getWeekBoundsUtc,
  getWeekDaysInTimezone,
  utcToWallClock,
  formatInTimezone,
  DEFAULT_TIMEZONE,
} from '../../lib/time';
import { addDays, subDays, addWeeks, subWeeks, parseISO } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Ban,
  Layers,
} from 'lucide-react';

export function CalendarView() {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;

  useRealtimeSync();

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Load resources for column headers
  const { data: resources, isLoading: resourcesLoading } = useResourcesList(true);

  // Compute visible range in UTC based on viewMode
  const visibleRange =
    viewMode === 'day'
      ? getDayBoundsUtc(currentDate, timezone)
      : getWeekBoundsUtc(currentDate, timezone);

  const { data: bookings, isLoading: bookingsLoading } = useCalendarBookings(
    visibleRange.startUtc,
    visibleRange.endUtc
  );

  const { data: timeOffBlocks, isLoading: timeOffLoading } = useCalendarTimeOff(
    visibleRange.startUtc,
    visibleRange.endUtc
  );

  const handlePrev = () => {
    if (viewMode === 'day') {
      setCurrentDate((d) => subDays(d, 1));
    } else {
      setCurrentDate((d) => subWeeks(d, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setCurrentDate((d) => addDays(d, 1));
    } else {
      setCurrentDate((d) => addWeeks(d, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const weekDays = getWeekDaysInTimezone(currentDate, timezone);

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'border-l-4 border-l-emerald-600 bg-emerald-50/70 text-emerald-950';
      case 'pending':
        return 'border-l-4 border-l-amber-500 bg-amber-50/70 text-amber-950';
      case 'completed':
        return 'border-l-4 border-l-blue-600 bg-blue-50/70 text-blue-950';
      case 'cancelled':
        return 'border-l-4 border-l-neutral-400 bg-neutral-100 text-neutral-500 line-through';
      case 'no_show':
        return 'border-l-4 border-l-rose-500 bg-rose-50/70 text-rose-950';
      default:
        return 'border-l-4 border-l-neutral-300 bg-neutral-50 text-neutral-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Resource Calendar</h1>
          <p className="text-xs text-neutral-500">
            Appointments and scheduled time-off partitioned by resource. Timezone:{' '}
            <span className="font-mono font-medium text-neutral-700">{timezone}</span>.
          </p>
        </div>

        {/* View mode toggle & Navigation controls */}
        <div className="flex items-center gap-2">
          {/* Day / Week segmented buttons */}
          <div className="inline-flex rounded-md border border-neutral-300 bg-neutral-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'day'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Week
            </button>
          </div>

          {/* Date navigator */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs border border-neutral-300 rounded bg-white text-neutral-700 hover:bg-neutral-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 border border-neutral-300 rounded bg-white text-neutral-600 hover:text-neutral-900"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 border border-neutral-300 rounded bg-white text-neutral-600 hover:text-neutral-900"
              aria-label="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-lg p-3 flex items-center justify-between text-xs font-medium text-neutral-800">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-neutral-500" />
          <span className="font-semibold text-sm">
            {viewMode === 'day'
              ? formatInTimezone(currentDate, 'EEEE, MMMM d, yyyy', timezone)
              : `Week of ${formatInTimezone(weekDays[0]?.dateStr ?? '', 'MMM d')} – ${formatInTimezone(
                  weekDays[6]?.dateStr ?? '',
                  'MMM d, yyyy'
                )}`}
          </span>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-neutral-300 inline-block" />
            <span>Time Off</span>
          </div>
        </div>
      </div>

      {/* Calendar Columns Grid */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-x-auto min-h-[500px]">
        {resourcesLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
            <span className="text-xs text-neutral-400">Loading resources...</span>
          </div>
        ) : !resources || resources.length === 0 ? (
          <div className="py-20 text-center text-xs text-neutral-500">
            No active resources found in catalog. Add staff or rooms to view the calendar.
          </div>
        ) : (
          <div className="min-w-[700px]">
            {/* Day View: Column per resource */}
            {viewMode === 'day' && (
              <div className="grid divide-x divide-neutral-200" style={{ gridTemplateColumns: `repeat(${resources.length}, minmax(180px, 1fr))` }}>
                {resources.map((res) => {
                  const resBookings = bookings?.filter((b) => b.resource_id === res.id) ?? [];
                  const resTimeOff = timeOffBlocks?.filter((t) => t.resource_id === res.id) ?? [];

                  return (
                    <div key={res.id} className="flex flex-col min-h-[460px]">
                      {/* Column Header */}
                      <div className="p-3 bg-neutral-50/80 border-b border-neutral-200 sticky top-0 z-10">
                        <div className="font-semibold text-xs text-neutral-900 truncate">
                          {res.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
                          {res.kind}
                        </div>
                      </div>

                      {/* Items Column */}
                      <div className="p-2 space-y-2 flex-1">
                        {/* Time Off Blocks */}
                        {resTimeOff.map((to) => {
                          const startWall = utcToWallClock(to.starts_at, timezone);
                          const endWall = utcToWallClock(to.ends_at, timezone);
                          return (
                            <div
                              key={to.id}
                              className="p-2 rounded bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs space-y-0.5"
                            >
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-800">
                                <Ban className="w-3 h-3 text-neutral-500 shrink-0" />
                                <span>Time Off: {to.reason || 'Unavailable'}</span>
                              </div>
                              <div className="text-[10px] text-neutral-500 font-mono">
                                {startWall.displayTime} – {endWall.displayTime}
                              </div>
                            </div>
                          );
                        })}

                        {/* Booking Slots */}
                        {resBookings.map((b) => {
                          const startWall = utcToWallClock(b.starts_at, timezone);
                          const endWall = utcToWallClock(b.ends_at, timezone);
                          return (
                            <div
                              key={b.id}
                              onClick={() => setSelectedBookingId(b.id)}
                              className={`p-2.5 rounded shadow-xs cursor-pointer text-xs space-y-1 hover:brightness-95 transition-all ${getStatusBorderColor(
                                b.status
                              )}`}
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono font-bold">
                                  {startWall.displayTime} – {endWall.displayTime}
                                </span>
                                <span className="text-[10px] font-mono">#{b.reference}</span>
                              </div>
                              <div className="font-medium truncate">{b.contact_name}</div>
                              <div className="text-[11px] truncate opacity-85">
                                {b.service_name}
                              </div>
                            </div>
                          );
                        })}

                        {resBookings.length === 0 && resTimeOff.length === 0 && (
                          <div className="h-28 flex items-center justify-center text-[11px] text-neutral-300">
                            Available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Week View: Rows per day, columns per resource */}
            {viewMode === 'week' && (
              <div className="space-y-4 p-4">
                {weekDays.map((wd) => {
                  return (
                    <div
                      key={wd.dateStr}
                      className="border border-neutral-200 rounded-lg overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 font-semibold text-xs text-neutral-800">
                        {wd.dayName}
                      </div>

                      <div
                        className="grid divide-x divide-neutral-200"
                        style={{
                          gridTemplateColumns: `repeat(${resources.length}, minmax(160px, 1fr))`,
                        }}
                      >
                        {resources.map((res) => {
                          // Filter bookings on this specific day in business timezone
                          const dayBookings = (bookings ?? []).filter((b) => {
                            if (b.resource_id !== res.id) return false;
                            const bDate = formatInTimezone(b.starts_at, 'yyyy-MM-dd', timezone);
                            return bDate === wd.dateStr;
                          });

                          return (
                            <div key={`${wd.dateStr}-${res.id}`} className="p-2 min-h-[90px] space-y-1.5">
                              <div className="text-[10px] text-neutral-400 font-medium truncate mb-1">
                                {res.name}
                              </div>

                              {dayBookings.map((b) => {
                                const wall = utcToWallClock(b.starts_at, timezone);
                                return (
                                  <div
                                    key={b.id}
                                    onClick={() => setSelectedBookingId(b.id)}
                                    className={`p-1.5 rounded text-[11px] cursor-pointer transition-all ${getStatusBorderColor(
                                      b.status
                                    )}`}
                                  >
                                    <div className="font-mono font-semibold">
                                      {wall.displayTime}
                                    </div>
                                    <div className="truncate font-medium">{b.contact_name}</div>
                                  </div>
                                );
                              })}

                              {dayBookings.length === 0 && (
                                <div className="text-[10px] text-neutral-300 pt-2">—</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
      />
    </div>
  );
}
