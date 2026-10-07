import React, { useState } from 'react';
import {
  useAuditLog,
  type AuditLogRow,
  type AuditCursor,
} from '../../api/audit';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { DateRangePicker, type DateRange } from '../../components/DateRangePicker';
import {
  getMonthBoundsUtc,
  utcToWallClock,
  DEFAULT_TIMEZONE,
} from '../../lib/time';
import {
  History,
  Filter,
  Search,
  ChevronDown,
  RotateCcw,
  ArrowRight,
  Database,
} from 'lucide-react';

const TABLES = [
  'bookings',
  'payments',
  'services',
  'resources',
  'business_settings',
  'admins',
];

export function AuditLogView() {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const bounds = getMonthBoundsUtc(new Date(), timezone);
    return {
      fromUtc: bounds.startUtc,
      toUtc: bounds.endUtc,
      label: 'This Month',
    };
  });

  const [selectedTable, setSelectedTable] = useState<string>('');
  const [recordIdSearch, setRecordIdSearch] = useState<string>('');

  // Keyset pagination: stack of cursors or accumulated items
  const [accumulatedLogs, setAccumulatedLogs] = useState<AuditLogRow[]>([]);
  const [currentCursor, setCurrentCursor] = useState<AuditCursor | null>(null);

  const { data, isLoading, error, refetch } = useAuditLog(
    currentCursor,
    selectedTable || undefined,
    recordIdSearch.trim() || undefined,
    dateRange.fromUtc,
    dateRange.toUtc
  );

  // When filters change, reset pagination
  const handleFilterChange = (table: string, recId: string, range: DateRange) => {
    setSelectedTable(table);
    setRecordIdSearch(recId);
    setDateRange(range);
    setCurrentCursor(null);
    setAccumulatedLogs([]);
  };

  const handleReset = () => {
    const bounds = getMonthBoundsUtc(new Date(), timezone);
    handleFilterChange('', '', {
      fromUtc: bounds.startUtc,
      toUtc: bounds.endUtc,
      label: 'This Month',
    });
  };

  const handleLoadMore = () => {
    if (data?.nextCursor) {
      // Append current batch to accumulated list
      setAccumulatedLogs((prev) => [...prev, ...(data.items ?? [])]);
      setCurrentCursor(data.nextCursor);
    }
  };

  // Combine accumulated and current batch
  const displayLogs = currentCursor
    ? [...accumulatedLogs, ...(data?.items ?? [])]
    : data?.items ?? [];

  const renderFieldDiff = (oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null) => {
    if (!oldData && newData) {
      return (
        <div className="text-[11px] font-mono bg-emerald-50 text-emerald-900 p-2 rounded border border-emerald-200">
          Created with initial values ({Object.keys(newData).length} fields).
        </div>
      );
    }

    if (oldData && !newData) {
      return (
        <div className="text-[11px] font-mono bg-rose-50 text-rose-900 p-2 rounded border border-rose-200">
          Record deleted.
        </div>
      );
    }

    if (!oldData || !newData) return null;

    // Show only modified keys
    const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
    const changedKeys = allKeys.filter(
      (k) => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])
    );

    if (changedKeys.length === 0) {
      return <div className="text-[11px] text-neutral-400 italic">No field differences detected.</div>;
    }

    return (
      <div className="space-y-1 bg-neutral-50 p-2.5 rounded border border-neutral-200 text-[11px] font-mono">
        {changedKeys.map((k) => (
          <div key={k} className="flex items-start gap-2 flex-wrap">
            <span className="font-semibold text-neutral-700">{k}:</span>
            <span className="text-neutral-500 bg-neutral-100 px-1 rounded line-through">
              {String(oldData[k] ?? 'null')}
            </span>
            <ArrowRight className="w-3 h-3 text-neutral-400 mt-0.5" />
            <span className="text-emerald-800 bg-emerald-50 px-1 rounded font-medium">
              {String(newData[k] ?? 'null')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">System Audit Log</h1>
          <p className="text-xs text-neutral-500">
            Immutable Postgres trigger trail on bookings, payments, catalogue, and settings.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker
          value={dateRange}
          onChange={(r) => handleFilterChange(selectedTable, recordIdSearch, r)}
          timezone={timezone}
        />

        <div className="flex items-center gap-2 text-xs">
          {/* Table select */}
          <select
            value={selectedTable}
            onChange={(e) => handleFilterChange(e.target.value, recordIdSearch, dateRange)}
            className="p-1.5 border border-neutral-300 rounded bg-white text-neutral-700 font-mono"
          >
            <option value="">All Tables</option>
            {TABLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Record ID filter */}
          <input
            type="text"
            placeholder="Record ID / UUID..."
            value={recordIdSearch}
            onChange={(e) => handleFilterChange(selectedTable, e.target.value, dateRange)}
            className="p-1.5 border border-neutral-300 rounded text-neutral-700 font-mono max-w-[160px]"
          />

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-100"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        {isLoading && displayLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-400">Loading audit log entries...</div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-rose-700">{(error as Error).message}</div>
        ) : displayLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-500">
            No audit records match the current criteria.
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 text-xs">
            {displayLogs.map((log) => {
              const wall = utcToWallClock(log.created_at, timezone);

              const actionColor =
                log.action === 'INSERT'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : log.action === 'UPDATE'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200';

              return (
                <div key={log.id} className="p-4 space-y-2 hover:bg-neutral-50/50 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${actionColor}`}>
                        {log.action}
                      </span>
                      <span className="font-mono font-semibold text-neutral-800">
                        {log.table_name}
                      </span>
                      <span className="text-neutral-400 font-mono text-[11px]">
                        ID: {log.record_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-neutral-500 font-mono text-[11px]">
                      <span>Actor: {log.actor_id ? log.actor_id.substring(0, 8) + '...' : 'system/trigger'}</span>
                      <span>·</span>
                      <span>{wall.displayDateTime}</span>
                    </div>
                  </div>

                  {/* Field-level diff */}
                  {renderFieldDiff(
                    log.old_data as Record<string, unknown> | null,
                    log.new_data as Record<string, unknown> | null
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Keyset Pagination Load More */}
        {data?.nextCursor && (
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-neutral-300 rounded text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Load More (Keyset)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
