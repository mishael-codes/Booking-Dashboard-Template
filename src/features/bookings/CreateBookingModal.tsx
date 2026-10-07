import React, { useState } from 'react';
import { useServicesList } from '../../api/services';
import { useResourcesList } from '../../api/resources';
import { useAvailableSlots } from '../../api/slots';
import { useCreateWalkInBooking } from '../../api/bookings';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { useToast } from '../../components/Toast';
import { MoneyInput } from '../../components/MoneyInput';
import { parseMajorToMinor, formatMinorToMajorString } from '../../lib/money';
import {
  utcToWallClock,
  getTodayDateString,
  DEFAULT_TIMEZONE,
} from '../../lib/time';
import { addMinutes, parseISO } from 'date-fns';
import { Calendar, Clock, AlertTriangle, X, Plus } from 'lucide-react';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBookingModal({ isOpen, onClose }: CreateBookingModalProps) {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const { showSuccess, showError } = useToast();

  const { data: services, isLoading: servicesLoading } = useServicesList(true);
  const { data: resources } = useResourcesList(true);

  // Form states
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString(timezone));
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{
    resource_id: string;
    starts_at: string;
    ends_at: string;
  } | null>(null);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Price override
  const [priceMajor, setPriceMajor] = useState('');
  const [originalPriceMajor, setOriginalPriceMajor] = useState('');
  const [currency, setCurrency] = useState(settings.currency || 'NGN');

  const selectedService = services?.find((s) => s.id === selectedServiceId);

  // When service changes, update price and reset slot
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedSlot(null);
    const svc = services?.find((s) => s.id === serviceId);
    if (svc) {
      const major = formatMinorToMajorString(svc.price_minor);
      setPriceMajor(major);
      setOriginalPriceMajor(major);
      setCurrency(svc.currency);
    }
  };

  const { data: availableSlots, isLoading: slotsLoading } = useAvailableSlots(
    selectedServiceId,
    selectedDate,
    selectedResourceId || null
  );

  const createBookingMutation = useCreateWalkInBooking();

  if (!isOpen) return null;

  const isPriceModified = priceMajor !== originalPriceMajor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) return;

    try {
      const endsAt =
        selectedSlot.ends_at ||
        addMinutes(
          parseISO(selectedSlot.starts_at),
          selectedService.duration_minutes
        ).toISOString();

      const priceMinor = parseMajorToMinor(priceMajor);

      await createBookingMutation.mutateAsync({
        serviceId: selectedService.id,
        resourceId: selectedSlot.resource_id,
        startsAt: selectedSlot.starts_at,
        endsAt,
        priceMinor,
        currency,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || null,
        notes: customerNotes.trim() || null,
      });

      showSuccess('Walk-in booking created successfully.');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create booking.';
      showError(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-booking-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-2xl bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/75">
          <div>
            <h3 id="create-booking-title" className="text-base font-semibold text-neutral-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-neutral-700" />
              <span>Create Walk-In / Phone Booking</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Slots are computed via <code className="font-mono">get_available_slots</code> in {timezone}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Service selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal-service-select" className="block text-xs font-semibold text-neutral-700 mb-1">
                Select Service *
              </label>
              <select
                id="modal-service-select"
                required
                value={selectedServiceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white"
              >
                <option value="">Choose a service...</option>
                {services?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration_minutes}m)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="modal-booking-date" className="block text-xs font-semibold text-neutral-700 mb-1">
                Booking Date ({timezone}) *
              </label>
              <input
                id="modal-booking-date"
                type="date"
                required
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Resource filter and Slot Picker */}
          {selectedServiceId && (
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-neutral-800">
                  Select Valid Slot
                </span>
                <div className="flex items-center gap-2">
                  <label htmlFor="modal-resource-filter" className="text-[11px] text-neutral-500 whitespace-nowrap">Resource:</label>
                  <select
                    id="modal-resource-filter"
                    value={selectedResourceId}
                    onChange={(e) => {
                      setSelectedResourceId(e.target.value);
                      setSelectedSlot(null);
                    }}
                    className="text-xs p-1.5 border border-neutral-300 rounded bg-white"
                  >
                    <option value="">Any eligible resource</option>
                    {resources?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {slotsLoading ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-neutral-400">
                  <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
                  <span>Checking availability rules...</span>
                </div>
              ) : !availableSlots || availableSlots.length === 0 ? (
                <div className="py-4 text-center text-xs text-neutral-500">
                  No slots available on {selectedDate}. Choose another date or resource.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                  {availableSlots.map((slot, i) => {
                    const wall = utcToWallClock(slot.starts_at, timezone);
                    const isSelected =
                      selectedSlot?.starts_at === slot.starts_at &&
                      selectedSlot?.resource_id === slot.resource_id;

                    const resName =
                      resources?.find((r) => r.id === slot.resource_id)?.name ?? 'Staff';

                    return (
                      <button
                        key={`${slot.starts_at}-${slot.resource_id}-${i}`}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2 rounded text-left border text-xs transition-colors ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                            : 'border-neutral-200 hover:border-neutral-400 bg-white text-neutral-800'
                        }`}
                      >
                        <div className="font-mono text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{wall.displayTime}</span>
                        </div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {resName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pricing with Warning if changed */}
          {selectedService && (
            <div className="border border-neutral-200 rounded-lg p-3 space-y-2">
              <label htmlFor="booking-price-override" className="block text-xs font-semibold text-neutral-700">
                Service Price ({currency})
              </label>
              <div className="max-w-xs">
                <MoneyInput
                  id="booking-price-override"
                  value={priceMajor}
                  onChange={setPriceMajor}
                  currency={currency}
                />
              </div>

              {isPriceModified && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Warning: Price has been overridden from catalogue price ({currency}{' '}
                    {originalPriceMajor}).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Customer Contact Details */}
          <div className="space-y-3 pt-2 border-t border-neutral-200">
            <div className="text-xs font-semibold text-neutral-800">Customer Information</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="modal-customer-name" className="block text-[11px] text-neutral-600 mb-1">
                  Customer Name *
                </label>
                <input
                  id="modal-customer-name"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. John Doe"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="modal-customer-email" className="block text-[11px] text-neutral-600 mb-1">
                  Contact Email * (Required by DB)
                </label>
                <input
                  id="modal-customer-email"
                  type="email"
                  required
                  maxLength={254}
                  placeholder="john@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="modal-customer-phone" className="block text-[11px] text-neutral-600 mb-1">Phone Number</label>
                <input
                  id="modal-customer-phone"
                  type="text"
                  maxLength={30}
                  placeholder="+234..."
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="modal-customer-notes" className="block text-[11px] text-neutral-600 mb-1">Booking Notes</label>
                <input
                  id="modal-customer-notes"
                  type="text"
                  maxLength={1000}
                  placeholder="Special requests or instructions"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-3 bg-neutral-50 -mx-6 -mb-6 border-t border-neutral-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={createBookingMutation.isPending}
              className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedSlot || !contactName.trim() || !contactEmail.trim() || createBookingMutation.isPending}
              className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {createBookingMutation.isPending && (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              <span>Create Booking</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
