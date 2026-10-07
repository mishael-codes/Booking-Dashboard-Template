import React, { useState } from 'react';
import { useRecordManualPayment } from '../../api/payments';
import { useBookingsList, type BookingListItem } from '../../api/bookings';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { useToast } from '../../components/Toast';
import { MoneyInput } from '../../components/MoneyInput';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { parseMajorToMinor, formatMinorToMajorString, formatCurrency } from '../../lib/money';
import { X, CreditCard, Search, AlertCircle, CheckCircle } from 'lucide-react';

interface RecordManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBooking?: {
    id: string;
    reference: string;
    priceMinor: number;
    currency: string;
    contactName: string;
    status: string;
    updatedAt: string;
  };
}

export function RecordManualPaymentModal({
  isOpen,
  onClose,
  defaultBooking,
}: RecordManualPaymentModalProps) {
  const { settings } = useBusinessSettings();
  const { showSuccess, showError } = useToast();

  const [bookingRefSearch, setBookingRefSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<{
    id: string;
    reference: string;
    priceMinor: number;
    currency: string;
    contactName: string;
    status: string;
    updatedAt: string;
  } | null>(defaultBooking ?? null);

  const [amountMajor, setAmountMajor] = useState(
    defaultBooking ? formatMinorToMajorString(defaultBooking.priceMinor) : '0.00'
  );
  const [currency, setCurrency] = useState(defaultBooking?.currency ?? settings.currency ?? 'NGN');
  const [confirmPending, setConfirmPending] = useState(true);

  // Confirmation dialog before recording money
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { data: searchResults, isLoading: searchLoading } = useBookingsList({
    page: 1,
    pageSize: 10,
    searchReference: bookingRefSearch.trim() || undefined,
  });

  const recordPaymentMutation = useRecordManualPayment();

  if (!isOpen) return null;

  const handleSelectBooking = (b: BookingListItem) => {
    setSelectedBooking({
      id: b.id,
      reference: b.reference,
      priceMinor: b.price_minor,
      currency: b.currency,
      contactName: b.contact_name,
      status: b.status,
      updatedAt: b.updated_at,
    });
    setAmountMajor(formatMinorToMajorString(b.price_minor));
    setCurrency(b.currency);
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setConfirmDialogOpen(true);
  };

  const handleExecutePayment = async () => {
    if (!selectedBooking) return;
    const amountMinor = parseMajorToMinor(amountMajor);

    if (amountMinor <= 0) {
      showError('Payment amount must be greater than zero.');
      setConfirmDialogOpen(false);
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        bookingId: selectedBooking.id,
        amountMinor,
        currency,
        confirmPendingBooking: confirmPending && selectedBooking.status === 'pending',
        bookingUpdatedAt: selectedBooking.updatedAt,
      });

      showSuccess(`Manual payment of ${formatCurrency(amountMinor, currency)} recorded successfully.`);
      setConfirmDialogOpen(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment.';
      showError(msg);
      setConfirmDialogOpen(false);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-payment-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      >
        <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/75">
            <div>
              <h3 id="record-payment-title" className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-neutral-700" />
                <span>Record Manual Payment</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Log offline cash, bank transfer, or POS transaction directly against a booking.
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

          <form onSubmit={handleOpenConfirm} className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* Booking selection */}
            {!defaultBooking && (
              <div className="space-y-2">
                <label htmlFor="payment-booking-ref-search" className="block text-xs font-semibold text-neutral-700">
                  Target Booking *
                </label>
                <div className="relative">
                  <input
                    id="payment-booking-ref-search"
                    type="text"
                    placeholder="Search by 8-char reference code (e.g. 7K2M9N)..."
                    value={bookingRefSearch}
                    onChange={(e) => setBookingRefSearch(e.target.value)}
                    className="w-full text-xs font-mono p-2 pl-8 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                </div>

                {bookingRefSearch.trim() && searchResults?.items && (
                  <div className="border border-neutral-200 rounded divide-y divide-neutral-100 max-h-36 overflow-y-auto">
                    {searchResults.items.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBooking(b)}
                        className={`p-2 text-xs flex items-center justify-between cursor-pointer hover:bg-neutral-50 ${
                          selectedBooking?.id === b.id ? 'bg-neutral-100 font-semibold' : ''
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-mono">#{b.reference}</span>
                          <span className="text-neutral-500 ml-2">{b.contact_name}</span>
                        </div>
                        <div className="font-mono">{formatCurrency(b.price_minor, b.currency)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Booking Info */}
            {selectedBooking && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Booking:</span>
                  <span className="font-mono font-semibold text-neutral-900">
                    #{selectedBooking.reference} ({selectedBooking.contactName})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Current Status:</span>
                  <span className="capitalize font-medium text-neutral-800">
                    {selectedBooking.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Booking Total:</span>
                  <span className="font-mono font-medium text-neutral-900">
                    {formatCurrency(selectedBooking.priceMinor, selectedBooking.currency)}
                  </span>
                </div>
              </div>
            )}

            {/* Amount input */}
            <div>
              <label htmlFor="manual-payment-amount" className="block text-xs font-semibold text-neutral-700 mb-1">
                Amount Received ({currency}) *
              </label>
              <MoneyInput
                id="manual-payment-amount"
                value={amountMajor}
                onChange={setAmountMajor}
                currency={currency}
              />
            </div>

            {/* Confirm pending booking toggle */}
            {selectedBooking?.status === 'pending' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-start gap-2.5">
                <input
                  id="confirm-pending-toggle"
                  type="checkbox"
                  checked={confirmPending}
                  onChange={(e) => setConfirmPending(e.target.checked)}
                  className="rounded border-emerald-400 text-emerald-800 focus:ring-emerald-800 mt-0.5"
                />
                <label htmlFor="confirm-pending-toggle" className="text-xs text-emerald-950">
                  <span className="font-semibold block">Confirm Pending Booking</span>
                  Mark the booking as <span className="font-mono font-bold">confirmed</span> and clear its hold expiration upon recording this payment.
                </label>
              </div>
            )}

            <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-100">
              Provider recorded as <code className="font-mono">manual</code> with unique reference{' '}
              <code className="font-mono">manual-&lt;uuid&gt;</code>.
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedBooking || parseMajorToMinor(amountMajor) <= 0}
                className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50"
              >
                Record Payment
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title="Confirm Payment Recording"
        description={`Record a manual payment of ${formatCurrency(
          parseMajorToMinor(amountMajor),
          currency
        )} for booking #${selectedBooking?.reference}? ${
          confirmPending && selectedBooking?.status === 'pending'
            ? 'This will also confirm the booking.'
            : ''
        }`}
        confirmLabel="Yes, Record Payment"
        variant="primary"
        isLoading={recordPaymentMutation.isPending}
        onConfirm={handleExecutePayment}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </>
  );
}
