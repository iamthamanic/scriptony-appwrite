/**
 * Date Formatting Utilities
 *
 * Provides consistent date/time formatting across the application.
 * Supports i18n with German/English formats.
 */

// =============================================================================
// Types
// =============================================================================

export type DateFormat =
  | "short" // 11.10.2025
  | "medium" // 11. Okt 2025
  | "long" // 11. Oktober 2025
  | "full" // Samstag, 11. Oktober 2025
  | "time" // 14:30
  | "datetime" // 11.10.2025 14:30
  | "relative"; // vor 2 Stunden

export type Locale = "de" | "en";

// =============================================================================
// Configuration
// =============================================================================

const LOCALE_MAP: Record<Locale, string> = {
  de: "de-DE",
  en: "en-US",
};

const MONTH_NAMES_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const MONTH_NAMES_DE_SHORT = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

const DAY_NAMES_DE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Parses a date string/object into a Date instance
 */
export function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;

  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a date according to the specified format
 *
 * @param date - Date string, Date object, or null
 * @param format - Desired format
 * @param locale - Locale for formatting (default: 'de')
 * @returns Formatted date string or fallback
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: DateFormat = "short",
  locale: Locale = "de",
): string {
  const parsed = parseDate(date);

  if (!parsed) {
    return "—";
  }

  switch (format) {
    case "short":
      return formatShortDate(parsed, locale);

    case "medium":
      return formatMediumDate(parsed, locale);

    case "long":
      return formatLongDate(parsed, locale);

    case "full":
      return formatFullDate(parsed, locale);

    case "time":
      return formatTime(parsed);

    case "datetime":
      return `${formatShortDate(parsed, locale)} ${formatTime(parsed)}`;

    case "relative":
      return formatRelativeDate(parsed, locale);

    default:
      return formatShortDate(parsed, locale);
  }
}

/**
 * Formats date as: 11.10.2025 (DE) or 10/11/2025 (EN)
 */
function formatShortDate(date: Date, locale: Locale): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  if (locale === "de") {
    return `${day}.${month}.${year}`;
  } else {
    return `${month}/${day}/${year}`;
  }
}

/**
 * Formats date as: 11. Okt 2025 (DE) or Oct 11, 2025 (EN)
 */
