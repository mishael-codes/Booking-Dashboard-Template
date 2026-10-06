/**
 * Money utilities using integer and string math only.
 * Minor units (e.g. kobo/cents) are stored as integers. Never use floats for money math.
 */

export interface CurrencyConfig {
  code: string;
  minorDigits: number;
}

const DEFAULT_CURRENCY = 'NGN';
const DEFAULT_LOCALE = 'en-NG';
const DEFAULT_MINOR_DIGITS = 2;

/**
 * Parses a user input string in major units (e.g. "1,500.50" or "45.99")
 * into integer minor units (e.g. 150050) using string and integer arithmetic only.
 * Rounding on extra decimal places uses half-up integer rounding.
 */
export function parseMajorToMinor(
  input: string | number,
  minorDigits = DEFAULT_MINOR_DIGITS
): number {
  if (typeof input === 'number') {
    input = String(input);
  }

  // Trim and remove thousands separators (commas, underscores, spaces) and currency symbols
  let cleaned = input.trim().replace(/[,\s_]/g, '');
  if (!cleaned) {
    return 0;
  }

  // Handle negative numbers
  const isNegative = cleaned.startsWith('-');
  if (isNegative || cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // Remove any non-digit except dot
  cleaned = cleaned.replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.') {
    return 0;
  }

  const parts = cleaned.split('.');
  const wholePartStr = (parts[0] || '').replace(/^0+(?=\d)/, '') || '0';
  const fracPartStr = parts[1] || '';

  // Parse whole part as BigInt to avoid float overflow
  let wholeBig = BigInt(wholePartStr);

  if (minorDigits === 0) {
    if (fracPartStr.length > 0) {
      const firstFrac = parseInt(fracPartStr[0] ?? '0', 10);
      if (firstFrac >= 5) {
        wholeBig += 1n;
      }
    }
    const result = Number(wholeBig);
    return isNegative ? -result : result;
  }

  // Fraction processing
  let fracPadded = fracPartStr.padEnd(minorDigits + 1, '0');
  const relevantFrac = fracPadded.slice(0, minorDigits);
  const roundDigit = parseInt(fracPadded[minorDigits] ?? '0', 10);

  let minorVal = BigInt(relevantFrac);
  if (roundDigit >= 5) {
    minorVal += 1n;
  }

  // Total minor units
  const multiplier = 10n ** BigInt(minorDigits);
  const totalMinor = wholeBig * multiplier + minorVal;

  const result = Number(totalMinor);
  return isNegative ? -result : result;
}

/**
 * Formats integer minor units into a decimal string without floating point inaccuracies.
 * E.g. 150050 -> "1500.50", 5 -> "0.05", -20 -> "-0.20"
 */
export function formatMinorToMajorString(
  minor: number | bigint,
  minorDigits = DEFAULT_MINOR_DIGITS
): string {
  const minorBig = typeof minor === 'bigint' ? minor : BigInt(Math.round(minor));
  const isNegative = minorBig < 0n;
  const absVal = isNegative ? -minorBig : minorBig;

  if (minorDigits === 0) {
    return (isNegative ? '-' : '') + absVal.toString();
  }

  const multiplier = 10n ** BigInt(minorDigits);
  const whole = absVal / multiplier;
  const remainder = absVal % multiplier;
  const fracStr = remainder.toString().padStart(minorDigits, '0');

  return `${isNegative ? '-' : ''}${whole}.${fracStr}`;
}

/**
 * Formats minor units into localized currency string using Intl.NumberFormat.
 * Default currency: NGN, default locale: en-NG.
 */
export function formatCurrency(
  minor: number | bigint,
  currency = DEFAULT_CURRENCY,
  locale = DEFAULT_LOCALE,
  minorDigits = DEFAULT_MINOR_DIGITS
): string {
  const majorString = formatMinorToMajorString(minor, minorDigits);
  const numValue = Number(majorString);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: minorDigits,
      maximumFractionDigits: minorDigits,
    }).format(numValue);
  } catch {
    // Fallback if currency code is unexpected
    return `${currency.toUpperCase()} ${majorString}`;
  }
}
