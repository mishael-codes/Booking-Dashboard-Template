import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, AlertCircle } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  // Pagination
  page?: number;
  pageSize?: number;
  totalCount?: number | null;
  onPageChange?: (newPage: number) => void;
  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (columnKey: string) => void;
  // Row interaction
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  error,
  onRetry,
  page = 1,
  pageSize = 25,
  totalCount,
  onPageChange,
  sortColumn,
  sortDirection,
  onSortChange,
  onRowClick,
  keyExtractor,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching the current filter criteria.',
  emptyAction,
}: DataTableProps<T>) {
  const totalPages = totalCount != null ? Math.ceil(totalCount / pageSize) : null;
  const hasPagination = onPageChange != null;

  return (
    <div className="w-full bg-white border border-neutral-200 rounded-lg overflow-hidden flex flex-col">
      {/* Table Container */}
      <div className="overflow-x-auto min-h-[220px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/75">
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                const alignmentClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`py-2.5 px-4 text-xs font-semibold text-neutral-600 ${alignmentClass} ${
                      col.className || ''
                    }`}
                  >
                    {col.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-neutral-900 focus:outline-none ${
                          col.align === 'right' ? 'ml-auto' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        <ArrowUpDown
                          className={`w-3 h-3 ${isSorted ? 'text-neutral-900' : 'text-neutral-400'}`}
                        />
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {isLoading ? (
              // Skeleton rows matching geometry
              Array.from({ length: Math.min(pageSize, 8) }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="h-10">
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-${rIdx}-${cIdx}`} className="py-2.5 px-4">
                      <div className="h-4 bg-neutral-200/60 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="inline-flex flex-col items-center justify-center max-w-sm">
                    <AlertCircle className="w-8 h-8 text-rose-600 mb-2" />
                    <p className="text-sm font-medium text-neutral-900">{error}</p>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="mt-3 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50"
                      >
                        Retry Query
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="inline-flex flex-col items-center justify-center max-w-md mx-auto">
                    <p className="text-sm font-semibold text-neutral-900">{emptyTitle}</p>
                    <p className="mt-1 text-xs text-neutral-500">{emptyDescription}</p>
                    {emptyAction && <div className="mt-4">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const rowKey = keyExtractor(row);
                const isClickable = !!onRowClick;

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row)}
                    className={`h-10 transition-colors ${
                      isClickable
                        ? 'cursor-pointer hover:bg-neutral-50/80 focus-within:bg-neutral-50'
                        : 'hover:bg-neutral-50/40'
                    }`}
                  >
                    {columns.map((col) => {
                      const alignmentClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      return (
                        <td
                          key={`${rowKey}-${col.key}`}
                          className={`py-2.5 px-4 text-sm text-neutral-800 ${alignmentClass} ${
                            col.className || ''
                          }`}
                        >
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[col.key] ?? '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {hasPagination && !isLoading && !error && data.length > 0 && (
        <div className="px-4 py-2.5 bg-neutral-50/50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
          <div>
            {totalCount != null ? (
              <span>
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, totalCount)} of {totalCount} records
              </span>
            ) : (
              <span>Page {page}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="tabular-nums">
              {totalPages ? `${page} / ${totalPages}` : page}
            </span>
            <button
              type="button"
              disabled={totalPages != null ? page >= totalPages : data.length < pageSize}
              onClick={() => onPageChange(page + 1)}
              className="p-1 rounded border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
