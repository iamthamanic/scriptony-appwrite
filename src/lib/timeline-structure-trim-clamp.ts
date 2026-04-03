/**
 * PHASE1: Structure planning-trim — clamp shared boundaries so Act/Sequence/Scene/Shot
 * edges do not cut inside descendant min/max global times (incl. editorial clips).
 */

import type { TimelineData } from '../components/FilmDropdown';

const EPS = 1e-4;

/** Max global end among sequences/scenes/shots/clips under this act. */
export function maxDescendantEndInAct(
  actId: string,
  td: TimelineData,
  actBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  sequenceBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  sceneBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  shotBlocks: Array<{ id: string; startSec: number; endSec: number; sceneId?: string; scene_id?: string }>,
  clipBlocks: Array<{ sceneId: string; startSec: number; endSec: number }>
): number {
  const ab = actBlocks.find((b) => b.id === actId);
  let maxE = ab ? ab.endSec : 0;
  const seqIds = new Set((td.sequences || []).filter((s) => s.actId === actId).map((s) => s.id));
  for (const sb of sequenceBlocks) {
    if (seqIds.has(sb.id)) maxE = Math.max(maxE, sb.endSec);
  }
  const sceneIds = new Set(
    (td.scenes || [])
      .filter((sc) => sc.sequenceId != null && seqIds.has(sc.sequenceId))
      .map((sc) => sc.id)
  );
  for (const scb of sceneBlocks) {
    if (sceneIds.has(scb.id)) maxE = Math.max(maxE, scb.endSec);
  }
  for (const sh of shotBlocks) {
    const sid = (sh as any).sceneId || (sh as any).scene_id;
    if (sid && sceneIds.has(sid)) maxE = Math.max(maxE, sh.endSec);
  }
  for (const cl of clipBlocks) {
    if (sceneIds.has(cl.sceneId)) maxE = Math.max(maxE, cl.endSec);
  }
  return maxE;
}

export function minDescendantStartInAct(
  actId: string,
  td: TimelineData,
  actBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  sequenceBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  sceneBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  shotBlocks: Array<{ id: string; startSec: number; endSec: number; sceneId?: string; scene_id?: string }>,
  clipBlocks: Array<{ sceneId: string; startSec: number; endSec: number }>
): number {
  const ab = actBlocks.find((b) => b.id === actId);
  let minS = ab ? ab.startSec : Number.POSITIVE_INFINITY;
  const seqIds = new Set((td.sequences || []).filter((s) => s.actId === actId).map((s) => s.id));
  for (const sb of sequenceBlocks) {
    if (seqIds.has(sb.id)) minS = Math.min(minS, sb.startSec);
  }
  const sceneIds = new Set(
    (td.scenes || [])
      .filter((sc) => sc.sequenceId != null && seqIds.has(sc.sequenceId))
      .map((sc) => sc.id)
  );
  for (const scb of sceneBlocks) {
    if (sceneIds.has(scb.id)) minS = Math.min(minS, scb.startSec);
  }
  for (const sh of shotBlocks) {
    const sid = (sh as any).sceneId || (sh as any).scene_id;
    if (sid && sceneIds.has(sid)) minS = Math.min(minS, sh.startSec);
  }
  for (const cl of clipBlocks) {
    if (sceneIds.has(cl.sceneId)) minS = Math.min(minS, cl.startSec);
  }
  return Number.isFinite(minS) ? minS : 0;
}

export function maxDescendantEndInSequence(
  sequenceId: string,
  td: TimelineData,
  sequenceBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  sceneBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  shotBlocks: Array<{ id: string; startSec: number; endSec: number; sceneId?: string; scene_id?: string }>,
  clipBlocks: Array<{ sceneId: string; startSec: number; endSec: number }>
): number {
  const sb0 = sequenceBlocks.find((b) => b.id === sequenceId);
  let maxE = sb0 ? sb0.endSec : 0;
  const sceneIds = new Set(
    (td.scenes || []).filter((sc) => sc.sequenceId === sequenceId).map((sc) => sc.id)
  );
  for (const scb of sceneBlocks) {
    if (sceneIds.has(scb.id)) maxE = Math.max(maxE, scb.endSec);
  }
  for (const sh of shotBlocks) {
    const sid = (sh as any).sceneId || (sh as any).scene_id;
    if (sid && sceneIds.has(sid)) maxE = Math.max(maxE, sh.endSec);
  }
  for (const cl of clipBlocks) {
    if (sceneIds.has(cl.sceneId)) maxE = Math.max(maxE, cl.endSec);
  }
  return maxE;
}

