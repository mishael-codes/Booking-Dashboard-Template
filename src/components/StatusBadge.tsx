import React from 'react';
import type { BookingStatus, PaymentStatus } from '../types/database';

interface StatusBadgeProps {
  status: BookingStatus | PaymentStatus | 'active' | 'inactive';
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  // Anti-slop: clean typography, subtle tonal background, no candy pills, WCAG AA compliant contrast
  let styles = 'text-neutral-700 bg-neutral-100 border-neutral-200';
  let label: string = status;
  let symbol = '•';

  switch (status) {
    case 'confirmed':
      styles = 'text-emerald-800 bg-emerald-50 border-emerald-200';
      label = 'Confirmed';
      symbol = '✓';
      break;
    case 'pending':
      styles = 'text-amber-800 bg-amber-50 border-amber-200';
      label = 'Pending';
      symbol = '⏱';
      break;
    case 'completed':
      styles = 'text-blue-800 bg-blue-50 border-blue-200';
      label = 'Completed';
      symbol = '★';
      break;
    case 'cancelled':
      styles = 'text-neutral-600 bg-neutral-100 border-neutral-300 line-through';
      label = 'Cancelled';
      symbol = '✕';
      break;
    case 'no_show':
      styles = 'text-rose-800 bg-rose-50 border-rose-200';
      label = 'No Show';
      symbol = '⊘';
      break;
    case 'expired':
      styles = 'text-neutral-500 bg-neutral-100 border-neutral-200';
      label = 'Expired';
      symbol = '—';
      break;
    case 'succeeded':
      styles = 'text-emerald-800 bg-emerald-50 border-emerald-200';
      label = 'Succeeded';
      symbol = '✓';
      break;
    case 'failed':
      styles = 'text-rose-800 bg-rose-50 border-rose-200';
      label = 'Failed';
      symbol = '⚠';
      break;
    case 'refunded':
      styles = 'text-purple-800 bg-purple-50 border-purple-200';
      label = 'Refunded';
      symbol = '↩';
      break;
    case 'active':
      styles = 'text-emerald-800 bg-emerald-50 border-emerald-200';
      label = 'Active';
      symbol = '●';
      break;
    case 'inactive':
      styles = 'text-neutral-500 bg-neutral-100 border-neutral-200';
      label = 'Disabled';
      symbol = '○';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${styles} ${className}`}
    >
      <span aria-hidden="true" className="text-[10px] select-none">
        {symbol}
      </span>
      <span>{label}</span>
    </span>
  );
}
