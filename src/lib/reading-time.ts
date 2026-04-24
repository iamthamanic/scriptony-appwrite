/**
 * Reading-Time Utilities
 * Berechnet Lesedauer aus wordCount und WPM (words per minute).
 * KISS: reine Funktionen, keine Side-Effects.
 */

/** Berechnet Sekunden aus Wortanzahl und Lesegeschwindigkeit. */
export function calculateReadingDurationSeconds(
  wordCount: number,
  wpm: number,
): number {
  if (!wpm || wpm <= 0) return 0;
  return (wordCount / wpm) * 60;
}

/** Berechnet Lesedauer in Minuten (gerundet auf 1 Dezimalstelle). */
export function calculateReadingDurationMinutes(
  wordCount: number,
  wpm: number,
): number {
  return (
    Math.round((calculateReadingDurationSeconds(wordCount, wpm) / 60) * 10) / 10
  );
}

/** Formatiert Sekunden als m:ss. */
export function formatReadingTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Summiert Wortzahlen aus einem Array von Objekten mit wordCount. */
export function sumWordCounts(items: { wordCount?: number }[]): number {
  return items.reduce((sum, item) => sum + (item.wordCount || 0), 0);
}
