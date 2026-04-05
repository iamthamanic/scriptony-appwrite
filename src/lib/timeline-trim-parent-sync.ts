/**
 * Parent pct patches after structure trim: compare content global bounds to sequence/act shells
 * (not scene-vs-itself). Uses expandStructurePctToFitGlobalNeed and sequence/act-only helpers.
 */

import type { TimelineData } from '../components/FilmDropdown';
import { calculateActBlocks, calculateSequenceBlocks, calculateSceneBlocks } from '../components/timeline-blocks';
import {
  expandStructurePctToFitGlobalNeed,
  expandActSequencePctToFitGlobalNeed,
  expandActPctToFitGlobalNeed,
  type PctRange,
} from './timeline-container-expand';
import { isPersistedTimelineNodeId } from './timeline-node-ids';

function mergePctTimings(
  td: TimelineData,
  ma: Record<string, { pct_from: number; pct_to: number }>,
  msq: Record<string, { pct_from: number; pct_to: number }>,
  msc: Record<string, { pct_from: number; pct_to: number }>
): TimelineData {
  return {
    ...td,
    acts: (td.acts || []).map((a: any) => {
      const o = ma[a.id];
      if (!o) return a;
      return { ...a, metadata: { ...(a.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
    }),
    sequences: (td.sequences || []).map((s: any) => {
      const o = msq[s.id];
      if (!o) return s;
      return { ...s, metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
    }),
    scenes: (td.scenes || []).map((s: any) => {
      const o = msc[s.id];
      if (!o) return s;
      return { ...s, metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
    }),
  };
}

/** Scene shell + editorial clips in that scene (global seconds). */
function sceneContentGlobalNeedBounds(
  td: TimelineData,
  sceneId: string,
  scBlock: { startSec: number; endSec: number }
): { needStartSec: number; needEndSec: number } {
  let lo = scBlock.startSec;
  let hi = scBlock.endSec;
  const clips = (td.clips || []) as Array<{ sceneId?: string; startSec?: number; endSec?: number }>;
  for (const c of clips) {
    if (c.sceneId !== sceneId) continue;
    const a = typeof c.startSec === 'number' ? c.startSec : 0;
    const b = typeof c.endSec === 'number' ? c.endSec : a;
    lo = Math.min(lo, a);
    hi = Math.max(hi, b);
  }
  return { needStartSec: lo, needEndSec: hi };
}

export function computeParentPctPatchesAfterSceneTrim(args: {
  td: TimelineData;
  sceneIds: string[];
  ma: Record<string, { pct_from: number; pct_to: number }>;
  msq: Record<string, { pct_from: number; pct_to: number }>;
  msc: Record<string, { pct_from: number; pct_to: number }>;
  duration: number;
}): { act: Record<string, PctRange>; sequence: Record<string, PctRange> } {
  const { td, sceneIds, ma, msq, msc, duration } = args;
  const merged = mergePctTimings(td, ma, msq, msc);
  const px = 1;
  const viewStart = 0;
  const viewEnd = duration;

  const actBlocks = calculateActBlocks(merged, duration, viewStart, viewEnd, px, false);
  const sequenceBlocks = calculateSequenceBlocks(merged, duration, viewStart, viewEnd, px, false);
  const sceneBlocks = calculateSceneBlocks(merged, duration, viewStart, viewEnd, px, false);

  const actOut: Record<string, PctRange> = {};
  const seqOut: Record<string, PctRange> = {};

  for (const sceneId of sceneIds) {
    if (!isPersistedTimelineNodeId(sceneId)) continue;
    const sceneRow = (td.scenes || []).find((s: any) => s.id === sceneId);
    if (!sceneRow?.sequenceId) continue;
    const seqRow = (td.sequences || []).find((s: any) => s.id === sceneRow.sequenceId);
    if (!seqRow?.actId) continue;

    const scBlock = sceneBlocks.find((b: any) => b.id === sceneId);
    const seqBlock = sequenceBlocks.find((b: any) => b.id === seqRow.id);
    const actBlock = actBlocks.find((b: any) => b.id === seqRow.actId);
    if (!scBlock || !seqBlock || !actBlock) continue;

    const need = sceneContentGlobalNeedBounds(td, sceneId, {
      startSec: scBlock.startSec,
      endSec: scBlock.endSec,
    });

    const exp = expandStructurePctToFitGlobalNeed({
      needStartSec: need.needStartSec,
      needEndSec: need.needEndSec,
      actBlock: { id: actBlock.id, startSec: actBlock.startSec, endSec: actBlock.endSec },
      sequenceBlock: { id: seqBlock.id, startSec: seqBlock.startSec, endSec: seqBlock.endSec },
      sceneBlock: { id: scBlock.id, startSec: scBlock.startSec, endSec: scBlock.endSec },
      totalDur: duration,
    });

    if (exp.act) actOut[actBlock.id] = exp.act;
    if (exp.sequence) seqOut[seqBlock.id] = exp.sequence;
  }

  return { act: actOut, sequence: seqOut };
}


export function computeParentPctPatchesAfterSequenceTrim(args: {
  td: TimelineData;
  sequenceIds: string[];
  ma: Record<string, { pct_from: number; pct_to: number }>;
  msq: Record<string, { pct_from: number; pct_to: number }>;
  msc: Record<string, { pct_from: number; pct_to: number }>;
  duration: number;
}): { act: Record<string, PctRange>; sequence: Record<string, PctRange> } {
  const { td, sequenceIds, ma, msq, msc, duration } = args;
  const merged = mergePctTimings(td, ma, msq, msc);
  const px = 1;
  const actBlocks = calculateActBlocks(merged, duration, 0, duration, px, false);
  const sequenceBlocks = calculateSequenceBlocks(merged, duration, 0, duration, px, false);
  const sceneBlocks = calculateSceneBlocks(merged, duration, 0, duration, px, false);

  const actOut: Record<string, PctRange> = {};
  const seqOut: Record<string, PctRange> = {};

  for (const seqId of sequenceIds) {
    if (!isPersistedTimelineNodeId(seqId)) continue;
    const seqRow = (td.sequences || []).find((s: any) => s.id === seqId);
    if (!seqRow?.actId) continue;
    const seqBlock = sequenceBlocks.find((b: any) => b.id === seqId);
    const actBlock = actBlocks.find((b: any) => b.id === seqRow.actId);
    if (!seqBlock || !actBlock) continue;

    const scenesInSeq = (td.scenes || []).filter((s: any) => s.sequenceId === seqId);
    let needLo = Infinity;
    let needHi = -Infinity;
    for (const sc of scenesInSeq) {
      const scB = sceneBlocks.find((b: any) => b.id === sc.id);
      if (!scB) continue;
      const need = sceneContentGlobalNeedBounds(td, sc.id, { startSec: scB.startSec, endSec: scB.endSec });
      needLo = Math.min(needLo, need.needStartSec);
      needHi = Math.max(needHi, need.needEndSec);
    }
    if (needLo === Infinity) continue;

    const exp = expandActSequencePctToFitGlobalNeed({
      needStartSec: needLo,
      needEndSec: needHi,
      actBlock: { id: actBlock.id, startSec: actBlock.startSec, endSec: actBlock.endSec },
      sequenceBlock: { id: seqBlock.id, startSec: seqBlock.startSec, endSec: seqBlock.endSec },
      totalDur: duration,
    });
    if (exp.act) actOut[actBlock.id] = exp.act;
    if (exp.sequence) seqOut[seqId] = exp.sequence;
  }

  return { act: actOut, sequence: seqOut };
}

export function computeParentPctPatchesAfterActTrim(args: {
  td: TimelineData;
  actIds: string[];
  ma: Record<string, { pct_from: number; pct_to: number }>;
  msq: Record<string, { pct_from: number; pct_to: number }>;
  msc: Record<string, { pct_from: number; pct_to: number }>;
  duration: number;
}): { act: Record<string, PctRange>; sequence: Record<string, PctRange> } {
  const { td, actIds, ma, msq, msc, duration } = args;
  const merged = mergePctTimings(td, ma, msq, msc);
  const px = 1;
  const actBlocks = calculateActBlocks(merged, duration, 0, duration, px, false);
  const sequenceBlocks = calculateSequenceBlocks(merged, duration, 0, duration, px, false);
  const sceneBlocks = calculateSceneBlocks(merged, duration, 0, duration, px, false);

  const actOut: Record<string, PctRange> = {};

  for (const actId of actIds) {
    if (!isPersistedTimelineNodeId(actId)) continue;
    const actBlock = actBlocks.find((b: any) => b.id === actId);
    if (!actBlock) continue;

    const seqsInAct = (td.sequences || []).filter((s: any) => s.actId === actId);
    let needLo = Infinity;
    let needHi = -Infinity;
    for (const sq of seqsInAct) {
      const scenesInSeq = (td.scenes || []).filter((s: any) => s.sequenceId === sq.id);
      for (const sc of scenesInSeq) {
        const scB = sceneBlocks.find((b: any) => b.id === sc.id);
        if (!scB) continue;
        const need = sceneContentGlobalNeedBounds(td, sc.id, { startSec: scB.startSec, endSec: scB.endSec });
        needLo = Math.min(needLo, need.needStartSec);
        needHi = Math.max(needHi, need.needEndSec);
      }
    }
    if (needLo === Infinity) continue;

    const exp = expandActPctToFitGlobalNeed({
      needStartSec: needLo,
      needEndSec: needHi,
      actBlock: { id: actBlock.id, startSec: actBlock.startSec, endSec: actBlock.endSec },
      totalDur: duration,
    });
    if (exp.act) actOut[actId] = exp.act;
  }

  return { act: actOut, sequence: {} };
}
