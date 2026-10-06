import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  parseISO,
  isValid,
} from 'date-fns';

export const DEFAULT_TIMEZONE = 'Africa/Lagos';

/**
 * Gets a Date representing "now" in the business timezone wall-clock.
 */
export function getNowInTimezone(timezone = DEFAULT_TIMEZONE): Date {
  return toZonedTime(new Date(), timezone);
}

/**
 * Formats a UTC ISO string or Date into a display string in the target timezone.
 */
export function formatInTimezone(
  date: Date | string | number,
  formatPattern: string,
  timezone = DEFAULT_TIMEZONE
): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(d)) return '';
  return formatInTimeZone(d, timezone, formatPattern);
}

/**
 * Returns the start and end of day in UTC ISO strings for a given day in the specified timezone.
 * Useful for bounded queries: starts_at >= startUtc AND starts_at <= endUtc
 */
export function getDayBoundsUtc(
  dayDate: Date | string,
  timezone = DEFAULT_TIMEZONE
): { startUtc: string; endUtc: string } {
  const baseDate = typeof dayDate === 'string' ? parseISO(dayDate) : dayDate;
  const zoned = toZonedTime(baseDate, timezone);
  const dayStartLocal = startOfDay(zoned);
  const dayEndLocal = endOfDay(zoned);

  const startUtcDate = fromZonedTime(dayStartLocal, timezone);
  const endUtcDate = fromZonedTime(dayEndLocal, timezone);

  return {
    startUtc: startUtcDate.toISOString(),
    endUtc: endUtcDate.toISOString(),
  };
}

/**
 * Returns the start and end of week (Sunday to Saturday, weekStartsOn: 0) in UTC ISO strings.
 */
export function getWeekBoundsUtc(
  date: Date | string,
  timezone = DEFAULT_TIMEZONE
): { startUtc: string; endUtc: string } {
  const baseDate = typeof date === 'string' ? parseISO(date) : date;
  const zoned = toZonedTime(baseDate, timezone);
  const weekStartLocal = startOfWeek(zoned, { weekStartsOn: 0 });
  const weekEndLocal = endOfWeek(zoned, { weekStartsOn: 0 });

  return {
    startUtc: fromZonedTime(weekStartLocal, timezone).toISOString(),
    endUtc: fromZonedTime(weekEndLocal, timezone).toISOString(),
  };
}

/**
 * Returns the start and end of month in UTC ISO strings.
 */
export function getMonthBoundsUtc(
  date: Date | string,
  timezone = DEFAULT_TIMEZONE
): { startUtc: string; endUtc: string } {
  const baseDate = typeof date === 'string' ? parseISO(date) : date;
  const zoned = toZonedTime(baseDate, timezone);
  const monthStartLocal = startOfMonth(zoned);
  const monthEndLocal = endOfMonth(zoned);

  return {
    startUtc: fromZonedTime(monthStartLocal, timezone).toISOString(),
    endUtc: fromZonedTime(monthEndLocal, timezone).toISOString(),
  };
}

/**
 * Converts wall-clock date string (YYYY-MM-DD) and time string (HH:mm or HH:mm:ss)
 * in the business timezone to a UTC ISO string.
 * DST-safe conversion.
 */
export function wallClockToUtcIso(
  dateStr: string, // YYYY-MM-DD
  timeStr: string, // HH:mm or HH:mm:ss
  timezone = DEFAULT_TIMEZONE
): string {
  const timeFormatted = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const localString = `${dateStr} ${timeFormatted}`;
  const utcDate = fromZonedTime(localString, timezone);
  return utcDate.toISOString();
}

/**
 * Converts a UTC ISO string to wall-clock components in the business timezone.
 */
export function utcToWallClock(
  utcIso: string,
  timezone = DEFAULT_TIMEZONE
): {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  displayDate: string;
  displayTime: string;
  displayDateTime: string;
} {
  const d = parseISO(utcIso);
  return {
    dateStr: formatInTimezone(d, 'yyyy-MM-dd', timezone),
    timeStr: formatInTimezone(d, 'HH:mm', timezone),
    displayDate: formatInTimezone(d, 'MMM d, yyyy', timezone),
    displayTime: formatInTimezone(d, 'h:mm a', timezone),
    displayDateTime: formatInTimezone(d, 'MMM d, yyyy h:mm a', timezone),
  };
}

/**
 * Returns "today" as YYYY-MM-DD in the business timezone.
 */
export function getTodayDateString(timezone = DEFAULT_TIMEZONE): string {
  return formatInTimezone(new Date(), 'yyyy-MM-dd', timezone);
}

/**
 * Checks if a given UTC ISO string is today in the business timezone.
 */
export function isTodayInTimezone(utcIso: string, timezone = DEFAULT_TIMEZONE): boolean {
  const dateStr = formatInTimezone(parseISO(utcIso), 'yyyy-MM-dd', timezone);
  return dateStr === getTodayDateString(timezone);
}

/**
 * Returns an array of dates (as YYYY-MM-DD strings) for the 7 days of the week containing the given date.
 */
export function getWeekDaysInTimezone(
  date: Date | string,
  timezone = DEFAULT_TIMEZONE
): { dateStr: string; dayName: string; weekday: number }[] {
  const baseDate = typeof date === 'string' ? parseISO(date) : date;
  const zoned = toZonedTime(baseDate, timezone);
  const weekStart = startOfWeek(zoned, { weekStartsOn: 0 });

  return Array.from({ length: 7 }, (_, i) => {
    const current = addDays(weekStart, i);
    return {
      dateStr: formatInTimezone(current, 'yyyy-MM-dd', timezone),
      dayName: formatInTimezone(current, 'EEE, MMM d', timezone),
      weekday: i, // 0 = Sunday .. 6 = Saturday
    };
  });
}
