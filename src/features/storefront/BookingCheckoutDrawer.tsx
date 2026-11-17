import React, { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  CalendarPlus,
  ArrowLeft,
  ArrowRight,
  User,
} from 'lucide-react';
import type { ServiceRow } from '../../api/services';
import type { ResourceRow } from '../../api/resources';
import {
  usePublicAvailableSlots,
  useCreatePublicBooking,
  type PublicBookingConfirmation,
} from '../../api/storefront';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { formatCurrency } from '../../lib/money';
import { utcToWallClock, DEFAULT_TIMEZONE } from '../../lib/time';
import { downloadBookingIcs } from './ics';

interface BookingCheckoutDrawerProps {
  service: ServiceRow | null;
  resources: ResourceRow[];
  onClose: () => void;
}

export function BookingCheckoutDrawer({
  service,
  resources,
  onClose,
}: BookingCheckoutDrawerProps) {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const brandColor = settings.brand_color || '#0f172a';

  const [step, setStep] = useState<'slot' | 'details' | 'confirmed'>('slot');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    format(addDays(new Date(), 1), 'yyyy-MM-dd')
  );
  const [selectedSlot, setSelectedSlot] = useState<{
    resource_id: string;
    starts_at: string;
    ends_at: string;
  } | null>(null);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  const [confirmation, setConfirmation] = useState<PublicBookingConfirmation | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const minDate = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), settings.max_advance_days || 60), 'yyyy-MM-dd');

  const {
    data: slots,
    isLoading: slotsLoading,
    error: slotsError,
  } = usePublicAvailableSlots(service?.id, selectedDate, selectedResourceId || null);

  const createBookingMutation = useCreatePublicBooking();

  const resourceMap = useMemo(() => {
    const map = new Map<string, ResourceRow>();
    resources.forEach((r) => map.set(r.id, r));
    return map;
  }, [resources]);

  if (!service) return null;

  const depositActive = Boolean(settings.enable_online_payments && settings.require_deposit);
  const depositPct = settings.deposit_percentage ?? 20;
  const dueNowMinor = depositActive
    ? Math.round((service.price_minor * depositPct) / 100)
    : service.price_minor;

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSlot) {
      setFormError('Please select an appointment time slot.');
      return;
    }

    if (!acceptedPolicy) {
      setFormError('Please acknowledge the cancellation policy to continue.');
      return;
    }

    try {
      const result = await createBookingMutation.mutateAsync({
        serviceId: service.id,
        resourceId: selectedSlot.resource_id,
        startsAt: selectedSlot.starts_at,
        endsAt: selectedSlot.ends_at,
        contactName,
        contactEmail,
        contactPhone,
        notes,
      });
      setConfirmation(result);
      setStep('confirmed');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to complete booking.');
    }
  };

  const handleCopyRef = () => {
    if (!confirmation) return;
    navigator.clipboard.writeText(confirmation.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-neutral-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-drawer-title"
    >
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl border-l border-neutral-200">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-neutral-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-neutral-500">
              {step === 'slot'
                ? 'Step 1 of 2 · Select Time'
                : step === 'details'
                  ? 'Step 2 of 2 · Guest Details'
                  : 'Reservation Complete'}
            </p>
            <h2
              id="booking-drawer-title"
              className="text-lg font-semibold text-neutral-900 truncate mt-0.5"
            >
              {service.name}
            </h2>
            <p className="text-xs text-neutral-500 font-mono tabular-nums mt-0.5">
              {service.duration_minutes} min · {formatCurrency(service.price_minor, service.currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close booking panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {step === 'slot' && (
            <>
              {/* Specialist Preference */}
              <div className="space-y-2">
                <label
                  htmlFor="storefront-resource"
                  className="block text-xs font-semibold text-neutral-700"
                >
                  Specialist or Suite
                </label>
                <select
                  id="storefront-resource"
                  value={selectedResourceId}
                  onChange={(e) => {
                    setSelectedResourceId(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 bg-white focus:border-neutral-900 focus:outline-none"
                >
                  <option value="">Any available specialist</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Picker */}
              <div className="space-y-2">
                <label
                  htmlFor="storefront-date"
                  className="block text-xs font-semibold text-neutral-700"
                >
                  Preferred Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="storefront-date"
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlot(null);
                    }}
                    className="w-full rounded-md border border-neutral-300 pl-10 pr-3 py-2.5 text-sm font-mono text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-neutral-500">
                  Times shown in {timezone}
                </p>
              </div>

              {/* Available Time Slots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700">Available Times</span>
                  {slots && (
                    <span className="text-xs text-neutral-500 font-mono tabular-nums">
                      {slots.length} open
                    </span>
                  )}
                </div>

                {slotsLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <div
                        key={n}
                        className="h-12 rounded-md bg-neutral-100 animate-pulse border border-neutral-200"
                      />
                    ))}
                  </div>
                ) : slotsError ? (
                  <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{(slotsError as Error).message}</span>
                  </div>
                ) : !slots || slots.length === 0 ? (
                  <div className="p-6 rounded-md bg-neutral-50 border border-neutral-200 text-center space-y-1">
                    <Clock className="w-5 h-5 text-neutral-400 mx-auto" />
                    <p className="text-sm font-medium text-neutral-800">No slots open on this day</p>
                    <p className="text-xs text-neutral-500">
                      Try choosing another date or selecting any available specialist.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {slots.map((slot) => {
                      const wall = utcToWallClock(slot.starts_at, timezone);
                      const isSelected =
                        selectedSlot?.starts_at === slot.starts_at &&
                        selectedSlot?.resource_id === slot.resource_id;
                      const res = resourceMap.get(slot.resource_id);

                      return (
                        <button
                          key={`${slot.resource_id}-${slot.starts_at}`}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          style={
                            isSelected
                              ? { backgroundColor: brandColor, borderColor: brandColor }
                              : undefined
                          }
                          className={`p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'text-white shadow-sm'
                              : 'bg-white border-neutral-200 text-neutral-900 hover:border-neutral-400'
                          }`}
                        >
                          <div className="font-mono text-sm font-semibold tabular-nums">
                            {wall.displayTime}
                          </div>
                          <div
                            className={`text-[11px] truncate ${
                              isSelected ? 'text-white/80' : 'text-neutral-500'
                            }`}
                          >
                            {res?.name ?? 'Specialist'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'details' && selectedSlot && (
            <form id="storefront-checkout-form" onSubmit={handleConfirmBooking} className="space-y-5">
              {/* Selected Summary */}
              <div className="p-4 rounded-md bg-neutral-50 border border-neutral-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Selected Appointment</span>
                  <button
                    type="button"
                    onClick={() => setStep('slot')}
                    className="text-neutral-900 font-medium hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                <div className="text-sm font-semibold text-neutral-900">
                  {utcToWallClock(selectedSlot.starts_at, timezone).displayDate} at{' '}
                  {utcToWallClock(selectedSlot.starts_at, timezone).displayTime}
                </div>
                <div className="text-xs text-neutral-600 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{resourceMap.get(selectedSlot.resource_id)?.name ?? 'Specialist'}</span>
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="guest-name" className="block text-xs font-semibold text-neutral-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Amaka Okafor"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="guest-email" className="block text-xs font-semibold text-neutral-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    id="guest-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="amaka@example.com"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="guest-phone" className="block text-xs font-semibold text-neutral-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="guest-phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="guest-notes" className="block text-xs font-semibold text-neutral-700 mb-1">
                    Preferences or Consultation Notes
                  </label>
                  <textarea
                    id="guest-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional clinical context or room preferences"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Summary */}
              <div className="p-4 rounded-md border border-neutral-200 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Service Fee</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(service.price_minor, service.currency)}
                  </span>
                </div>
                {settings.enable_online_payments ? (
                  <>
                    <div className="flex justify-between font-semibold text-neutral-900 pt-2 border-t border-neutral-100">
                      <span>
                        {depositActive
                          ? `Reservation Deposit (${depositPct}%)`
                          : 'Amount Held at Reservation'}
                      </span>
                      <span className="font-mono tabular-nums text-sm">
                        {formatCurrency(dueNowMinor, service.currency)}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Slots are held exclusively for {settings.hold_minutes} minutes while payment is completed.
                    </p>
                  </>
                ) : (
                  <div className="flex justify-between font-semibold text-neutral-900 pt-2 border-t border-neutral-100">
                    <span>Payment Method</span>
                    <span>Pay at Venue</span>
                  </div>
                )}
              </div>

              {/* Policy Acknowledgement */}
              <label className="flex items-start gap-2.5 text-xs text-neutral-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedPolicy}
                  onChange={(e) => setAcceptedPolicy(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span>
                  I accept the cancellation terms:{' '}
                  <span className="text-neutral-800">
                    {settings.cancellation_policy ||
                      `Cancellations require at least ${settings.cancellation_window_hours} hours notice.`}
                  </span>
                </span>
              </label>
            </form>
          )}

          {step === 'confirmed' && confirmation && (
            <div className="space-y-6">
              <div className="p-5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {confirmation.status === 'pending'
                      ? 'Slot Reserved — Awaiting Payment'
                      : 'Appointment Confirmed'}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  {confirmation.status === 'pending'
                    ? `Your slot is temporarily held for ${settings.hold_minutes} minutes. Complete payment at check-in or via your payment link to finalize.`
                    : `Your appointment with ${settings.business_name} is confirmed. Keep your booking reference below to manage or cancel your visit.`}
                </p>

                <div className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-md">
                  <div>
                    <div className="text-[11px] text-neutral-500">Booking Reference</div>
                    <div className="font-mono text-base font-bold text-neutral-900 tracking-wide">
                      #{confirmation.reference}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="px-3 py-1.5 rounded border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedRef ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-xs border-t border-neutral-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Treatment</span>
                  <span className="font-medium text-neutral-900">{confirmation.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Specialist</span>
                  <span className="font-medium text-neutral-900">{confirmation.resource_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Date & Time</span>
                  <span className="font-mono font-medium text-neutral-900">
                    {utcToWallClock(confirmation.starts_at, timezone).displayDate} ·{' '}
                    {utcToWallClock(confirmation.starts_at, timezone).displayTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Fee</span>
                  <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                    {formatCurrency(confirmation.price_minor, confirmation.currency)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  downloadBookingIcs({
                    reference: confirmation.reference,
                    serviceName: confirmation.service_name,
                    resourceName: confirmation.resource_name,
                    businessName: settings.business_name,
                    address: settings.address,
                    startsAt: confirmation.starts_at,
                    endsAt: confirmation.ends_at,
                  })
                }
                className="w-full py-2.5 px-4 rounded-md border border-neutral-300 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Add to Calendar (.ics)</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
          {step === 'slot' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSlot}
                onClick={() => setStep('details')}
                style={{ backgroundColor: selectedSlot ? brandColor : undefined }}
                className="px-5 py-2.5 rounded-md bg-neutral-900 text-white text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-2 cursor-pointer transition-opacity"
              >
                <span>Continue to Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'details' && (
            <>
              <button
                type="button"
                onClick={() => setStep('slot')}
                className="px-4 py-2.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                form="storefront-checkout-form"
                disabled={createBookingMutation.isPending}
                style={{ backgroundColor: brandColor }}
                className="px-5 py-2.5 rounded-md text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
              >
                {createBookingMutation.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Reserving...</span>
                  </>
                ) : (
                  <span>
                    {settings.enable_online_payments ? 'Reserve Slot' : 'Confirm Appointment'}
                  </span>
                )}
              </button>
            </>
          )}

          {step === 'confirmed' && (
            <button
              type="button"
              onClick={onClose}
              style={{ backgroundColor: brandColor }}
              className="w-full py-2.5 px-4 rounded-md text-white text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
