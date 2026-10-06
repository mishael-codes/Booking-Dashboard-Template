import { describe, it, expect } from 'vitest';
import {
  formatInTimezone,
  wallClockToUtcIso,
  utcToWallClock,
  getDayBoundsUtc,
  getTodayDateString,
} from './time';

describe('time.ts - Business timezone and DST-safe operations', () => {
  it('formats dates in Africa/Lagos (UTC+1, no DST)', () => {
    // 2026-06-15 12:00:00 UTC is 13:00:00 in Lagos
    const utcIso = '2026-06-15T12:00:00.000Z';
    const formatted = formatInTimezone(utcIso, 'yyyy-MM-dd HH:mm', 'Africa/Lagos');
    expect(formatted).toBe('2026-06-15 13:00');
  });

  it('correctly converts wall-clock in Lagos to UTC ISO', () => {
    // 13:00 in Lagos -> 12:00 UTC
    const utc = wallClockToUtcIso('2026-06-15', '13:00', 'Africa/Lagos');
    expect(utc).toBe('2026-06-15T12:00:00.000Z');
  });

  it('handles Daylight Saving Time transitions (e.g. America/New_York)', () => {
    // In NY, EDT (UTC-4) in Summer: 2026-07-01 10:00:00 wall clock -> 14:00:00 UTC
    const summerUtc = wallClockToUtcIso('2026-07-01', '10:00', 'America/New_York');
    expect(summerUtc).toBe('2026-07-01T14:00:00.000Z');

    // In NY, EST (UTC-5) in Winter: 2026-01-15 10:00:00 wall clock -> 15:00:00 UTC
    const winterUtc = wallClockToUtcIso('2026-01-15', '10:00', 'America/New_York');
    expect(winterUtc).toBe('2026-01-15T15:00:00.000Z');

    // Reverse: converting UTC back to wall clock across DST
    const summerWall = utcToWallClock('2026-07-01T14:00:00.000Z', 'America/New_York');
    expect(summerWall.timeStr).toBe('10:00');

    const winterWall = utcToWallClock('2026-01-15T15:00:00.000Z', 'America/New_York');
    expect(winterWall.timeStr).toBe('10:00');
  });

  it('computes accurate UTC bounds for a given day in the business timezone', () => {
    // Day in Lagos: 2026-10-06 00:00:00 (Lagos) is 2026-10-05 23:00:00 UTC
    const bounds = getDayBoundsUtc('2026-10-06', 'Africa/Lagos');
    expect(bounds.startUtc).toContain('2026-10-05T23:00:00');
    expect(bounds.endUtc).toContain('2026-10-06T22:59:59');
  });

  it('returns valid today string', () => {
    const today = getTodayDateString('Africa/Lagos');
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
