import React, { useState } from 'react';
import {
  usePaymentsList,
  type PaymentListItem,
  type PaymentFilters,
} from '../../api/payments';
import { useRealtimeSync } from '../../api/realtime';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { DataTable, type Column } from '../../components/DataTable';
import { DateRangePicker, type DateRange } from '../../components/DateRangePicker';
import { StatusBadge } from '../../components/StatusBadge';
import { RecordManualPaymentModal } from './RecordManualPaymentModal';
import { BookingDetailDrawer } from '../bookings/BookingDetailDrawer';
import { formatCurrency } from '../../lib/money';
import {
  getMonthBoundsUtc,
  utcToWallClock,
  DEFAULT_TIMEZONE,
} from '../../lib/time';
import type { PaymentStatus } from '../../types/database';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

export function PaymentsListView() {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;

  useRealtimeSync();

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const bounds = getMonthBoundsUtc(new Date(), timezone);
    return {
      fromUtc: bounds.startUtc,
      toUtc: bounds.endUtc,
      label: 'This Month',
    };
  });

  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | undefined>(undefined);
  const [providerSearch, setProviderSearch] = useState('');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const filters: PaymentFilters = {
    page,
    pageSize: 25,
    status: selectedStatus,
    provider: providerSearch.trim() || undefined,
    fromUtc: dateRange.fromUtc,
    toUtc: dateRange.toUtc,
  };

  const { data, isLoading, error, refetch } = usePaymentsList(filters);

  const handleResetFilters = () => {
    const bounds = getMonthBoundsUtc(new Date(), timezone);
    setDateRange({ fromUtc: bounds.startUtc, toUtc: bounds.endUtc, label: 'This Month' });
    setSelectedStatus(undefined);
    setProviderSearch('');
    setPage(1);
  };

  const columns: Column<PaymentListItem>[] = [
    {
      key: 'created_at',
      header: 'Date & Time',
      render: (row) => {
        const wall = utcToWallClock(row.created_at, timezone);
        return (
          <div>
            <div className="font-mono text-xs text-neutral-900">{wall.displayDate}</div>
            <div className="font-mono text-[11px] text-neutral-400">{wall.displayTime}</div>
          </div>
        );
      },
    },
    {
      key: 'booking_reference',
      header: 'Booking',
      render: (row) => (
        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBookingId(row.booking_id);
            }}
            className="font-mono text-xs font-semibold text-neutral-900 hover:underline"
          >
            #{row.booking_reference}
          </button>
          <div className="text-[11px] text-neutral-500">{row.booking_contact_name}</div>
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => (
        <div>
          <span className="capitalize font-medium text-neutral-800">{row.provider}</span>
          <div className="text-[10px] font-mono text-neutral-400 truncate max-w-[160px]">
            {row.provider_reference}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'amount_minor',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-medium text-neutral-900">
          {formatCurrency(row.amount_minor, row.currency)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Payments Ledger</h1>
          <p className="text-xs text-neutral-500">
            View transaction history and record manual cash/transfer payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 border border-neutral-300 rounded bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
            title="Refresh payments"
            aria-label="Refresh payments list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsRecordModalOpen(true)}
            className="px-3.5 py-2 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Record Manual Payment</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker
          value={dateRange}
          onChange={(r) => {
            setDateRange(r);
            setPage(1);
          }}
          timezone={timezone}
        />

        <div className="flex items-center gap-2 text-xs">
          {/* Status select */}
          <select
            value={selectedStatus ?? 'all'}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedStatus(val === 'all' ? undefined : (val as PaymentStatus));
              setPage(1);
            }}
            className="p-1.5 border border-neutral-300 rounded bg-white text-neutral-700"
          >
            <option value="all">All Payment Statuses</option>
            <option value="succeeded">Succeeded</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Provider text search */}
          <input
            type="text"
            placeholder="Provider (e.g. manual)..."
            value={providerSearch}
            onChange={(e) => {
              setProviderSearch(e.target.value);
              setPage(1);
            }}
            className="p-1.5 border border-neutral-300 rounded text-neutral-700 max-w-[160px]"
          />

          <button
            type="button"
            onClick={handleResetFilters}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-100"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Payments DataTable */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        page={page}
        pageSize={25}
        totalCount={data?.totalCount}
        onPageChange={setPage}
        onRowClick={(row) => setSelectedBookingId(row.booking_id)}
        keyExtractor={(row) => row.id}
        emptyTitle="No payments recorded"
        emptyDescription="No payment transactions match the selected filters."
        emptyAction={
          <button
            type="button"
            onClick={() => setIsRecordModalOpen(true)}
            className="px-3 py-1.5 rounded bg-neutral-900 text-white text-xs font-medium"
          >
            Record First Payment
          </button>
        }
      />

      {/* Record Manual Payment Modal */}
      <RecordManualPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
      />

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
      />
    </div>
  );
}
