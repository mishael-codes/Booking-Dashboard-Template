import React, { useState } from 'react';
import { useAvailableSlots } from '../../api/slots';
import { useRescheduleBooking, type BookingDetail } from '../../api/bookings';
import { useResourcesList } from '../../api/resources';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { useToast } from '../../components/Toast';
import { formatInTimezone, utcToWallClock, DEFAULT_TIMEZONE } from '../../lib/time';
import { Calendar, Clock, AlertCircle, X } from 'lucide-react';
import { addMinutes, parseISO } from 'date-fns';

interface RescheduleModalProps {
  booking: BookingDetail;
  isOpen: boolean;
  onClose: () => void;
}

export function RescheduleModal({ booking, isOpen, onClose }: RescheduleModalProps) {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const { showSuccess, showError } = useToast();

  const [selectedDate, setSelectedDate] = useState(() =>
    formatInTimezone(booking.starts_at, 'yyyy-MM-dd', timezone)
  );
  const [selectedResourceId, setSelectedResourceId] = useState<string>(booking.resource_id);
  const [selectedSlot, setSelectedSlot] = useState<{
    resource_id: string;
    starts_at: string;
    ends_at: string;
  } | null>(null);

  const { data: resources } = useResourcesList(true);
  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(
    booking.service_id,
    selectedDate,
    selectedResourceId || null
  );

  const rescheduleMutation = useRescheduleBooking();

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedSlot) return;

    try {
      // If slots RPC returns ends_at, use it; otherwise compute from service_duration
      const endsAt =
        selectedSlot.ends_at ||
        addMinutes(parseISO(selectedSlot.starts_at), booking.service_duration).toISOString();

      await rescheduleMutation.mutateAsync({
        id: booking.id,
        resourceId: selectedSlot.resource_id,
        startsAt: selectedSlot.starts_at,
        endsAt,
        loadedUpdatedAt: booking.updated_at,
      });

      showSuccess('Booking rescheduled successfully.');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reschedule booking.';
      showError(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3 id="reschedule-modal-title" className="text-base font-semibold text-neutral-900">
              Reschedule Booking #{booking.reference}
            </h3>
            <p className="text-xs text-neutral-500">
              Select an available slot validated by business availability rules and exclusions.
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

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Service & Current Schedule info */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Service:</span>
              <span className="font-semibold text-neutral-800">{booking.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Duration:</span>
              <span className="font-medium text-neutral-800">{booking.service_duration} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Current Slot:</span>
              <span className="font-mono text-neutral-800">
                {utcToWallClock(booking.starts_at, timezone).displayDateTime} ({timezone})
              </span>
            </div>
          </div>

          {/* Date and Resource Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reschedule-date" className="block text-xs font-semibold text-neutral-700 mb-1">
                Target Date ({timezone})
              </label>
              <div className="relative">
                <input
                  id="reschedule-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reschedule-resource" className="block text-xs font-semibold text-neutral-700 mb-1">
                Filter by Resource
              </label>
              <select
                id="reschedule-resource"
                value={selectedResourceId}
                onChange={(e) => {
                  setSelectedResourceId(e.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white"
              >
                <option value="">Any eligible resource</option>
                {resources?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.kind})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Slots picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center justify-between">
              <span>Available Validated Slots</span>
              <span className="text-[11px] text-neutral-400 font-normal">
                RPC: get_available_slots
              </span>
            </label>

            {slotsLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
                <span className="text-xs text-neutral-400">Checking slot availability...</span>
              </div>
            ) : !slots || slots.length === 0 ? (
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded text-center">
                <AlertCircle className="w-5 h-5 text-neutral-400 mx-auto mb-1" />
                <p className="text-xs text-neutral-600 font-medium">No available slots found</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Try selecting a different date or choosing another resource.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {slots.map((s, idx) => {
                  const wall = utcToWallClock(s.starts_at, timezone);
                  const isSelected =
                    selectedSlot?.starts_at === s.starts_at &&
                    selectedSlot?.resource_id === s.resource_id;

                  const resName =
                    resources?.find((r) => r.id === s.resource_id)?.name ?? 'Resource';

                  return (
                    <button
                      key={`${s.starts_at}-${s.resource_id}-${idx}`}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
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
                      <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {resName}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={rescheduleMutation.isPending}
            className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || rescheduleMutation.isPending}
            className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {rescheduleMutation.isPending && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            <span>Confirm Reschedule</span>
          </button>
        </div>
      </div>
    </div>
  );
}
