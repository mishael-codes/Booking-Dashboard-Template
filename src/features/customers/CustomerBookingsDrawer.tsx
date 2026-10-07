import React, { useState } from 'react';
import { useCustomerBookings, type ProfileRow } from '../../api/customers';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { StatusBadge } from '../../components/StatusBadge';
import { BookingDetailDrawer } from '../bookings/BookingDetailDrawer';
import { formatCurrency } from '../../lib/money';
import { utcToWallClock, DEFAULT_TIMEZONE } from '../../lib/time';
import { X, User, Phone, Calendar, Clock } from 'lucide-react';

interface CustomerBookingsDrawerProps {
  customer: ProfileRow | null;
  onClose: () => void;
}

export function CustomerBookingsDrawer({ customer, onClose }: CustomerBookingsDrawerProps) {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { data: bookings, isLoading, error } = useCustomerBookings(customer?.id ?? null);

  if (!customer) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-drawer-title"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex justify-end transition-opacity"
      >
        <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-neutral-200 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/75">
            <div>
              <h2 id="customer-drawer-title" className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <User className="w-4 h-4 text-neutral-600" />
                <span>{customer.full_name || 'Unnamed Customer'}</span>
              </h2>
              <div className="text-xs text-neutral-500 font-mono mt-0.5">
                ID: {customer.id}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-neutral-400 hover:text-neutral-700"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile details */}
          <div className="p-6 border-b border-neutral-200 bg-neutral-50/50 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-neutral-700">
              <Phone className="w-3.5 h-3.5 text-neutral-400" />
              <span>{customer.phone || 'No phone number on record'}</span>
            </div>
            <div className="text-[11px] text-neutral-400">
              Customer profile created on {utcToWallClock(customer.created_at, timezone).displayDate}
            </div>
          </div>

          {/* Customer Bookings History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
              <span>Appointment History ({bookings?.length ?? 0})</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-neutral-400">Loading appointments...</div>
            ) : error ? (
              <div className="py-6 text-center text-xs text-rose-700">{(error as Error).message}</div>
            ) : !bookings || bookings.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No bookings recorded for this customer profile.</p>
            ) : (
              <div className="divide-y divide-neutral-200 text-xs">
                {bookings.map((b) => {
                  const wall = utcToWallClock(b.starts_at, timezone);
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBookingId(b.id)}
                      className="py-3 flex items-center justify-between hover:bg-neutral-50 cursor-pointer rounded px-2 -mx-2 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-neutral-900">
                            #{b.reference}
                          </span>
                          <span className="text-neutral-600 font-mono text-[11px]">
                            {wall.displayDate} {wall.displayTime}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {b.service_name} · {b.resource_name}
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <StatusBadge status={b.status} />
                        <div className="font-mono text-xs font-medium text-neutral-900">
                          {formatCurrency(b.price_minor, b.currency)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
      />
    </>
  );
}
