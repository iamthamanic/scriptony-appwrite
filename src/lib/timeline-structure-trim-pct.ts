/**
 * Film structure trim: shared pct math for Act / Sequence / Scene outer handles.
 * Inner boundary trims only move the shared edge between two siblings (handled in VideoEditorTimeline).
 *
 * Modes:
 * - Outer (first/last handle): segment lengths adjusted via outerTrimAdjust*; then this maps to pct.
 * - Inner: two adjacent siblings only — no full-row redistribution.
 *
 * Parent expansion when content exceeds shells runs on commit (timeline-trim-parent-sync), not during
 * inner-boundary drag (preview still updates descendant tracks via merged blocks).
 */

export type StructureTrimInteractionMode = 'outerPair' | 'innerBoundary';

/** Map ordered segment durations (seconds) to pct_from/pct_to within [0, budgetSec] on that row. */
export function buildPctMapFromOrderedSegmentSeconds(args: {
  ids: string[];
  segmentSeconds: number[];
  budgetSec: number;
}): Record<string, { pct_from: number; pct_to: number }> {
  const { ids, segmentSeconds, budgetSec } = args;
  const B = Math.max(1e-9, budgetSec);
  const out: Record<string, { pct_from: number; pct_to: number }> = {};
  let acc = 0;
  ids.forEach((id, i) => {
    const from = (acc / B) * 100;
    acc += segmentSeconds[i] ?? 0;
    const to = (acc / B) * 100;
    out[id] = { pct_from: from, pct_to: to };
  });
  return out;
}
