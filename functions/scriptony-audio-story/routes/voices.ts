/**
 * Voice Casting Routes — Audio Production Orchestration.
 *
 * Verantwortung (T07):
 *   Voice-Casting: Zuordnung von Stimmen zu Charakteren.
 *   Technische TTS/Engine-Logik ist VERBOTEN hier — nutzt scriptony-audio.
 *
 * T07 MIGRATION:
 *   - listTTSAvailableVoices() → zu scriptony-audio migrieren.
 *     Voice Discovery ist technische Audio-Faehigkeit, nicht Production-Planung.
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
} from "../../_shared/http";
import { requestGraphql } from "../../_shared/graphql-compat";
import { canReadProject, canEditProject } from "../_shared/access";

async function listVoiceAssignments(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const projectId = getQuery(req, "projectId") || getParam(req, "projectId");
  if (!projectId) {
    sendBadRequest(res, "projectId is required");
    return;
  }
  if (!(await canReadProject(bootstrap.user.id, projectId))) {
    sendUnauthorized(res);
    return;
  }

  try {
    const data = await requestGraphql<{
      character_voice_assignments: Array<Record<string, unknown>>;
    }>(
      `
      query GetVoiceAssignments($projectId: uuid!) {
        character_voice_assignments(
          where: { project_id: { _eq: $projectId } }
        ) {
          id
          project_id
          character_id
          voice_actor_type
          voice_actor_name
          voice_actor_contact
          voice_actor_notes
          tts_provider
          tts_voice_id
          tts_voice_preset
          sample_audio_file_id
          sample_text
          created_at
          updated_at
        }
      }
    `,
      { projectId },
    );

    sendJson(res, 200, { assignments: data.character_voice_assignments });
  } catch (error) {
    console.error("[Audio Story] Error fetching voices:", error);
    sendServerError(res, error);
  }
}

async function assignVoice(req: RequestLike, res: ResponseLike): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const {
    projectId,
    characterId,
    voiceActorType,
    voiceActorName,
    voiceActorContact,
    ttsProvider,
    ttsVoiceId,
    ttsVoicePreset,
  } = body;

  if (!projectId || !characterId || !voiceActorType) {
    sendBadRequest(res, "Missing required fields");
    return;
  }
  if (!(await canEditProject(bootstrap.user.id, String(projectId)))) {
    sendUnauthorized(res);
    return;
  }

  try {
    const data = await requestGraphql<{
      insert_character_voice_assignments_one: Record<string, unknown>;
    }>(
      `
      mutation AssignVoice($object: character_voice_assignments_insert_input!) {
        insert_character_voice_assignments_one(object: $object) {
          id
          character_id
          voice_actor_type
          voice_actor_name
          tts_voice_preset
        }
      }
    `,
      {
        object: {
          project_id: projectId,
          character_id: characterId,
          voice_actor_type: voiceActorType,
          voice_actor_name: voiceActorName || null,
          voice_actor_contact: voiceActorContact || null,
          tts_provider: ttsProvider || null,
          tts_voice_id: ttsVoiceId || null,
          tts_voice_preset: ttsVoicePreset || null,
        },
      },
    );

    sendJson(res, 201, {
      assignment: data.insert_character_voice_assignments_one,
    });
  } catch (error) {
    console.error("[Audio Story] Error assigning voice:", error);
    sendServerError(res, error);
  }
}

/**
 * T07 MIGRATION: Diese Route gehoert zu `scriptony-audio` (technische Engine),
 * nicht zu `scriptony-audio-production` (Orchestration).
 *
 * T09: Statt lokaler statischer Liste an scriptony-audio /voices/tts
 * delegieren. Voice Discovery ist technische Audio-Faehigkeit.
 */
function listTTSAvailableVoices(req: RequestLike, res: ResponseLike): void {
  sendJson(res, 501, {
    error: "Not Implemented",
    message:
      "TTS Voice Discovery wurde zu scriptony-audio verschoben. " +
      "Nutze GET /voices/tts/voices bei scriptony-audio.",
  });
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const pathname = (req.path || req.url || "/") as string;

  // GET /voices?projectId=xxx
  if (
    req.method === "GET" &&
    pathname.match(/\/voices$/) &&
    !pathname.includes("/tts/")
  ) {
    await listVoiceAssignments(req, res);
    return;
  }

  // POST /voices/assign
  if (req.method === "POST" && pathname.includes("/assign")) {
    await assignVoice(req, res);
    return;
  }

  // GET /voices/tts/voices
  if (req.method === "GET" && pathname.includes("/tts/voices")) {
    listTTSAvailableVoices(req, res);
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
}
