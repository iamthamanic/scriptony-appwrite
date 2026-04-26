/**
 * Shot audio upload route for the Scriptony HTTP API.
 *
 * T09 LEGACY: Shot-Audio-Verwaltung ist Asset-/Timeline-Kontext,
 * keine technische Audiofaehigkeit.
 * Neue Shot-Audio-Uploads sollten ueber scriptony-assets laufen.
 * Diese Route bleibt als Compatibility Wrapper bis vollstaendige Migration.
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

    sendJson(res, 200, { audio: mapShotAudio(created.insert_shot_audio_one) });
  } catch (error) {
    sendServerError(res, error);
  }
}
