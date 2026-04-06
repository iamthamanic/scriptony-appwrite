/**
 * Shot audio item routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  getParam,
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";
import { deleteStorageFileByUrl } from "../../../_shared/storage";
import { mapShotAudio } from "../../../_shared/timeline";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const audioId = getParam(req, "id");
    if (!audioId) {
      sendBadRequest(res, "id is required");
      return;
    }

    if (req.method === "PATCH") {
      const body = await readJsonBody<Record<string, any>>(req);
      const changes = {
        label: body.label,
        start_time: body.startTime ?? body.start_time,
        end_time: body.endTime ?? body.end_time,
        fade_in: body.fadeIn ?? body.fade_in,
        fade_out: body.fadeOut ?? body.fade_out,
        waveform_data: body.peaks ?? body.waveform_data,
        audio_duration: body.duration ?? body.audio_duration,
      };

      const cleanedChanges = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined)
      );

      const updated = await requestGraphql<{
        update_shot_audio_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateShotAudio($id: uuid!, $changes: shot_audio_set_input!) {
            update_shot_audio_by_pk(pk_columns: { id: $id }, _set: $changes) {
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
          id: audioId,
          changes: cleanedChanges,
        }
      );

      sendJson(res, 200, { audio: updated.update_shot_audio_by_pk ? mapShotAudio(updated.update_shot_audio_by_pk) : null });
      return;
    }

    if (req.method === "DELETE") {
      const existing = await requestGraphql<{
        shot_audio_by_pk: { id: string; file_url: string | null } | null;
      }>(
        `
          query GetShotAudioFile($id: uuid!) {
            shot_audio_by_pk(id: $id) {
              id
              file_url
            }
          }
        `,
        { id: audioId }
      );

      await requestGraphql(
        `
          mutation DeleteShotAudio($id: uuid!) {
            delete_shot_audio_by_pk(id: $id) {
              id
            }
          }
        `,
        { id: audioId }
      );

      await deleteStorageFileByUrl(existing.shot_audio_by_pk?.file_url);

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["PATCH", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
