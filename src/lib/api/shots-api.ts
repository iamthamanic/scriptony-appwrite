/**
 * Shot API Client
 * 
 * 🚀 MIGRATED TO API GATEWAY + AUDIO MICROSERVICE
 * 
 * Helper functions for Shot CRUD operations, file uploads, and character management.
 * - Shot CRUD / image upload → API Gateway → scriptony-shots
 * - Audio operations → API Gateway → scriptony-audio
 */

import { apiGet, apiPost, apiPut, apiDelete, unwrapApiResult } from '../api-client';
import type { Shot, ShotAudio } from '../types';
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from '../api-gateway';
import { prepareImageFileForUpload, type ImageUploadGifMode } from '../image-upload-prep';
import { assertPreparedImageWithinUploadLimit, fileToBase64 } from './image-upload-api';
import { narrativeStructureToInitializeProjectPayload } from '../narrative-structure-init';

// API Base URLs for direct file uploads
const TIMELINE_API_BASE = buildFunctionRouteUrl(EDGE_FUNCTIONS.TIMELINE_V2);
const AUDIO_API_BASE = buildFunctionRouteUrl(EDGE_FUNCTIONS.AUDIO);

// =============================================================================
// SHOT CRUD
// =============================================================================

export async function getShots(sceneId: string, accessToken: string): Promise<Shot[]> {
  // scriptony-shots: GET /shots/by-scene/:sceneId (nicht /shots/:id — das ist ein einzelner Shot)
  const result = await apiGet(`/shots/by-scene/${encodeURIComponent(sceneId)}`);
  const data = unwrapApiResult(result);
  return data?.shots || [];
}

export async function getShot(shotId: string, accessToken: string): Promise<Shot> {
  const result = await apiGet(`/shots/${shotId}`);
  const data = unwrapApiResult(result);
  return data?.shot || data;
}

