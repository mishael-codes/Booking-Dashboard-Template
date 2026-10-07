import React, { useState } from 'react';
import { useCustomersList, type ProfileRow } from '../../api/customers';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { DataTable, type Column } from '../../components/DataTable';
import { CustomerBookingsDrawer } from './CustomerBookingsDrawer';
import { utcToWallClock, DEFAULT_TIMEZONE } from '../../lib/time';
import { Search, User, Phone, Calendar } from 'lucide-react';

export function CustomersListView() {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<ProfileRow | null>(null);

  const { data, isLoading, error, refetch } = useCustomersList(page, searchTerm);

  const columns: Column<ProfileRow>[] = [
    {
      key: 'full_name',
      header: 'Customer Name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold text-[10px]">
            {row.full_name ? row.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="font-semibold text-neutral-900">
            {row.full_name || 'Unnamed Customer'}
          </span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      render: (row) => (
        <span className="font-mono text-neutral-700">{row.phone || '—'}</span>
      ),
    },
    {
      key: 'id',
      header: 'Account UUID',
      render: (row) => (
        <span className="font-mono text-neutral-400 text-[11px] select-all truncate block max-w-[200px]">
          {row.id}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Registered',
      render: (row) => {
        const wall = utcToWallClock(row.created_at, timezone);
        return <span className="text-neutral-500 font-mono">{wall.displayDate}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Customer Profiles</h1>
          <p className="text-xs text-neutral-500">
            Registered customer profiles and their historical appointment reservations.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-3 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.customers ?? []}
        isLoading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        page={page}
        pageSize={25}
        totalCount={data?.totalCount}
        onPageChange={setPage}
        onRowClick={(row) => setSelectedCustomer(row)}
        keyExtractor={(row) => row.id}
        emptyTitle="No customer profiles found"
        emptyDescription="No registered user profiles matched your search."
      />

      {/* Customer Bookings Drawer */}
      <CustomerBookingsDrawer
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}
