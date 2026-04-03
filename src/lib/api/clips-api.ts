/**
 * Clip API — editorial timeline segments (scriptony-clips).
 */

import { apiGet, apiPost, apiPut, apiDelete, unwrapApiResult } from '../api-client';
import type { Clip } from '../types';

export async function listClipsByProject(projectId: string, _accessToken: string): Promise<Clip[]> {
  const params = new URLSearchParams({ project_id: projectId });
  const result = await apiGet(`/clips?${params.toString()}`);
  const data = unwrapApiResult(result);
  return (data?.clips || []) as Clip[];
}

export async function listClipsByShot(shotId: string, _accessToken: string): Promise<Clip[]> {
  const params = new URLSearchParams({ shot_id: shotId });
  const result = await apiGet(`/clips?${params.toString()}`);
  const data = unwrapApiResult(result);
  return (data?.clips || []) as Clip[];
}

export async function createClip(
  payload: {
    projectId: string;
    shotId: string;
    sceneId: string;
    startSec: number;
    endSec: number;
    laneIndex?: number;
    orderIndex?: number;
    sourceInSec?: number;
    sourceOutSec?: number;
  },
  _accessToken: string
): Promise<Clip> {
  const body: Record<string, unknown> = {
    project_id: payload.projectId,
    shot_id: payload.shotId,
    scene_id: payload.sceneId,
    start_sec: payload.startSec,
    end_sec: payload.endSec,
    lane_index: payload.laneIndex ?? 0,
    order_index: payload.orderIndex ?? 0,
  };
  if (payload.sourceInSec !== undefined) body.source_in_sec = payload.sourceInSec;
  if (payload.sourceOutSec !== undefined) body.source_out_sec = payload.sourceOutSec;

  const result = await apiPost('/clips', body);
  const data = unwrapApiResult(result);
  return (data?.clip || data) as Clip;
}

export async function updateClip(
  clipId: string,
  updates: Partial<{
    startSec: number;
    endSec: number;
    laneIndex: number;
    orderIndex: number;
    sourceInSec: number | null;
    sourceOutSec: number | null;
  }>,
  _accessToken: string
): Promise<Clip> {
  const body: Record<string, unknown> = {};
  if (updates.startSec !== undefined) body.start_sec = updates.startSec;
  if (updates.endSec !== undefined) body.end_sec = updates.endSec;
  if (updates.laneIndex !== undefined) body.lane_index = updates.laneIndex;
  if (updates.orderIndex !== undefined) body.order_index = updates.orderIndex;
  if (updates.sourceInSec !== undefined) body.source_in_sec = updates.sourceInSec;
  if (updates.sourceOutSec !== undefined) body.source_out_sec = updates.sourceOutSec;

  const result = await apiPut(`/clips/${encodeURIComponent(clipId)}`, body);
  const data = unwrapApiResult(result);
  return (data?.clip || data) as Clip;
}

export async function deleteClip(clipId: string, _accessToken: string): Promise<void> {
  const result = await apiDelete(`/clips/${encodeURIComponent(clipId)}`);
  unwrapApiResult(result);
}