export async function createShot(
  sceneId: string,
  shotData: Partial<Shot>,
  accessToken: string
): Promise<Shot> {
  console.log('[Shots API] Creating shot:', { sceneId, shotData });
  
  try {
    // Extract project_id from shotData
    const projectId = (shotData as any).projectId || (shotData as any).project_id;
    
    // Convert ALL camelCase to snake_case for backend
    const payload: any = {
      scene_id: sceneId,
      project_id: projectId,
    };
    
    // Map common camelCase fields to snake_case
    if ((shotData as any).shotNumber !== undefined) {
      payload.shot_number = (shotData as any).shotNumber;
    }
    if (shotData.description !== undefined) {
      payload.description = shotData.description;
    }
    if (shotData.duration !== undefined) {
      payload.duration = shotData.duration;
    }
    if ((shotData as any).cameraAngle !== undefined) {
      payload.camera_angle = (shotData as any).cameraAngle;
    }
    if ((shotData as any).shotType !== undefined) {
      payload.shot_type = (shotData as any).shotType;
    }
    if ((shotData as any).imageUrl !== undefined) {
      payload.image_url = (shotData as any).imageUrl;
    }
    
    const result = await apiPost('/shots', payload);
    
    console.log('[Shots API] Raw result:', result);
    const data = unwrapApiResult(result);
    console.log('[Shots API] Unwrapped data:', data);
    return data?.shot || data;
  } catch (error) {
    console.error('[Shots API] Error creating shot:', {
      sceneId,
      shotData,
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Strip values Appwrite url attributes reject; skip data-URL optimistic previews. */
function sanitizeShotUpdatePayload(updates: Partial<Shot>): Partial<Shot> {
  const out: Partial<Shot> = { ...updates };
  if (out.imageUrl !== undefined) {
    const u = out.imageUrl;
    if (typeof u !== "string" || !u.trim() || u.startsWith("data:")) {
      delete out.imageUrl;
    }
  }
  return out;
}

export async function updateShot(
  shotId: string,
  updates: Partial<Shot>,
  accessToken: string
): Promise<Shot | undefined> {
  const payload = sanitizeShotUpdatePayload(updates) as Record<string, unknown>;
  // Appwrite `shotlength_*` attributes are integers; floats break updates.
  if (typeof payload.shotlengthMinutes === 'number' && Number.isFinite(payload.shotlengthMinutes)) {
    payload.shotlengthMinutes = Math.max(0, Math.round(payload.shotlengthMinutes));
  }
  if (typeof payload.shotlengthSeconds === 'number' && Number.isFinite(payload.shotlengthSeconds)) {
    payload.shotlengthSeconds = Math.max(0, Math.round(payload.shotlengthSeconds));
  }
  if (Object.keys(payload).length === 0) {
    return undefined;
  }
  console.log('[Shots API] updateShot called:', { shotId, updates: payload, updateType: typeof payload });
  const result = await apiPut(`/shots/${shotId}`, payload);
  const data = unwrapApiResult(result);
  return data?.shot || data;
}

export async function deleteShot(shotId: string, accessToken: string): Promise<void> {
  const result = await apiDelete(`/shots/${shotId}`);
  unwrapApiResult(result);
}

export async function reorderShots(
  sceneId: string,
  shotIds: string[],
  accessToken: string
): Promise<void> {
  const result = await apiPost('/shots/reorder', {
    scene_id: sceneId,
    shot_ids: shotIds,
  });
  unwrapApiResult(result);
}

// =============================================================================
// FILE UPLOADS
// =============================================================================

export async function uploadShotImage(
  shotId: string,
  file: File,
  accessToken: string,
  prepOptions?: { gifMode?: ImageUploadGifMode }
): Promise<string> {
  const ready = await prepareImageFileForUpload(file, prepOptions);
  assertPreparedImageWithinUploadLimit(ready, 5);
  const base64 = await fileToBase64(ready);
  // Route through API Gateway to avoid browser-side CORS preflight failures
  // against direct function origins.
  const result = await apiPost(`/shots/${shotId}/upload-image`, {
    fileBase64: base64,
    fileName: ready.name,
    mimeType: ready.type,
  });
  const data = unwrapApiResult(result) as { imageUrl?: string; image_url?: string; data?: { imageUrl?: string } };
  const url = data?.imageUrl ?? data?.image_url ?? data?.data?.imageUrl;
  if (!url || typeof url !== "string") {
    throw new Error("Upload antwortete ohne imageUrl — bitte scriptony-shots deployen und Logs prüfen.");
  }
  return url;
}

/**
 * Lädt ein StageDocument (JSON) in den stage-documents Bucket und setzt stage2d_file_id / stage3d_file_id am Shot.
 */
export async function uploadShotStageDocument(
  shotId: string,
  document: unknown,
  kind: "stage2d" | "stage3d",
  _accessToken: string
): Promise<{ fileId?: string; fileUrl?: string }> {
  const result = await apiPost(`/shots/${shotId}/upload-stage-document`, {
    kind,
    document,
  });
  const data = unwrapApiResult(result) as { fileId?: string; fileUrl?: string; shot?: Shot };
  return { fileId: data?.fileId, fileUrl: data?.fileUrl };
}

export async function uploadShotAudio(
  shotId: string,
  file: File,
  type: 'music' | 'sfx',
  accessToken: string,
  label?: string,
  startTime?: number,
  endTime?: number,
  fadeIn?: number,
  fadeOut?: number
): Promise<ShotAudio> {
  console.log(`[Shots API] Uploading audio to scriptony-audio function:`, { shotId, fileName: file.name, type });

  const base64 = await fileToBase64(file);

  const response = await fetch(`${AUDIO_API_BASE}/shots/${shotId}/upload-audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64: base64,
      fileName: file.name,
      mimeType: file.type,
      type,
      ...(label !== undefined && { label }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(fadeIn !== undefined && { fadeIn }),
      ...(fadeOut !== undefined && { fadeOut }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Shots API] Audio upload failed:`, { status: response.status, errorText });
    throw new Error(`Failed to upload audio: ${response.statusText}`);
  }

  const { audio } = await response.json();
  console.log(`[Shots API] Audio uploaded successfully:`, audio);
  return audio;
}

export async function updateShotAudio(
  audioId: string,
  updates: { label?: string; startTime?: number; endTime?: number; fadeIn?: number; fadeOut?: number },
  accessToken: string
): Promise<ShotAudio> {
  console.log(`[Shots API] Updating audio via scriptony-audio:`, { audioId, updates });
  
  const response = await fetch(`${AUDIO_API_BASE}/shots/audio/${audioId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Shots API] Audio update failed:`, { status: response.status, errorText });
    throw new Error(`Failed to update audio: ${response.statusText}`);
  }

  const { audio } = await response.json();
  console.log(`[Shots API] Audio updated successfully:`, audio);
  return audio;
}

export async function deleteShotAudio(audioId: string, accessToken: string): Promise<void> {
  console.log(`[Shots API] Deleting audio via scriptony-audio:`, { audioId });
  
  const response = await fetch(`${AUDIO_API_BASE}/shots/audio/${audioId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Shots API] Audio deletion failed:`, { status: response.status, errorText });
    throw new Error(`Failed to delete audio: ${response.statusText}`);
  }
  
  console.log(`[Shots API] Audio deleted successfully`);
}

export async function getShotAudio(shotId: string, accessToken: string): Promise<ShotAudio[]> {
  console.log(`[Shots API] Getting audio for shot via scriptony-audio:`, { shotId });
  
  const response = await fetch(`${AUDIO_API_BASE}/shots/${shotId}/audio`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Shots API] Get shot audio failed:`, { status: response.status, errorText });
    throw new Error(`Failed to get shot audio: ${response.statusText}`);
  }

  const { audio } = await response.json();
  console.log(`[Shots API] Got ${audio?.length || 0} audio files for shot`);
  return audio || [];
}

/**
 * BATCH: Get audio for multiple shots in one request
 * This is much more efficient than calling getShotAudio() for each shot individually
 */
export async function getBatchShotAudio(
  shotIds: string[],
  accessToken: string
): Promise<Record<string, ShotAudio[]>> {
  if (shotIds.length === 0) {
    return {};
  }

  console.log(`[Shots API] BATCH: Getting audio for ${shotIds.length} shots`);
  
  const response = await fetch(
    `${AUDIO_API_BASE}/shots/audio/batch?shot_ids=${shotIds.join(',')}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Shots API] Batch audio fetch failed:`, { status: response.status, errorText });
    throw new Error(`Failed to get batch audio: ${response.statusText}`);
  }

  const { audio } = await response.json();
  console.log(`[Shots API] BATCH: Got audio for ${Object.keys(audio).length} shots`);
  return audio;
}

// =============================================================================
// CHARACTER MANAGEMENT
// =============================================================================

export async function addCharacterToShot(
  shotId: string,
  characterId: string,
  accessToken: string
): Promise<{ id: string; projectId: string; sceneId: string; characters: any[] }> {
  const response = await fetch(`${TIMELINE_API_BASE}/shots/${shotId}/characters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      character_id: characterId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    console.error('[Shots API] Error adding character to shot:', errorData);
    throw new Error(`Failed to add character to shot: ${errorData.error || response.statusText}`);
  }

  const { shot } = await response.json();
  return shot;
}