function formatMediumDate(date: Date, locale: Locale): string {
  if (locale === "de") {
    const day = date.getDate();
    const month = MONTH_NAMES_DE_SHORT[date.getMonth()];
    const year = date.getFullYear();
    return `${day}. ${month} ${year}`;
  } else {
    return date.toLocaleDateString(LOCALE_MAP[locale], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

/**
 * Formats date as: 11. Oktober 2025 (DE) or October 11, 2025 (EN)
 */
function formatLongDate(date: Date, locale: Locale): string {
  if (locale === "de") {
    const day = date.getDate();
    const month = MONTH_NAMES_DE[date.getMonth()];
    const year = date.getFullYear();
    return `${day}. ${month} ${year}`;
  } else {
    return date.toLocaleDateString(LOCALE_MAP[locale], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

/**
 * Formats date as: Samstag, 11. Oktober 2025 (DE)
 */
function formatFullDate(date: Date, locale: Locale): string {
  if (locale === "de") {
    const dayName = DAY_NAMES_DE[date.getDay()];
    const day = date.getDate();
    const month = MONTH_NAMES_DE[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName}, ${day}. ${month} ${year}`;
  } else {
    return date.toLocaleDateString(LOCALE_MAP[locale], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

/**
 * Formats time as: 14:30
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Formats date as relative time: "vor 2 Stunden", "in 3 Tagen"
 */
function formatRelativeDate(date: Date, locale: Locale): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const isPast = diffMs > 0;

  if (locale === "de") {
    if (Math.abs(diffSecs) < 60) {
      return "gerade eben";
    } else if (Math.abs(diffMins) < 60) {
      return isPast ? `vor ${diffMins} Min.` : `in ${Math.abs(diffMins)} Min.`;
    } else if (Math.abs(diffHours) < 24) {
      const h = Math.abs(diffHours);
      return isPast
        ? `vor ${h} ${h === 1 ? "Stunde" : "Stunden"}`
        : `in ${h} ${h === 1 ? "Stunde" : "Stunden"}`;
    } else if (Math.abs(diffDays) < 7) {
      const d = Math.abs(diffDays);
      return isPast
        ? `vor ${d} ${d === 1 ? "Tag" : "Tagen"}`
        : `in ${d} ${d === 1 ? "Tag" : "Tagen"}`;
    } else if (Math.abs(diffWeeks) < 4) {
      const w = Math.abs(diffWeeks);
      return isPast
        ? `vor ${w} ${w === 1 ? "Woche" : "Wochen"}`
        : `in ${w} ${w === 1 ? "Woche" : "Wochen"}`;
    } else if (Math.abs(diffMonths) < 12) {
      const m = Math.abs(diffMonths);
      return isPast
        ? `vor ${m} ${m === 1 ? "Monat" : "Monaten"}`
        : `in ${m} ${m === 1 ? "Monat" : "Monaten"}`;
    } else {
      const y = Math.abs(diffYears);
      return isPast
        ? `vor ${y} ${y === 1 ? "Jahr" : "Jahren"}`
        : `in ${y} ${y === 1 ? "Jahr" : "Jahren"}`;
    }
  } else {
    // English
    if (Math.abs(diffSecs) < 60) {
      return "just now";
    } else if (Math.abs(diffMins) < 60) {
      const m = Math.abs(diffMins);
      return isPast ? `${m} min ago` : `in ${m} min`;
    } else if (Math.abs(diffHours) < 24) {
      const h = Math.abs(diffHours);
      return isPast
        ? `${h} ${h === 1 ? "hour" : "hours"} ago`
        : `in ${h} ${h === 1 ? "hour" : "hours"}`;
    } else if (Math.abs(diffDays) < 7) {
      const d = Math.abs(diffDays);
      return isPast
        ? `${d} ${d === 1 ? "day" : "days"} ago`
        : `in ${d} ${d === 1 ? "day" : "days"}`;
    } else if (Math.abs(diffWeeks) < 4) {
      const w = Math.abs(diffWeeks);
      return isPast
        ? `${w} ${w === 1 ? "week" : "weeks"} ago`
        : `in ${w} ${w === 1 ? "week" : "weeks"}`;
    } else if (Math.abs(diffMonths) < 12) {
      const m = Math.abs(diffMonths);
      return isPast
        ? `${m} ${m === 1 ? "month" : "months"} ago`
        : `in ${m} ${m === 1 ? "month" : "months"}`;
    } else {
      const y = Math.abs(diffYears);
      return isPast
        ? `${y} ${y === 1 ? "year" : "years"} ago`
        : `in ${y} ${y === 1 ? "year" : "years"}`;
    }
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Checks if a date is today
 */
export function isToday(date: string | Date | null | undefined): boolean {
  const parsed = parseDate(date);
  if (!parsed) return false;

  const today = new Date();
  return (
    parsed.getDate() === today.getDate() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getFullYear() === today.getFullYear()
  );
}

/**
 * Checks if a date is in the past
 */
export function isPast(date: string | Date | null | undefined): boolean {
  const parsed = parseDate(date);
  if (!parsed) return false;

  return parsed.getTime() < Date.now();
}

/**
 * Checks if a date is in the future
 */
export function isFuture(date: string | Date | null | undefined): boolean {
  const parsed = parseDate(date);
  if (!parsed) return false;

  return parsed.getTime() > Date.now();
}

/**
 * Gets the difference between two dates in days
 */
export function getDaysDifference(
  date1: string | Date | null | undefined,
  date2: string | Date | null | undefined,
): number | null {
  const parsed1 = parseDate(date1);
  const parsed2 = parseDate(date2);

  if (!parsed1 || !parsed2) return null;

  const diffMs = Math.abs(parsed2.getTime() - parsed1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