export function minDescendantStartInSequence(
  sequenceId: string,
  td: TimelineData,
  sequenceBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  sceneBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  shotBlocks: Array<{ id: string; startSec: number; endSec: number; sceneId?: string; scene_id?: string }>,
  clipBlocks: Array<{ sceneId: string; startSec: number; endSec: number }>
): number {
  const sb0 = sequenceBlocks.find((b) => b.id === sequenceId);
  let minS = sb0 ? sb0.startSec : Number.POSITIVE_INFINITY;
  const sceneIds = new Set(
    (td.scenes || []).filter((sc) => sc.sequenceId === sequenceId).map((sc) => sc.id)
  );
  for (const scb of sceneBlocks) {
    if (sceneIds.has(scb.id)) minS = Math.min(minS, scb.startSec);
  }
  for (const sh of shotBlocks) {
    const sid = (sh as any).sceneId || (sh as any).scene_id;
    if (sid && sceneIds.has(sid)) minS = Math.min(minS, sh.startSec);
  }
  for (const cl of clipBlocks) {
    if (sceneIds.has(cl.sceneId)) minS = Math.min(minS, cl.startSec);
  }
  return Number.isFinite(minS) ? minS : 0;
}

export function maxDescendantEndInScene(
  sceneId: string,
  sceneBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  shotBlocks: Array<{ id: string; startSec: number; endSec: number; sceneId?: string; scene_id?: string }>,
  clipBlocks: Array<{ sceneId: string; shotId?: string; startSec: number; endSec: number }>
): number {
  const scb0 = sceneBlocks.find((b) => b.id === sceneId);
  let maxE = scb0 ? scb0.endSec : 0;
  for (const sh of shotBlocks) {
    const sid = (sh as any).sceneId || (sh as any).scene_id;
    if (sid === sceneId) maxE = Math.max(maxE, sh.endSec);
  }
  for (const cl of clipBlocks) {
    if (cl.sceneId === sceneId) maxE = Math.max(maxE, cl.endSec);
  }
  return maxE;
}

export function minDescendantStartInScene(
  sceneId: string,
  sceneBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  shotBlocks: Array<{ id: string; startSec: number; endSec: number; sceneId?: string; scene_id?: string }>,
  clipBlocks: Array<{ sceneId: string; startSec: number; endSec: number }>
): number {
  const scb0 = sceneBlocks.find((b) => b.id === sceneId);
  let minS = scb0 ? scb0.startSec : Number.POSITIVE_INFINITY;
  for (const sh of shotBlocks) {
    const sid = (sh as any).sceneId || (sh as any).scene_id;
    if (sid === sceneId) minS = Math.min(minS, sh.startSec);
  }
  for (const cl of clipBlocks) {
    if (cl.sceneId === sceneId) minS = Math.min(minS, cl.startSec);
  }
  return Number.isFinite(minS) ? minS : 0;
}

export function maxClipEndForShot(
  shotId: string,
  clipBlocks: Array<{ shotId?: string; startSec: number; endSec: number }>
): number | null {
  const rows = clipBlocks.filter((c) => c.shotId === shotId);
  if (rows.length === 0) return null;
  return rows.reduce((m, c) => Math.max(m, c.endSec), rows[0]!.endSec);
}

export function minClipStartForShot(
  shotId: string,
  clipBlocks: Array<{ shotId?: string; startSec: number; endSec: number }>
): number | null {
  const rows = clipBlocks.filter((c) => c.shotId === shotId);
  if (rows.length === 0) return null;
  return rows.reduce((m, c) => Math.min(m, c.startSec), rows[0]!.startSec);
}

/**
 * Intersect [minB,maxB] with [childLo,childHi] when trimming a boundary between siblings.
 */
export function clampBoundaryToChildren(
  boundarySec: number,
  minB: number,
  maxB: number,
  childLo: number,
  childHi: number
): number {
  const lo = Math.max(minB, childLo);
  const hi = Math.min(maxB, childHi);
  if (lo > hi + EPS) return boundarySec;
  return Math.max(lo, Math.min(hi, boundarySec));
}
