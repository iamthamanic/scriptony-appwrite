/**
 * Audio Tracks Routes — Audio Production Orchestration.
 *
 * Verantwortung (T07):
 *   Track-Management: Dialog, Musik, SFX, Atmo auf Timeline-Ebene.
 *   Technische Audio-Processing/Engine-Logik ist VERBOTEN hier.
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  getQuery,
  getParam,
  readJsonBody,
  sendJson,
  sendBadRequest,
  sendUnauthorized,
  sendServerError,
  sendMethodNotAllowed,
  sendNotFound,
} from "../../_shared/http";
import { requestGraphql } from "../../_shared/graphql-compat";

async function listTracks(req: RequestLike, res: ResponseLike): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const sceneId = getQuery(req, "sceneId") || getParam(req, "sceneId");
  if (!sceneId) {
    sendBadRequest(res, "sceneId is required");
    return;
  }

  try {
    const data = await requestGraphql<{
      scene_audio_tracks: Array<Record<string, unknown>>;
    }>(
      `
      query GetAudioTracks($sceneId: uuid!) {
        scene_audio_tracks(
          where: { scene_id: { _eq: $sceneId } }
          order_by: { start_time: asc }
        ) {
          id
          scene_id
          project_id
          type
          content
          character_id
          audio_file_id
          waveform_data
          start_time
          duration
          fade_in
          fade_out
          tts_voice_id
          tts_settings
          tts_audio_generated
          created_at
          updated_at
        }
      }
    `,
      { sceneId },
    );

    sendJson(res, 200, { tracks: data.scene_audio_tracks });
  } catch (error) {
    console.error("[Audio Story] Error fetching tracks:", error);
    sendServerError(res, error);
  }
}

async function createTrack(req: RequestLike, res: ResponseLike): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const {
    sceneId,
    type,
    content,
    characterId,
    startTime,
    duration,
    projectId,
  } = body;

  if (!sceneId || !type || !projectId) {
    sendBadRequest(res, "sceneId, type, and projectId are required");
    return;
  }

  try {
    const data = await requestGraphql<{
      insert_scene_audio_tracks_one: Record<string, unknown>;
    }>(
      `
      mutation CreateAudioTrack($object: scene_audio_tracks_insert_input!) {
        insert_scene_audio_tracks_one(object: $object) {
          id
          scene_id
          project_id
          type
          content
          character_id
          start_time
          duration
          created_at
          updated_at
        }
      }
    `,
      {
        object: {
          scene_id: sceneId,
          project_id: projectId,
          type,
          content: content || null,
          character_id: characterId || null,
          start_time: startTime || 0,
          duration: duration || 0,
          created_by: bootstrap.user.id,
        },
      },
    );

    sendJson(res, 201, { track: data.insert_scene_audio_tracks_one });
  } catch (error) {
    console.error("[Audio Story] Error creating track:", error);
    sendServerError(res, error);
  }
}

async function updateTrack(
  req: RequestLike,
  res: ResponseLike,
  trackId: string,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);

  // KISS: Allowlist — nur erlaubte Felder durchreichen.
  const allowed = [
    "type",
    "content",
    "character_id",
    "start_time",
    "duration",
    "fade_in",
    "fade_out",
    "tts_voice_id",
    "tts_settings",
    "audio_file_id",
    "waveform_data",
  ];
  const set = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k)),
  );

  try {
    const data = await requestGraphql<{
      update_scene_audio_tracks_by_pk: Record<string, unknown> | null;
    }>(
      `
      mutation UpdateAudioTrack($id: uuid!, $set: scene_audio_tracks_set_input!) {
        update_scene_audio_tracks_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
          type
          content
          character_id
          start_time
          duration
          fade_in
          fade_out
          updated_at
        }
      }
    `,
      { id: trackId, set },
    );

    if (!data.update_scene_audio_tracks_by_pk) {
      sendNotFound(res, "Track not found");
      return;
    }

    sendJson(res, 200, { track: data.update_scene_audio_tracks_by_pk });
  } catch (error) {
    console.error("[Audio Story] Error updating track:", error);
    sendServerError(res, error);
  }
}

async function deleteTrack(
  req: RequestLike,
  res: ResponseLike,
  trackId: string,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  try {
    await requestGraphql(
      `
      mutation DeleteAudioTrack($id: uuid!) {
        delete_scene_audio_tracks_by_pk(id: $id) {
          id
        }
      }
    `,
      { id: trackId },
    );

    sendJson(res, 200, { success: true });
  } catch (error) {
    console.error("[Audio Story] Error deleting track:", error);
    sendServerError(res, error);
  }
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const pathname = (req.path || req.url || "/") as string;

  // GET /tracks?sceneId=xxx
  if (req.method === "GET" && !pathname.match(/tracks\/[\w-]+/)) {
    await listTracks(req, res);
    return;
  }

  // POST /tracks
  if (req.method === "POST") {
    await createTrack(req, res);
    return;
  }

  // PUT /tracks/:id
  const trackMatch = pathname.match(/^\/tracks\/([\w-]+)$/);
  if (trackMatch) {
    const trackId = trackMatch[1];
    if (req.method === "PUT") {
      await updateTrack(req, res, trackId);
      return;
    }
    if (req.method === "DELETE") {
      await deleteTrack(req, res, trackId);
      return;
    }
  }

  sendMethodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
}
