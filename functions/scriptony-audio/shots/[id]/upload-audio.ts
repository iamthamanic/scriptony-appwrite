/**
 * Shot audio upload route for the Scriptony HTTP API.
 *
 * T09 LEGACY: Shot-Audio-Verwaltung ist Asset-/Timeline-Kontext,
 * keine technische Audiofaehigkeit.
 * Neue Shot-Audio-Uploads sollten ueber scriptony-assets laufen.
 *
 * T09 Schema-Mismatch (dokumentiert):
 *   Appwrite-Schema (provision-appwrite-schema.mjs):
 *     shot_id, file_name, file_size, bucket_file_id, mime_type, duration_ms,
 *     user_id, storage_path
 *   GraphQL-Schema (Route-Handler):
 *     file_url, start_time, end_time, fade_in, fade_out, waveform_data,
 *     audio_duration
 *   → Fast keine gemeinsamen Felder. Beide Schemas existieren parallel.
 *
 * T09 Delegation:
 *   Erzeugt zusaetzlich ein Asset-Dokument in scriptony-assets, damit
 *   shot_audio ueber die zentrale Asset-Domain auffindbar ist.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { getStorageBucketId } from "../../../_shared/env";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  getParam,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../../_shared/http";
import {
  ensureFile,
  getMultipartField,
  uploadFileToStorage,
} from "../../../_shared/storage";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../../../_shared/scriptony";
import { getShotById, mapShotAudio } from "../../../_shared/timeline";
import { createDocument, C } from "../../../_shared/appwrite-db";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const shotId = getParam(req, "id");
    if (!shotId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const shot = await getShotById(shotId);
    if (!shot?.project_id) {
      sendNotFound(res, "Shot not found");
      return;
    }

    const organizationIds = await getUserOrganizationIds(bootstrap.user.id);
    const project = await getAccessibleProject(
      shot.project_id,
      bootstrap.user.id,
      organizationIds,
    );
    if (!project) {
      sendNotFound(res, "Shot not found");
      return;
    }

    const type = getMultipartField(req, "type");
    if (type !== "music" && type !== "sfx") {
      sendBadRequest(res, "type must be either 'music' or 'sfx'");
      return;
    }

    const file = ensureFile(req, res, {
      maxSizeBytes: 100 * 1024 * 1024,
      accept: ["audio/"],
    });
    if (!file) {
      return;
    }

    const label = getMultipartField(req, "label") || file.name;
    const ext = file.name.split(".").pop() || "bin";
    const uploaded = await uploadFileToStorage({
      file,
      bucketId: getStorageBucketId("audioFiles"),
      name: `${shotId}-${type}-${Date.now()}.${ext}`,
      metadata: {
        entity: "shot-audio",
        entityId: shotId,
        projectId: shot.project_id,
        type,
        uploadedBy: bootstrap.user.id,
      },
    });

    const startTimeValue = getMultipartField(req, "startTime");
    const endTimeValue = getMultipartField(req, "endTime");
    const fadeInValue = getMultipartField(req, "fadeIn");
    const fadeOutValue = getMultipartField(req, "fadeOut");

    const created = await requestGraphql<{
      insert_shot_audio_one: Record<string, any>;
    }>(
      `
        mutation CreateShotAudio($object: shot_audio_insert_input!) {
          insert_shot_audio_one(object: $object) {
            id
            shot_id
            type
            file_url
            file_name
            label
            file_size
            start_time
            end_time
            fade_in
            fade_out
            waveform_data
            audio_duration
            created_at
          }
        }
      `,
      {
        object: {
          shot_id: shotId,
          type,
          file_url: uploaded.url,
          file_name: file.name,
          label,
          file_size: file.size,
          start_time: startTimeValue ? Number(startTimeValue) : null,
          end_time: endTimeValue ? Number(endTimeValue) : null,
          fade_in: fadeInValue ? Number(fadeInValue) : 0,
          fade_out: fadeOutValue ? Number(fadeOutValue) : 0,
        },
      },
    );

    // T09: zusaetzliches Asset in scriptony-assets erstellen (Domain-Delegation)
    const now = new Date().toISOString();
    try {
      await createDocument(C.assets, undefined, {
        project_id: shot.project_id,
        created_by: bootstrap.user.id,
        owner_type: "shot",
        owner_id: shotId,
        media_type: "audio",
        purpose: "shot_audio",
        file_id: uploaded.id,
        bucket_id: getStorageBucketId("audioFiles"),
        filename: file.name,
        mime_type: file.type || uploaded.mimeType,
        size: file.size,
        width: null,
        height: null,
        duration: null,
        status: "active",
        metadata: JSON.stringify({
          shot_audio_id: created.insert_shot_audio_one.id,
          type,
          label,
          start_time: startTimeValue ? Number(startTimeValue) : null,
          end_time: endTimeValue ? Number(endTimeValue) : null,
          fade_in: fadeInValue ? Number(fadeInValue) : 0,
          fade_out: fadeOutValue ? Number(fadeOutValue) : 0,
        }),
        created_at: now,
        updated_at: now,
      });
    } catch (assetError) {
      console.error("[Shot Audio] Failed to create asset:", assetError);
      // Nicht blockieren — shot_audio ist bereits erstellt
    }

    sendJson(res, 200, { audio: mapShotAudio(created.insert_shot_audio_one) });
  } catch (error) {
    sendServerError(res, error);
  }
}
