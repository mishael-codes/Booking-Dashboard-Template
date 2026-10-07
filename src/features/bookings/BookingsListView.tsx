import React, { useState } from 'react';
import {
  useBookingsList,
  type BookingListItem,
  type BookingFilters,
} from '../../api/bookings';
import { useServicesList } from '../../api/services';
import { useResourcesList } from '../../api/resources';
import { useRealtimeSync } from '../../api/realtime';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { DataTable, type Column } from '../../components/DataTable';
import { DateRangePicker, type DateRange } from '../../components/DateRangePicker';
import { StatusBadge } from '../../components/StatusBadge';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import { CreateBookingModal } from './CreateBookingModal';
import { formatCurrency } from '../../lib/money';
import {
  getMonthBoundsUtc,
  utcToWallClock,
  DEFAULT_TIMEZONE,
} from '../../lib/time';
import type { BookingStatus } from '../../types/database';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

const STATUS_OPTIONS: { label: string; value: BookingStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'No Show', value: 'no_show' },
  { label: 'Expired', value: 'expired' },
];

export function BookingsListView() {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;

  // Realtime subscription
  useRealtimeSync();

  // Bounded date range (default this month)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const bounds = getMonthBoundsUtc(new Date(), timezone);
    return {
      fromUtc: bounds.startUtc,
      toUtc: bounds.endUtc,
      label: 'This Month',
    };
  });

  const [page, setPage] = useState(1);
  const [selectedStatuses, setSelectedStatuses] = useState<BookingStatus[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [searchRef, setSearchRef] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const [sortBy, setSortBy] = useState<'starts_at' | 'created_at' | 'price_minor'>('starts_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals & Drawers
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Reference lists
  const { data: services } = useServicesList();
  const { data: resources } = useResourcesList();

  const filters: BookingFilters = {
    page,
    pageSize: 25,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    fromUtc: searchRef.trim() ? undefined : dateRange.fromUtc,
    toUtc: searchRef.trim() ? undefined : dateRange.toUtc,
    serviceId: selectedServiceId || undefined,
    resourceId: selectedResourceId || undefined,
    searchReference: searchRef.trim() || undefined,
    searchContact: searchContact.trim() || undefined,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, error, refetch } = useBookingsList(filters);

  const toggleStatus = (st: BookingStatus) => {
    setPage(1);
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const handleResetFilters = () => {
    const bounds = getMonthBoundsUtc(new Date(), timezone);
    setDateRange({ fromUtc: bounds.startUtc, toUtc: bounds.endUtc, label: 'This Month' });
    setSelectedStatuses([]);
    setSelectedServiceId('');
    setSelectedResourceId('');
    setSearchRef('');
    setSearchContact('');
    setPage(1);
  };

  const handleSortChange = (colKey: string) => {
    if (colKey === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(colKey as 'starts_at' | 'created_at' | 'price_minor');
      setSortOrder('desc');
    }
  };

  const columns: Column<BookingListItem>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="font-mono font-medium text-neutral-900 select-all">
          #{row.reference}
        </span>
      ),
    },
    {
      key: 'starts_at',
      header: 'Scheduled Slot',
      sortable: true,
      render: (row) => {
        const wall = utcToWallClock(row.starts_at, timezone);
        const wallEnd = utcToWallClock(row.ends_at, timezone);
        return (
          <div>
            <div className="font-mono text-xs text-neutral-900">{wall.displayDate}</div>
            <div className="font-mono text-[11px] text-neutral-500">
              {wall.displayTime} – {wallEnd.displayTime}
            </div>
          </div>
        );
      },
    },
    {
      key: 'contact_name',
      header: 'Customer',
      render: (row) => (
        <span className="font-medium text-neutral-800">{row.contact_name}</span>
      ),
    },
    {
      key: 'service_name',
      header: 'Service',
      render: (row) => (
        <span className="text-neutral-700">{row.service_name}</span>
      ),
    },
    {
      key: 'resource_name',
      header: 'Resource',
      render: (row) => (
        <span className="text-neutral-700">{row.resource_name}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'price_minor',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-medium text-neutral-900">
          {formatCurrency(row.price_minor, row.currency)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Bookings</h1>
          <p className="text-xs text-neutral-500">
            Search, manage status transitions, and schedule appointment bookings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 border border-neutral-300 rounded bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
            title="Refresh list"
            aria-label="Refresh bookings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date range picker */}
          <DateRangePicker
            value={dateRange}
            onChange={(r) => {
              setDateRange(r);
              setPage(1);
            }}
            timezone={timezone}
          />

          {/* Reference search (instant indexed) */}
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Exact Reference (e.g. 8K2M9N)..."
                value={searchRef}
                onChange={(e) => {
                  setSearchRef(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Secondary filters: Services, Resources, Free text search, Reset */}
        <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center gap-2 text-xs">
          {/* Status buttons */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-neutral-400 mr-1">Status:</span>
            {STATUS_OPTIONS.map((st) => {
              const active = selectedStatuses.includes(st.value);
              return (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => toggleStatus(st.value)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    active
                      ? 'bg-neutral-900 text-white font-medium'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-neutral-200 mx-1 hidden sm:block" />

          {/* Service filter */}
          <select
            value={selectedServiceId}
            onChange={(e) => {
              setSelectedServiceId(e.target.value);
              setPage(1);
            }}
            className="p-1.5 border border-neutral-300 rounded bg-white text-neutral-700"
          >
            <option value="">All Services</option>
            {services?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Resource filter */}
          <select
            value={selectedResourceId}
            onChange={(e) => {
              setSelectedResourceId(e.target.value);
              setPage(1);
            }}
            className="p-1.5 border border-neutral-300 rounded bg-white text-neutral-700"
          >
            <option value="">All Resources</option>
            {resources?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Contact text search */}
          <input
            type="text"
            placeholder="Search contact..."
            value={searchContact}
            onChange={(e) => {
              setSearchContact(e.target.value);
              setPage(1);
            }}
            className="p-1.5 border border-neutral-300 rounded text-neutral-700 max-w-[140px]"
          />

          <button
            type="button"
            onClick={handleResetFilters}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-100 ml-auto inline-flex items-center gap-1"
            title="Reset all filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[11px]">Reset</span>
          </button>
        </div>
      </div>

      {/* Bookings DataTable */}
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
        sortColumn={sortBy}
        sortDirection={sortOrder}
        onSortChange={handleSortChange}
        onRowClick={(row) => setSelectedBookingId(row.id)}
        keyExtractor={(row) => row.id}
        emptyTitle="No bookings found"
        emptyDescription="No bookings match the selected date window and filter conditions."
        emptyAction={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 rounded bg-neutral-900 text-white text-xs font-medium"
          >
            Create Walk-In Booking
          </button>
        }
      />

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
      />

      {/* Create Booking Modal */}
      <CreateBookingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
