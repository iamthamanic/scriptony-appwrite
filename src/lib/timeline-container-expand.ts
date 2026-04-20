/**
 * Expand structure `metadata.pct_*` so content global bounds fit inside scene → sequence → act.
 * Used by NLE clip trim and parent sync after structure commits.
 *
 * Duration policy: all expansion clamps to [0, totalDurSeconds] (project timeline length). This
 * component does not change project duration; the parent must pass a larger `duration` (e.g. after
 * updating project settings / API) if the edit should extend the visible timeline. Optional
 * `onProjectDurationSecondsHint` on VideoEditorTimeline can notify when content exceeds the current span.
 */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export interface PctRange {
  pct_from: number;
  pct_to: number;
}

function computePctTripleFromTargetSceneSpan(args: {
  targetSceneStart: number;
  targetSceneEnd: number;
  actBlock: { id: string; startSec: number; endSec: number };
  sequenceBlock: { id: string; startSec: number; endSec: number };
  totalDur: number;
}): { act: PctRange; sequence: PctRange; scene: PctRange } | null {
  const {
    targetSceneStart,
    targetSceneEnd,
    actBlock,
    sequenceBlock,
    totalDur,
  } = args;

  const actLo = actBlock.startSec;
  const actHi = actBlock.endSec;

  const seqLo0 = sequenceBlock.startSec;
  const seqHi0 = sequenceBlock.endSec;

  let needSeqLo = Math.min(targetSceneStart, seqLo0);
  let needSeqHi = Math.max(targetSceneEnd, seqHi0);

  let needActLo = Math.min(needSeqLo, actLo);
  let needActHi = Math.max(needSeqHi, actHi);

  needActLo = clamp(needActLo, 0, totalDur);
  needActHi = clamp(needActHi, 0, totalDur);
  if (needActHi - needActLo < 1e-3) return null;

  const actFrom = (needActLo / totalDur) * 100;
  const actTo = (needActHi / totalDur) * 100;

  const newActLo = (actFrom / 100) * totalDur;
  const newActHi = (actTo / 100) * totalDur;
  const newActD = Math.max(1e-6, newActHi - newActLo);

  const relSeqLo = needSeqLo - newActLo;
  const relSeqHi = needSeqHi - newActLo;
  const seqFrom = (relSeqLo / newActD) * 100;
  const seqTo = (relSeqHi / newActD) * 100;

  const newSeqLo = newActLo + (clamp(seqFrom, 0, 100) / 100) * newActD;
  const newSeqHi = newActLo + (clamp(seqTo, 0, 100) / 100) * newActD;
  const newSeqD = Math.max(1e-6, newSeqHi - newSeqLo);

  const relScLo = targetSceneStart - newSeqLo;
  const relScHi = targetSceneEnd - newSeqLo;
  const scFrom = (relScLo / newSeqD) * 100;
  const scTo = (relScHi / newSeqD) * 100;

  return {
    act: { pct_from: actFrom, pct_to: actTo },
    sequence: {
      pct_from: clamp(seqFrom, 0, 100),
      pct_to: clamp(seqTo, clamp(seqFrom, 0, 100) + 1e-3, 100),
    },
    scene: {
      pct_from: clamp(scFrom, 0, 100),
      pct_to: clamp(scTo, clamp(scFrom, 0, 100) + 1e-3, 100),
    },
  };
}

/**
 * Expand scene/sequence/act pct so global [needStartSec, needEndSec] fits inside all three shells.
 * Use content bounds (clips, hull) for need — not identical to sceneBlock alone when clips protrude.
 */
export function expandStructurePctToFitGlobalNeed(args: {
  needStartSec: number;
  needEndSec: number;
  actBlock: { id: string; startSec: number; endSec: number };
  sequenceBlock: { id: string; startSec: number; endSec: number };
  sceneBlock: { id: string; startSec: number; endSec: number };
  totalDur: number;
}): { act?: PctRange; sequence?: PctRange; scene?: PctRange } {
  const {
    needStartSec,
    needEndSec,
    sceneBlock,
    sequenceBlock,
    actBlock,
    totalDur,
  } = args;
  const eps = 1e-3;
  if (
    needStartSec >= sceneBlock.startSec - eps &&
    needEndSec <= sceneBlock.endSec + eps &&
    needStartSec >= sequenceBlock.startSec - eps &&
    needEndSec <= sequenceBlock.endSec + eps &&
    needStartSec >= actBlock.startSec - eps &&
    needEndSec <= actBlock.endSec + eps
  ) {
    return {};
  }

  const targetSceneStart = Math.min(needStartSec, sceneBlock.startSec);
  const targetSceneEnd = Math.max(needEndSec, sceneBlock.endSec);

  const triple = computePctTripleFromTargetSceneSpan({
    targetSceneStart,
    targetSceneEnd,
    actBlock,
    sequenceBlock,
    totalDur,
  });
  if (!triple) return {};
  return { act: triple.act, sequence: triple.sequence, scene: triple.scene };
}

