/**
 * When a parent row (Act or Sequence) gets new pct_* after trim, children would normally
 * re-project from the parent and shift in global time. These helpers recompute child pct_*
 * so global [startSec, endSec] intervals stay aligned with frozen snapshots (inverse projection).
 */

import type { TimelineData } from "../components/FilmDropdown";
import {
  calculateActBlocks,
  calculateSequenceBlocks,
} from "../components/timeline-blocks";

export type FrozenGlobalBounds = Record<
  string,
  { startSec: number; endSec: number }
>;

export type PctRange = { pct_from: number; pct_to: number };

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Map global child segments into new parent [start,end] → relative pct row. */
export function reprojectChildrenPctPreservingGlobal(args: {
  parentStartSec: number;
  parentEndSec: number;
  childIdsInOrder: string[];
  frozen: FrozenGlobalBounds;
}): Record<string, PctRange> {
  const { parentStartSec, parentEndSec, childIdsInOrder, frozen } = args;
  const span = Math.max(1e-9, parentEndSec - parentStartSec);
  const out: Record<string, PctRange> = {};
  for (const id of childIdsInOrder) {
    const g = frozen[id];
    if (!g) continue;
    let pf = ((g.startSec - parentStartSec) / span) * 100;
    let pt = ((g.endSec - parentStartSec) / span) * 100;
    pf = clamp(pf, 0, 100);
    pt = clamp(pt, 0, 100);
    if (pf > pt) {
      const t = pf;
      pf = pt;
      pt = t;
    }
    out[id] = { pct_from: pf, pct_to: pt };
  }
  return out;
}

function mergeTimelinePct(
  td: TimelineData,
  ma: Record<string, PctRange>,
  msq: Record<string, PctRange>,
  msc: Record<string, PctRange>,
): TimelineData {
  return {
    ...td,
    acts: (td.acts || []).map((a: any) => {
      const o = ma[a.id];
      if (!o) return a;
      return {
        ...a,
        metadata: {
          ...(a.metadata || {}),
          pct_from: o.pct_from,
          pct_to: o.pct_to,
        },
      };
    }),
    sequences: (td.sequences || []).map((s: any) => {
      const o = msq[s.id];
      if (!o) return s;
      return {
        ...s,
        metadata: {
          ...(s.metadata || {}),
          pct_from: o.pct_from,
          pct_to: o.pct_to,
        },
      };
    }),
    scenes: (td.scenes || []).map((s: any) => {
      const o = msc[s.id];
      if (!o) return s;
      return {
        ...s,
        metadata: {
          ...(s.metadata || {}),
          pct_from: o.pct_from,
          pct_to: o.pct_to,
        },
      };
    }),
  };
}

/**
 * After act pct changes, recompute sequence + scene manual pct so global bounds match `frozenSeq` / `frozenScene`.
 */
export function preserveSequenceSceneTimingsAfterActPctChange(args: {
  td: TimelineData;
  duration: number;
  ma: Record<string, PctRange>;
  msq: Record<string, PctRange>;
  msc: Record<string, PctRange>;
  frozenSeq: FrozenGlobalBounds;
  frozenScene: FrozenGlobalBounds;
  /** Acts whose row changed this frame — reproject descendants under these acts only */
  affectedActIds: string[];
}): { msq: Record<string, PctRange>; msc: Record<string, PctRange> } {
  const { td, duration, ma, msq, msc, frozenSeq, frozenScene, affectedActIds } =
    args;
  const px = 1;
  const viewStart = 0;
  const viewEnd = duration;
  const actSet = new Set(affectedActIds);

  let msqOut: Record<string, PctRange> = { ...msq };
  let mscOut: Record<string, PctRange> = { ...msc };

  const merged1 = mergeTimelinePct(td, ma, msqOut, mscOut);
  const actBlocks = calculateActBlocks(
    merged1,
    duration,
    viewStart,
    viewEnd,
    px,
    false,
  );

  const sequences = [...(td.sequences || [])].sort(
    (a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );

  for (const actId of affectedActIds) {
    const ab = actBlocks.find((b: any) => b.id === actId);
    if (!ab) continue;
    const seqsInAct = sequences.filter((s: any) => s.actId === actId);
    if (!seqsInAct.length) continue;
    const patch = reprojectChildrenPctPreservingGlobal({
      parentStartSec: ab.startSec,
      parentEndSec: ab.endSec,
      childIdsInOrder: seqsInAct.map((s: any) => s.id),
      frozen: frozenSeq,
    });
    msqOut = { ...msqOut, ...patch };
  }

  const merged2 = mergeTimelinePct(td, ma, msqOut, mscOut);
  const seqBlocks = calculateSequenceBlocks(
    merged2,
    duration,
    viewStart,
    viewEnd,
    px,
    false,
  );

  const scenes = [...(td.scenes || [])].sort(
    (a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );

  for (const seq of sequences) {
    if (!actSet.has(seq.actId)) continue;
    const sb = seqBlocks.find((b: any) => b.id === seq.id);
    if (!sb) continue;
    const scenesInSeq = scenes.filter((sc: any) => sc.sequenceId === seq.id);
    if (!scenesInSeq.length) continue;
    const patch = reprojectChildrenPctPreservingGlobal({
      parentStartSec: sb.startSec,
      parentEndSec: sb.endSec,
      childIdsInOrder: scenesInSeq.map((s: any) => s.id),
      frozen: frozenScene,
    });
    mscOut = { ...mscOut, ...patch };
  }

  return { msq: msqOut, msc: mscOut };
}

/**
 * After sequence pct changes, recompute scene manual pct so global bounds match `frozenScene`.
 */
export function preserveSceneTimingsAfterSequencePctChange(args: {
  td: TimelineData;
  duration: number;
  ma: Record<string, PctRange>;
  msq: Record<string, PctRange>;
  msc: Record<string, PctRange>;
  frozenScene: FrozenGlobalBounds;
  affectedSequenceIds: string[];
}): { msc: Record<string, PctRange> } {
  const { td, duration, ma, msq, msc, frozenScene, affectedSequenceIds } = args;
  const px = 1;
  const viewStart = 0;
  const viewEnd = duration;
  let mscOut: Record<string, PctRange> = { ...msc };

  const merged = mergeTimelinePct(td, ma, msq, mscOut);
  const seqBlocks = calculateSequenceBlocks(
    merged,
    duration,
    viewStart,
    viewEnd,
    px,
    false,
  );

  const scenes = [...(td.scenes || [])].sort(
    (a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );

  for (const seqId of affectedSequenceIds) {
    const sb = seqBlocks.find((b: any) => b.id === seqId);
    if (!sb) continue;
    const scenesInSeq = scenes.filter((sc: any) => sc.sequenceId === seqId);
    if (!scenesInSeq.length) continue;
    const patch = reprojectChildrenPctPreservingGlobal({
      parentStartSec: sb.startSec,
      parentEndSec: sb.endSec,
      childIdsInOrder: scenesInSeq.map((s: any) => s.id),
      frozen: frozenScene,
    });
    mscOut = { ...mscOut, ...patch };
  }

  return { msc: mscOut };
}
