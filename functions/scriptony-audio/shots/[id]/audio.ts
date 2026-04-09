/**
 * Shot audio listing routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  getParam,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";
import { mapShotAudio } from "../../../_shared/timeline";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const shotId = getParam(req, "id");
    if (!shotId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const data = await requestGraphql<{
      shot_audio: Array<Record<string, any>>;
    }>(
      `
        query GetShotAudio($shotId: uuid!) {
          shot_audio(
            where: { shot_id: { _eq: $shotId } }
            order_by: { created_at: asc }
          ) {
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
      { shotId }
    );

    sendJson(res, 200, { audio: data.shot_audio.map(mapShotAudio) });
  } catch (error) {
    sendServerError(res, error);
  }
}