/**
 * NLE clip: expand when clip extends outside scene block.
 */
export function expandStructurePctToFitClip(args: {
  clip: { startSec: number; endSec: number; sceneId: string };
  actBlock: { id: string; startSec: number; endSec: number };
  sequenceBlock: { id: string; startSec: number; endSec: number };
  sceneBlock: { id: string; startSec: number; endSec: number };
  totalDur: number;
}): { act?: PctRange; sequence?: PctRange; scene?: PctRange } {
  const { clip, actBlock, sequenceBlock, sceneBlock, totalDur } = args;
  if (clip.sceneId !== sceneBlock.id) return {};

  if (
    clip.startSec >= sceneBlock.startSec &&
    clip.endSec <= sceneBlock.endSec
  ) {
    return {};
  }

  return expandStructurePctToFitGlobalNeed({
    needStartSec: clip.startSec,
    needEndSec: clip.endSec,
    actBlock,
    sequenceBlock,
    sceneBlock,
    totalDur,
  });
}

/**
 * Sequence-level: ensure [needStartSec, needEndSec] fits in sequence and act shells.
 */
export function expandActSequencePctToFitGlobalNeed(args: {
  needStartSec: number;
  needEndSec: number;
  actBlock: { id: string; startSec: number; endSec: number };
  sequenceBlock: { id: string; startSec: number; endSec: number };
  totalDur: number;
}): { act?: PctRange; sequence?: PctRange } {
  const { needStartSec, needEndSec, actBlock, sequenceBlock, totalDur } = args;
  const eps = 1e-3;
  if (
    needStartSec >= sequenceBlock.startSec - eps &&
    needEndSec <= sequenceBlock.endSec + eps &&
    needStartSec >= actBlock.startSec - eps &&
    needEndSec <= actBlock.endSec + eps
  ) {
    return {};
  }

  const targetSeqStart = Math.min(needStartSec, sequenceBlock.startSec);
  const targetSeqEnd = Math.max(needEndSec, sequenceBlock.endSec);

  const actLo = actBlock.startSec;
  const actHi = actBlock.endSec;
  let needActLo = Math.min(targetSeqStart, actLo);
  let needActHi = Math.max(targetSeqEnd, actHi);
  needActLo = clamp(needActLo, 0, totalDur);
  needActHi = clamp(needActHi, 0, totalDur);
  if (needActHi - needActLo < 1e-3) return {};

  const actFrom = (needActLo / totalDur) * 100;
  const actTo = (needActHi / totalDur) * 100;
  const newActLo = (actFrom / 100) * totalDur;
  const newActHi = (actTo / 100) * totalDur;
  const newActD = Math.max(1e-6, newActHi - newActLo);

  const relSeqLo = targetSeqStart - newActLo;
  const relSeqHi = targetSeqEnd - newActLo;
  const seqFrom = (relSeqLo / newActD) * 100;
  const seqTo = (relSeqHi / newActD) * 100;

  return {
    act: { pct_from: actFrom, pct_to: actTo },
    sequence: {
      pct_from: clamp(seqFrom, 0, 100),
      pct_to: clamp(seqTo, clamp(seqFrom, 0, 100) + 1e-3, 100),
    },
  };
}

/**
 * Act only: widen act pct when children need more global span than current act shell.
 */
export function expandActPctToFitGlobalNeed(args: {
  needStartSec: number;
  needEndSec: number;
  actBlock: { id: string; startSec: number; endSec: number };
  totalDur: number;
}): { act?: PctRange } {
  const { needStartSec, needEndSec, actBlock, totalDur } = args;
  const eps = 1e-3;
  if (
    needStartSec >= actBlock.startSec - eps &&
    needEndSec <= actBlock.endSec + eps
  ) {
    return {};
  }

  const needActLo = clamp(
    Math.min(needStartSec, actBlock.startSec),
    0,
    totalDur,
  );
  const needActHi = clamp(Math.max(needEndSec, actBlock.endSec), 0, totalDur);
  if (needActHi - needActLo < 1e-3) return {};

  return {
    act: {
      pct_from: (needActLo / totalDur) * 100,
      pct_to: (needActHi / totalDur) * 100,
    },
  };
}
