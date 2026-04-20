/**
 * Pure film timeline geometry for shots — shared by migration and editor preview.
 * Mirrors the layout rules in VideoEditorTimeline `shotBlocks` useMemo (film branch).
 */

import {
  calculateActBlocks,
  calculateSequenceBlocks,
  calculateSceneBlocks,
} from "../components/timeline-blocks";

export const MIN_CLIP_DURATION_SEC = 1;

export interface FilmManualTimings {
  manualActTimings: Record<string, { pct_from: number; pct_to: number }>;
  manualSequenceTimings: Record<string, { pct_from: number; pct_to: number }>;
  manualSceneTimings: Record<string, { pct_from: number; pct_to: number }>;
  manualShotDurations: Record<string, number>;
}

function mergeMetadataPct(
  acts: any[],
  manual: Record<string, { pct_from: number; pct_to: number }>,
): any[] {
  return (acts || []).map((act: any) => {
    const o = manual[act.id];
    if (!o) return act;
    return {
      ...act,
      metadata: {
        ...(act.metadata || {}),
        pct_from: o.pct_from,
        pct_to: o.pct_to,
      },
    };
  });
}

function mergeSeqScene(
  sequences: any[],
  scenes: any[],
  msq: Record<string, { pct_from: number; pct_to: number }>,
  msc: Record<string, { pct_from: number; pct_to: number }>,
): { sequences: any[]; scenes: any[] } {
  return {
    sequences: (sequences || []).map((seq: any) => {
      const o = msq[seq.id];
      if (!o) return seq;
      return {
        ...seq,
        metadata: {
          ...(seq.metadata || {}),
          pct_from: o.pct_from,
          pct_to: o.pct_to,
        },
      };
    }),
    scenes: (scenes || []).map((sc: any) => {
      const o = msc[sc.id];
      if (!o) return sc;
      return {
        ...sc,
        metadata: {
          ...(sc.metadata || {}),
          pct_from: o.pct_from,
          pct_to: o.pct_to,
        },
      };
    }),
  };
}

/**
 * Effective timeline data with manual structure timings (same as VideoEditor `effectiveTimelineData` for film).
 */
export function buildEffectiveFilmTimelineData(
  timelineData: {
    acts?: any[];
    sequences?: any[];
    scenes?: any[];
    shots?: any[];
  } | null,
  timings: FilmManualTimings,
): { acts: any[]; sequences: any[]; scenes: any[]; shots: any[] } | null {
  if (!timelineData) return null;
  const withAct = mergeMetadataPct(
    timelineData.acts || [],
    timings.manualActTimings,
  );
  const { sequences: sq, scenes: sc } = mergeSeqScene(
    timelineData.sequences || [],
    timelineData.scenes || [],
    timings.manualSequenceTimings,
    timings.manualSceneTimings,
  );
  return {
    ...timelineData,
    acts: withAct,
    sequences: sq,
    scenes: sc,
    shots: timelineData.shots || [],
  };
}

function getShotDurationSec(
  shot: any,
  manualShotDurations: Record<string, number>,
): number | null {
  const override = manualShotDurations[shot.id];
  if (override !== undefined) return override;

  const mRaw = shot.shotlengthMinutes ?? shot.shotlength_minutes;
  const sRaw = shot.shotlengthSeconds ?? shot.shotlength_seconds;
  if (typeof sRaw === "number" && Number.isFinite(sRaw) && sRaw >= 0) {
    const m =
      typeof mRaw === "number" && Number.isFinite(mRaw)
        ? Math.max(0, Math.floor(mRaw))
        : 0;
    const s = Math.round(sRaw);
    const total = m * 60 + s;
    if (total > 0) return total;
  }

  const stored = shot.durationSeconds;
  if (typeof stored === "number" && Number.isFinite(stored) && stored > 0) {
    return stored;
  }

  if (typeof shot.duration === "string") {
    const s = shot.duration.trim();
    if (s.endsWith("s")) {
      const n = Number(s.slice(0, -1));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }

  return null;
}

/**
 * Returns one row per shot: global start/end in seconds (film layout).
 */
export function computeFilmShotSpans(
  timelineData: {
    acts?: any[];
    sequences?: any[];
    scenes?: any[];
    shots?: any[];
  } | null,
  duration: number,
  timings: FilmManualTimings,
): Array<{
  shotId: string;
  sceneId: string;
  startSec: number;
  endSec: number;
  orderIndex: number;
}> {
  const effective = buildEffectiveFilmTimelineData(timelineData, timings);
  if (!effective || !effective.shots?.length) return [];

  const viewStartSec = 0;
  const viewEndSec = duration;
  const pxPerSec = 1;

  const actBlocks = calculateActBlocks(
    effective,
    duration,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    false,
    undefined,
  );
  const sequenceBlocks = calculateSequenceBlocks(
    effective,
    duration,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    false,
    undefined,
    undefined,
  );
  const sceneBlocks = calculateSceneBlocks(
    effective,
    duration,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    false,
    undefined,
  );

  const sceneById = new Map(sceneBlocks.map((scene: any) => [scene.id, scene]));
  const shotsByScene = new Map<string, any[]>();

  for (const shot of effective.shots) {
    const sceneId = shot.sceneId || shot.scene_id;
    if (!sceneId) continue;
    const cur = shotsByScene.get(sceneId) || [];
    cur.push(shot);
    shotsByScene.set(sceneId, cur);
  }

  const out: Array<{
    shotId: string;
    sceneId: string;
    startSec: number;
    endSec: number;
    orderIndex: number;
  }> = [];

  for (const [sceneId, sceneShots] of shotsByScene.entries()) {
    const scene = sceneById.get(sceneId);
    if (!scene) continue;

    const orderedShots = [...sceneShots].sort((a, b) => {
      const orderA = a.orderIndex ?? a.order_index ?? 0;
      const orderB = b.orderIndex ?? b.order_index ?? 0;
      return orderA - orderB;
    });

    const sceneDuration = Math.max(0, scene.endSec - scene.startSec);
    const storedDurations = orderedShots.map((sh) =>
      getShotDurationSec(sh, timings.manualShotDurations),
    );
    const allDurationsValid = storedDurations.every(
      (d) => typeof d === "number" && (d as number) > 0,
    );

    let durations: number[];
    if (allDurationsValid && sceneDuration > 0) {
      const totalStored = (storedDurations as number[]).reduce(
        (sum, d) => sum + d,
        0,
      );
      const scale = totalStored > 0 ? sceneDuration / totalStored : 1;
      const raw = (storedDurations as number[]).map((d) =>
        Math.max(MIN_CLIP_DURATION_SEC, d * scale),
      );
      const sumAfterClamp = raw.reduce((sum, d) => sum + d, 0);
      const renorm = sumAfterClamp > 0 ? sceneDuration / sumAfterClamp : 1;
      durations = raw.map((d) => d * renorm);
    } else {
      const slotDuration = sceneDuration / Math.max(1, orderedShots.length);
      durations = orderedShots.map(() =>
        Math.max(MIN_CLIP_DURATION_SEC, slotDuration),
      );
      const sum = durations.reduce((s, d) => s + d, 0);
      const renorm = sum > 0 ? sceneDuration / sum : 1;
      durations = durations.map((d) => d * renorm);
    }

    let cursor = scene.startSec;
    orderedShots.forEach((shot, index) => {
      const startSec = cursor;
      const endSec = startSec + durations[index];
      cursor = endSec;
      out.push({
        shotId: shot.id,
        sceneId,
        startSec,
        endSec,
        orderIndex: shot.orderIndex ?? shot.order_index ?? index,
      });
    });
  }

  return out;
}
