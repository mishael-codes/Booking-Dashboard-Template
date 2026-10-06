import { describe, it, expect } from 'vitest';
import {
  parseMajorToMinor,
  formatMinorToMajorString,
  formatCurrency,
} from './money';

describe('money.ts - Integer/string money operations', () => {
  describe('parseMajorToMinor', () => {
    it('parses standard decimal amounts', () => {
      expect(parseMajorToMinor('1,500.50')).toBe(150050);
      expect(parseMajorToMinor('1500.50')).toBe(150050);
      expect(parseMajorToMinor('0.05')).toBe(5);
      expect(parseMajorToMinor('0.5')).toBe(50);
      expect(parseMajorToMinor('100')).toBe(10000);
    });

    it('handles zero and empty inputs safely', () => {
      expect(parseMajorToMinor('')).toBe(0);
      expect(parseMajorToMinor('   ')).toBe(0);
      expect(parseMajorToMinor('0')).toBe(0);
      expect(parseMajorToMinor('0.00')).toBe(0);
    });

    it('performs half-up rounding using integer arithmetic', () => {
      // 10.555 -> 1056 minor units
      expect(parseMajorToMinor('10.555')).toBe(1056);
      // 10.554 -> 1055 minor units
      expect(parseMajorToMinor('10.554')).toBe(1055);
      // 0.005 -> 1
      expect(parseMajorToMinor('0.005')).toBe(1);
      // 0.004 -> 0
      expect(parseMajorToMinor('0.004')).toBe(0);
      // 99.999 -> 10000
      expect(parseMajorToMinor('99.999')).toBe(10000);
    });

    it('strips currency signs and spaces', () => {
      expect(parseMajorToMinor('₦ 2,500.00')).toBe(250000);
      expect(parseMajorToMinor('$1,234.56')).toBe(123456);
    });

    it('handles negative numbers', () => {
      expect(parseMajorToMinor('-50.25')).toBe(-5025);
    });
  });

  describe('formatMinorToMajorString', () => {
    it('formats minor integer units to major string representation', () => {
      expect(formatMinorToMajorString(150050)).toBe('1500.50');
      expect(formatMinorToMajorString(5)).toBe('0.05');
      expect(formatMinorToMajorString(50)).toBe('0.50');
      expect(formatMinorToMajorString(0)).toBe('0.00');
      expect(formatMinorToMajorString(-250)).toBe('-2.50');
      expect(formatMinorToMajorString(BigInt(100000000))).toBe('1000000.00');
    });
  });

  describe('formatCurrency', () => {
    it('formats with default NGN currency', () => {
      const formatted = formatCurrency(150050, 'NGN', 'en-NG');
      expect(formatted).toContain('1,500.50');
    });

    it('formats other currencies gracefully', () => {
      const formatted = formatCurrency(2500, 'USD', 'en-US');
      expect(formatted).toBe('$25.00');
    });
  });
});
