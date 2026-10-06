import React, { useState } from 'react';
import {
  getDayBoundsUtc,
  getMonthBoundsUtc,
  DEFAULT_TIMEZONE,
  wallClockToUtcIso,
  formatInTimezone,
} from '../lib/time';
import { addDays, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

export interface DateRange {
  fromUtc: string;
  toUtc: string;
  label: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  timezone?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  timezone = DEFAULT_TIMEZONE,
  className = '',
}: DateRangePickerProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(() =>
    formatInTimezone(value.fromUtc, 'yyyy-MM-dd', timezone)
  );
  const [customEnd, setCustomEnd] = useState(() =>
    formatInTimezone(value.toUtc, 'yyyy-MM-dd', timezone)
  );

  const setPreset = (preset: 'today' | 'next7' | 'thisMonth' | 'prev30') => {
    setIsCustomOpen(false);
    const now = new Date();

    if (preset === 'today') {
      const bounds = getDayBoundsUtc(now, timezone);
      onChange({ fromUtc: bounds.startUtc, toUtc: bounds.endUtc, label: 'Today' });
    } else if (preset === 'next7') {
      const startBounds = getDayBoundsUtc(now, timezone);
      const endBounds = getDayBoundsUtc(addDays(now, 7), timezone);
      onChange({ fromUtc: startBounds.startUtc, toUtc: endBounds.endUtc, label: 'Next 7 Days' });
    } else if (preset === 'thisMonth') {
      const bounds = getMonthBoundsUtc(now, timezone);
      onChange({ fromUtc: bounds.startUtc, toUtc: bounds.endUtc, label: 'This Month' });
    } else if (preset === 'prev30') {
      const startBounds = getDayBoundsUtc(subDays(now, 30), timezone);
      const endBounds = getDayBoundsUtc(now, timezone);
      onChange({ fromUtc: startBounds.startUtc, toUtc: endBounds.endUtc, label: 'Last 30 Days' });
    }
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    const fromUtc = wallClockToUtcIso(customStart, '00:00:00', timezone);
    const toUtc = wallClockToUtcIso(customEnd, '23:59:59', timezone);
    onChange({ fromUtc, toUtc, label: `${customStart} to ${customEnd}` });
    setIsCustomOpen(false);
  };

  return (
    <div className={`relative inline-flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
      {/* Preset tabs */}
      <div className="inline-flex rounded-md border border-neutral-300 bg-neutral-100 p-0.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => setPreset('today')}
          className={`px-2.5 py-1 rounded transition-colors ${
            value.label === 'Today' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setPreset('next7')}
          className={`px-2.5 py-1 rounded transition-colors ${
            value.label === 'Next 7 Days' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Next 7D
        </button>
        <button
          type="button"
          onClick={() => setPreset('thisMonth')}
          className={`px-2.5 py-1 rounded transition-colors ${
            value.label === 'This Month' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          This Month
        </button>
        <button
          type="button"
          onClick={() => setIsCustomOpen(!isCustomOpen)}
          className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 ${
            isCustomOpen || (value.label !== 'Today' && value.label !== 'Next 7 Days' && value.label !== 'This Month')
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Custom</span>
        </button>
      </div>

      {isCustomOpen && (
        <div className="absolute top-full left-0 mt-2 z-30 p-3 bg-white border border-neutral-300 rounded-lg shadow-lg flex flex-col gap-2 min-w-[280px]">
          <div className="text-xs font-medium text-neutral-700">Custom Date Range ({timezone})</div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="text-xs p-1.5 border border-neutral-300 rounded w-full"
            />
            <span className="text-xs text-neutral-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="text-xs p-1.5 border border-neutral-300 rounded w-full"
            />
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setIsCustomOpen(false)}
              className="px-2.5 py-1 text-xs text-neutral-600 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyCustom}
              className="px-3 py-1 text-xs bg-neutral-900 text-white rounded hover:bg-neutral-800"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
