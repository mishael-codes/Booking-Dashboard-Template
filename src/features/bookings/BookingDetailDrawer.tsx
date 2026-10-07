import React, { useState } from 'react';
import {
  useBookingDetail,
  useUpdateBookingStatus,
  useUpdateBookingContact,
  useBookingNotes,
  useUpsertBookingNotes,
  useBookingPayments,
  useBookingAuditHistory,
} from '../../api/bookings';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { useToast } from '../../components/Toast';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { RescheduleModal } from './RescheduleModal';
import { formatCurrency } from '../../lib/money';
import { utcToWallClock, formatInTimezone, DEFAULT_TIMEZONE } from '../../lib/time';
import type { BookingStatus } from '../../types/database';
import {
  X,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  FileText,
  CreditCard,
  History,
  CheckCircle,
  Ban,
  CheckCheck,
  UserX,
  Edit2,
  Save,
  MessageSquare,
} from 'lucide-react';

interface BookingDetailDrawerProps {
  bookingId: string | null;
  onClose: () => void;
}

export function BookingDetailDrawer({ bookingId, onClose }: BookingDetailDrawerProps) {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const { showSuccess, showError } = useToast();

  const { data: booking, isLoading, error } = useBookingDetail(bookingId ?? '');
  const { data: internalNote } = useBookingNotes(bookingId ?? '');
  const { data: payments } = useBookingPayments(bookingId ?? '');
  const { data: auditLogs } = useBookingAuditHistory(bookingId ?? '');

  const updateStatusMutation = useUpdateBookingStatus();
  const updateContactMutation = useUpdateBookingContact();
  const upsertNotesMutation = useUpsertBookingNotes();

  // Modals & form state
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Editing contact mode
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Internal note editing
  const [adminNoteText, setAdminNoteText] = useState('');
  const [isEditingAdminNote, setIsEditingAdminNote] = useState(false);

  if (!bookingId) return null;

  const handleOpenEditContact = () => {
    if (!booking) return;
    setContactName(booking.contact_name);
    setContactEmail(booking.contact_email);
    setContactPhone(booking.contact_phone || '');
    setCustomerNotes(booking.notes || '');
    setIsEditingContact(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    try {
      await updateContactMutation.mutateAsync({
        id: booking.id,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || null,
        notes: customerNotes.trim() || null,
        loadedUpdatedAt: booking.updated_at,
      });
      showSuccess('Customer details updated.');
      setIsEditingContact(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update contact info.';
      showError(msg);
    }
  };

  const handleStatusTransition = async (newStatus: BookingStatus) => {
    if (!booking) return;

    if (newStatus === 'cancelled') {
      setCancelConfirmOpen(true);
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: booking.id,
        status: newStatus,
        loadedUpdatedAt: booking.updated_at,
      });
      showSuccess(`Booking marked as ${newStatus}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update booking status.';
      showError(msg);
    }
  };

  const handleConfirmCancel = async () => {
    if (!booking) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: booking.id,
        status: 'cancelled',
        loadedUpdatedAt: booking.updated_at,
        cancellationReason: cancelReason.trim() || undefined,
      });
      showSuccess('Booking cancelled.');
      setCancelConfirmOpen(false);
      setCancelReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel booking.';
      showError(msg);
    }
  };

  const handleSaveInternalNote = async () => {
    if (!booking) return;
    try {
      await upsertNotesMutation.mutateAsync({
        bookingId: booking.id,
        note: adminNoteText,
      });
      showSuccess('Internal notes saved.');
      setIsEditingAdminNote(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save notes.';
      showError(msg);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-booking-title"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex justify-end transition-opacity"
      >
        <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-neutral-200 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/75">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="drawer-booking-title" className="text-base font-bold text-neutral-900 font-mono">
                    #{booking?.reference ?? '...'}
                  </h2>
                  {booking && <StatusBadge status={booking.status} />}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Timezone: <span className="font-mono">{timezone}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-neutral-400 hover:text-neutral-700"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="space-y-4 py-8">
                <div className="h-6 bg-neutral-200 rounded animate-pulse w-1/3" />
                <div className="h-20 bg-neutral-100 rounded animate-pulse" />
                <div className="h-40 bg-neutral-100 rounded animate-pulse" />
              </div>
            ) : error || !booking ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                {error?.message ?? 'Booking details could not be loaded.'}
              </div>
            ) : (
              <>
                {/* Status action buttons (Valid Transitions Only) */}
                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2">
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Permitted Status Transitions
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* pending -> confirmed | cancelled */}
                    {booking.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('confirmed')}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-700 text-white hover:bg-emerald-800 inline-flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Confirm Booking</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('cancelled')}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel Hold</span>
                        </button>
                      </>
                    )}

                    {/* confirmed -> completed | no_show | cancelled */}
                    {booking.status === 'confirmed' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('completed')}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 inline-flex items-center gap-1.5"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('no_show')}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1.5"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Mark No Show</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('cancelled')}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel Booking</span>
                        </button>
                      </>
                    )}

                    {/* Reschedule Button */}
                    {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => setIsRescheduleOpen(true)}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Reschedule Slot</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Service and Schedule card */}
                <div className="border border-neutral-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-700">Service & Resource</span>
                    <span className="font-mono text-sm font-semibold text-neutral-900">
                      {formatCurrency(booking.price_minor, booking.currency)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-neutral-400 block">Service</span>
                      <span className="font-medium text-neutral-800">
                        {booking.service_name} ({booking.service_duration}m)
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Assigned Resource</span>
                      <span className="font-medium text-neutral-800">{booking.resource_name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-neutral-400 block">Scheduled Time ({timezone})</span>
                      <span className="font-mono font-medium text-neutral-800">
                        {utcToWallClock(booking.starts_at, timezone).displayDateTime} –{' '}
                        {utcToWallClock(booking.ends_at, timezone).displayTime}
                      </span>
                    </div>
                    {booking.hold_expires_at && (
                      <div className="col-span-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
                        Hold expires at:{' '}
                        <span className="font-mono font-semibold">
                          {utcToWallClock(booking.hold_expires_at, timezone).displayDateTime}
                        </span>
                      </div>
                    )}
                    {booking.cancelled_at && (
                      <div className="col-span-2 p-2 bg-neutral-100 border border-neutral-200 rounded text-neutral-700 text-[11px] space-y-1">
                        <div>
                          Cancelled on:{' '}
                          <span className="font-mono">
                            {utcToWallClock(booking.cancelled_at, timezone).displayDateTime}
                          </span>
                        </div>
                        {booking.cancellation_reason && (
                          <div>
                            Reason: <span className="italic">{booking.cancellation_reason}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Contact Details */}
                <div className="border border-neutral-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-700">Contact Details</span>
                    {!isEditingContact && (
                      <button
                        type="button"
                        onClick={handleOpenEditContact}
                        className="text-xs text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {isEditingContact ? (
                    <form onSubmit={handleSaveContact} className="space-y-3 pt-2">
                      <div>
                        <label htmlFor="drawer-contact-name" className="block text-[11px] text-neutral-600 mb-0.5">Name</label>
                        <input
                          id="drawer-contact-name"
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="drawer-contact-email" className="block text-[11px] text-neutral-600 mb-0.5">Email (Required)</label>
                        <input
                          id="drawer-contact-email"
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="drawer-contact-phone" className="block text-[11px] text-neutral-600 mb-0.5">Phone</label>
                        <input
                          id="drawer-contact-phone"
                          type="text"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="drawer-customer-notes" className="block text-[11px] text-neutral-600 mb-0.5">Customer Notes</label>
                        <textarea
                          id="drawer-customer-notes"
                          rows={2}
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingContact(false)}
                          className="px-2.5 py-1 text-xs text-neutral-600 hover:text-neutral-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={updateContactMutation.isPending}
                          className="px-3 py-1 text-xs bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-neutral-800">
                        <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="font-medium">{booking.contact_name}</span>
                        {booking.customer_id === null && (
                          <span className="text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                            Walk-in / Guest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{booking.contact_email}</span>
                      </div>
                      {booking.contact_phone && (
                        <div className="flex items-center gap-2 text-neutral-600">
                          <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{booking.contact_phone}</span>
                        </div>
                      )}
                      {booking.notes && (
                        <div className="pt-2 border-t border-neutral-100 text-neutral-600">
                          <span className="text-[11px] text-neutral-400 block">Customer note:</span>
                          <p className="mt-0.5 italic">{booking.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Internal Admin Notes (booking_notes) */}
                <div className="border border-neutral-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                      <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Internal Admin Notes</span>
                    </div>
                    {!isEditingAdminNote && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdminNoteText(internalNote?.note ?? '');
                          setIsEditingAdminNote(true);
                        }}
                        className="text-xs text-neutral-600 hover:text-neutral-900"
                      >
                        {internalNote?.note ? 'Edit' : 'Add Note'}
                      </button>
                    )}
                  </div>

                  {isEditingAdminNote ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={3}
                        maxLength={4000}
                        placeholder="Private notes visible only to administrators..."
                        value={adminNoteText}
                        onChange={(e) => setAdminNoteText(e.target.value)}
                        className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingAdminNote(false)}
                          className="px-2.5 py-1 text-xs text-neutral-600 hover:text-neutral-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveInternalNote}
                          disabled={upsertNotesMutation.isPending}
                          className="px-3 py-1 text-xs bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
                        >
                          Save Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-700 leading-relaxed italic bg-neutral-50 p-2.5 rounded border border-neutral-200">
                      {internalNote?.note || 'No internal notes recorded yet.'}
                    </p>
                  )}
                </div>

                {/* Related Payments */}
                <div className="border border-neutral-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                    <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Payment Records ({payments?.length ?? 0})</span>
                  </div>

                  {!payments || payments.length === 0 ? (
                    <p className="text-xs text-neutral-500">No payment records found for this booking.</p>
                  ) : (
                    <div className="divide-y divide-neutral-200 text-xs">
                      {payments.map((p) => (
                        <div key={p.id} className="py-2 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-neutral-800">{p.provider}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              {p.provider_reference}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-semibold text-neutral-900">
                              {formatCurrency(p.amount_minor, p.currency)}
                            </div>
                            <StatusBadge status={p.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Read-Only Audit History */}
                <div className="border border-neutral-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                    <History className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Audit Log History</span>
                  </div>

                  {!auditLogs || auditLogs.length === 0 ? (
                    <p className="text-xs text-neutral-500">No audit events recorded for this booking.</p>
                  ) : (
                    <div className="divide-y divide-neutral-200 text-xs max-h-48 overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="py-2 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-neutral-700">{log.action}</span>
                            <span className="text-neutral-400 font-mono">
                              {formatInTimezone(log.created_at, 'MMM d, HH:mm', timezone)}
                            </span>
                          </div>
                          {log.new_data && log.old_data && (
                            <div className="text-[10px] text-neutral-500 font-mono bg-neutral-50 p-1.5 rounded">
                              {Object.keys(log.new_data as Record<string, unknown>)
                                .filter(
                                  (k) =>
                                    (log.new_data as Record<string, unknown>)[k] !==
                                    (log.old_data as Record<string, unknown>)[k]
                                )
                                .map((k) => (
                                  <div key={k}>
                                    {k}: {String((log.old_data as Record<string, unknown>)[k])} →{' '}
                                    {String((log.new_data as Record<string, unknown>)[k])}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {booking && (
        <RescheduleModal
          booking={booking}
          isOpen={isRescheduleOpen}
          onClose={() => setIsRescheduleOpen(false)}
        />
      )}

      {/* Cancellation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        title="Cancel This Booking?"
        description="Cancelling this booking will mark it as cancelled, set cancelled_at, and free up the resource's time slot for other customers."
        confirmLabel="Yes, Cancel Booking"
        variant="danger"
        isLoading={updateStatusMutation.isPending}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setCancelConfirmOpen(false);
          setCancelReason('');
        }}
      />
    </>
  );
}
