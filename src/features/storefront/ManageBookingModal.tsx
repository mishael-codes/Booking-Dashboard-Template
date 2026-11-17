import React, { useState } from 'react';
import { X, Search, AlertCircle, CalendarPlus, CheckCircle2 } from 'lucide-react';
import {
  useLookupPublicBooking,
  useCancelPublicBooking,
  type PublicBookingLookupResult,
} from '../../api/storefront';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { formatCurrency } from '../../lib/money';
import { utcToWallClock, DEFAULT_TIMEZONE } from '../../lib/time';
import { downloadBookingIcs } from './ics';

interface ManageBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageBookingModal({ isOpen, onClose }: ManageBookingModalProps) {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const brandColor = settings.brand_color || '#0f172a';

  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState<PublicBookingLookupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelledSuccess, setCancelledSuccess] = useState(false);

  const lookupMutation = useLookupPublicBooking();
  const cancelMutation = useCancelPublicBooking();

  if (!isOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCancelledSuccess(false);
    try {
      const result = await lookupMutation.mutateAsync({ reference, email });
      setBooking(result);
    } catch (err) {
      setBooking(null);
      setErrorMsg(err instanceof Error ? err.message : 'Unable to locate booking.');
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    setErrorMsg(null);
    try {
      await cancelMutation.mutateAsync({
        reference: booking.reference,
        email: booking.contact_email,
      });
      setBooking({ ...booking, status: 'cancelled' });
      setCancelledSuccess(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to cancel booking.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-booking-title"
    >
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 id="manage-booking-title" className="text-base font-semibold text-neutral-900">
              Manage Your Booking
            </h2>
            <p className="text-xs text-neutral-500">
              Look up an upcoming appointment or cancel within {settings.cancellation_window_hours} hours.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <form onSubmit={handleLookup} className="space-y-3">
            <div>
              <label htmlFor="lookup-ref" className="block text-xs font-semibold text-neutral-700 mb-1">
                Booking Reference
              </label>
              <input
                id="lookup-ref"
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                placeholder="BK-10421"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono uppercase focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="lookup-email" className="block text-xs font-semibold text-neutral-700 mb-1">
                Email Used at Checkout
              </label>
              <input
                id="lookup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={lookupMutation.isPending}
              style={{ backgroundColor: brandColor }}
              className="w-full py-2.5 px-4 rounded-md text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{lookupMutation.isPending ? 'Searching...' : 'Find Reservation'}</span>
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {cancelledSuccess && (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>Your booking has been cancelled and the slot has been released.</span>
            </div>
          )}

          {booking && (
            <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="font-mono font-bold text-neutral-900">#{booking.reference}</span>
                <span className="capitalize font-semibold text-neutral-700">{booking.status}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Treatment</span>
                  <span className="font-medium text-neutral-900">{booking.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Specialist</span>
                  <span className="font-medium text-neutral-900">{booking.resource_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Date & Time</span>
                  <span className="font-mono text-neutral-900">
                    {utcToWallClock(booking.starts_at, timezone).displayDate} ·{' '}
                    {utcToWallClock(booking.starts_at, timezone).displayTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Fee</span>
                  <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                    {formatCurrency(booking.price_minor, booking.currency)}
                  </span>
                </div>
              </div>

              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadBookingIcs({
                        reference: booking.reference,
                        serviceName: booking.service_name,
                        resourceName: booking.resource_name,
                        businessName: settings.business_name,
                        address: settings.address,
                        startsAt: booking.starts_at,
                        endsAt: booking.ends_at,
                      })
                    }
                    className="flex-1 py-2 px-3 rounded border border-neutral-300 bg-white text-neutral-800 font-medium inline-flex items-center justify-center gap-1.5 hover:bg-neutral-50 cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Add to Calendar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    className="flex-1 py-2 px-3 rounded border border-rose-300 bg-rose-50 text-rose-800 font-medium hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                  >
                    {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