export async function removeCharacterFromShot(
  shotId: string,
  characterId: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(`${TIMELINE_API_BASE}/shots/${shotId}/characters/${characterId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to remove character from shot: ${response.statusText}`);
  }
}

// =============================================================================
// BULK LOADERS - Performance Optimized 🚀
// =============================================================================

/**
 * Get ALL shots for a project in ONE API call
 */
export async function getAllShotsByProject(
  projectId: string,
  accessToken: string
): Promise<Shot[]> {
  const result = await apiGet(`/shots?project_id=${projectId}`);
  const data = unwrapApiResult(result);
  return data?.shots || [];
}

// =============================================================================
// PROJECT INITIALIZATION
// =============================================================================

/**
 * One in-flight init chain per project. Call only from explicit flows (e.g. user
 * button in FilmDropdown, script import / persist, optional new-project script path).
 * Loaders and prefetch must not call this — avoids duplicate parallel inits.
 */
const threeActInitTailByProject = new Map<string, Promise<unknown>>();

/**
 * Initialize top-level timeline nodes from project `narrative_structure` (V2 initialize-project).
 * Throws if the structure is not mapped — callers must check mapping first for UX.
 */
export async function initializeTimelineStructureFromNarrative(
  projectId: string,
  accessToken: string,
  narrativeStructure: string | null | undefined
): Promise<any> {
  const body = narrativeStructureToInitializeProjectPayload(narrativeStructure);
  if (!body) {
    throw new Error('NARRATIVE_INIT_UNSUPPORTED');
  }

  const queuedAfter = threeActInitTailByProject.get(projectId) ?? Promise.resolve();

  const run = queuedAfter.then(async () => {
    const TimelineAPI = await import('./timeline-api');
    const { initializeProject } = await import('./timeline-api-v2');

    const acts = await TimelineAPI.getActs(projectId, accessToken);
    if (acts && acts.length > 0) {
      return { nodes: acts };
    }

    const nodes = await initializeProject({
      projectId,
      ...body,
    });

    return { nodes };
  });

  threeActInitTailByProject.set(projectId, run.catch(() => undefined));

  return run;
}

/**
 * Backwards-compatible alias: classic 3-act film acts (same as `narrative_structure` `3-act`).
 */
export async function initializeThreeActStructure(
  projectId: string,
  accessToken: string
): Promise<any> {
  return initializeTimelineStructureFromNarrative(projectId, accessToken, '3-act');
}