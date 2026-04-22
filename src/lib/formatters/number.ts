/**
 * Number Formatting Utilities
 *
 * Functions for formatting numbers, currencies, percentages, file sizes, etc.
 */

export type Locale = "de" | "en";

// =============================================================================
// Number Formatting
// =============================================================================

/**
 * Formats a number with thousands separators
 *
 * @param value - Number to format
 * @param locale - Locale for formatting
 * @returns Formatted number string
 */
export function formatNumber(
  value: number | null | undefined,
  locale: Locale = "de",
): string {
  if (value === null || value === undefined) return "—";

  const localeCode = locale === "de" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(localeCode).format(value);
}

/**
 * Formats a number with decimal places
 */
export function formatDecimal(
  value: number | null | undefined,
  decimals: number = 2,
  locale: Locale = "de",
): string {
  if (value === null || value === undefined) return "—";

  const localeCode = locale === "de" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(localeCode, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a number as percentage
 */
export function formatPercent(
  value: number | null | undefined,
  decimals: number = 0,
  locale: Locale = "de",
): string {
  if (value === null || value === undefined) return "—";

  const localeCode = locale === "de" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(localeCode, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

// =============================================================================
// Currency Formatting
// =============================================================================

/**
 * Formats a number as currency
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = "EUR",
  locale: Locale = "de",
): string {
  if (value === null || value === undefined) return "—";

  const localeCode = locale === "de" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(localeCode, {
    style: "currency",
    currency,
  }).format(value);
}

// =============================================================================
// File Size Formatting
// =============================================================================

/**
 * Formats bytes into human-readable file size
 *
 * @param bytes - Number of bytes
 * @param decimals - Decimal places to show
 * @param locale - Locale for number formatting
 * @returns Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(
  bytes: number | null | undefined,
  decimals: number = 1,
  locale: Locale = "de",
): string {
  if (bytes === null || bytes === undefined || bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  const formattedValue = formatDecimal(value, decimals, locale);

  return `${formattedValue} ${sizes[i]}`;
}

// =============================================================================
// Compact Numbers
// =============================================================================

/**
 * Formats large numbers in compact notation (e.g., 1.2K, 3.4M)
 */
export function formatCompact(
  value: number | null | undefined,
  locale: Locale = "de",
): string {
  if (value === null || value === undefined) return "—";

  const localeCode = locale === "de" ? "de-DE" : "en-US";

  // Try to use Intl.NumberFormat with compact notation
  try {
    return new Intl.NumberFormat(localeCode, {
      notation: "compact",
      compactDisplay: "short",
    } as any).format(value);
  } catch {
    // Fallback for older browsers
    return formatCompactFallback(value, locale);
  }
}

/**
 * Fallback for compact number formatting
 */
function formatCompactFallback(value: number, locale: Locale): string {
  const suffixes =
    locale === "de"
      ? ["", "Tsd.", "Mio.", "Mrd.", "Bio."]
      : ["", "K", "M", "B", "T"];

  const tier = Math.floor(Math.log10(Math.abs(value)) / 3);

  if (tier === 0) return formatNumber(value, locale);

  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = value / scale;

  return `${formatDecimal(scaled, 1, locale)}${suffix}`;
}

// =============================================================================
// Duration Formatting
// =============================================================================

/**
 * Formats duration in minutes to human-readable format
 *
 * @param minutes - Duration in minutes
 * @param locale - Locale for formatting
 * @returns Formatted duration (e.g., "2h 30min" or "45min")
 */
export function formatDuration(
  minutes: number | null | undefined,
  locale: Locale = "de",
): string {
  if (minutes === null || minutes === undefined || minutes === 0) return "—";

  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (locale === "de") {
    if (hours === 0) {
      return `${mins} Min.`;
    } else if (mins === 0) {
      return `${hours} Std.`;
    } else {
      return `${hours} Std. ${mins} Min.`;
    }
  } else {
    if (hours === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  }
}

/**
 * Formats seconds to MM:SS or HH:MM:SS
 */
export function formatTimecode(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "00:00";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const pad = (num: number) => num.toString().padStart(2, "0");

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  } else {
    return `${pad(m)}:${pad(s)}`;
  }
}

// =============================================================================
// Range Formatting
// =============================================================================

/**
 * Formats a number range
 */
export function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  locale: Locale = "de",
): string {
  if (min === null || min === undefined || max === null || max === undefined) {
    return "—";
  }

  const separator = locale === "de" ? " bis " : " to ";
  return `${formatNumber(min, locale)}${separator}${formatNumber(max, locale)}`;
}

// =============================================================================
// Math Helpers
// =============================================================================

/**
 * Clamps a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Rounds a number to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Checks if a number is between min and max (inclusive)
 */
export function isBetween(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Calculates percentage of value relative to total
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}
