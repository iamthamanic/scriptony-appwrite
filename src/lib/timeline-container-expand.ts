/**
 * PHASE1: Expand structure `metadata.pct_*` so a clip's global [startSec,endSec]
 * fits inside its scene (and parents as needed). Callers persist via TimelineAPI.
 */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export interface PctRange {
  pct_from: number;
  pct_to: number;
}

/**
 * Minimal expansion: widen scene, then sequence, then act in global seconds using current block bounds.
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

  if (clip.startSec >= sceneBlock.startSec && clip.endSec <= sceneBlock.endSec) {
    return {};
  }

  const targetSceneStart = Math.min(clip.startSec, sceneBlock.startSec);
  const targetSceneEnd = Math.max(clip.endSec, sceneBlock.endSec);

  const actLo = actBlock.startSec;
  const actHi = actBlock.endSec;
  const actD = Math.max(1e-6, actHi - actLo);

  const seqLo0 = sequenceBlock.startSec;
  const seqHi0 = sequenceBlock.endSec;

  // 1) Sequence must cover at least [targetSceneStart, targetSceneEnd] (scene lives inside sequence)
  let needSeqLo = Math.min(targetSceneStart, seqLo0);
  let needSeqHi = Math.max(targetSceneEnd, seqHi0);

  // 2) Act must cover sequence needs
  let needActLo = Math.min(needSeqLo, actLo);
  let needActHi = Math.max(needSeqHi, actHi);

  // 3) Project bounds [0, totalDur]
  needActLo = clamp(needActLo, 0, totalDur);
  needActHi = clamp(needActHi, 0, totalDur);
  if (needActHi - needActLo < 1e-3) return {};

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
    sequence: { pct_from: clamp(seqFrom, 0, 100), pct_to: clamp(seqTo, clamp(seqFrom, 0, 100) + 1e-3, 100) },
    scene: { pct_from: clamp(scFrom, 0, 100), pct_to: clamp(scTo, clamp(scFrom, 0, 100) + 1e-3, 100) },
  };
}
