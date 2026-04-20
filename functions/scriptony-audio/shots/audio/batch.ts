/**
 * Batch shot audio route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  getQuery,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../../_shared/http";
import { mapShotAudio } from "../../../_shared/timeline";

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

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const shotIdsParam = getQuery(req, "shot_ids");
    if (!shotIdsParam) {
      sendBadRequest(res, "shot_ids query parameter is required");
      return;
    }

    const shotIds = shotIdsParam
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (shotIds.length === 0) {
      sendJson(res, 200, { audio: {} });
      return;
    }

    const data = await requestGraphql<{
      shot_audio: Array<Record<string, any>>;
    }>(
      `
        query GetBatchShotAudio($shotIds: [uuid!]!) {
          shot_audio(
            where: { shot_id: { _in: $shotIds } }
            order_by: [{ shot_id: asc }, { created_at: asc }]
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
      { shotIds },
    );

    const grouped = Object.fromEntries(shotIds.map((id) => [id, [] as any[]]));
    for (const audio of data.shot_audio) {
      grouped[audio.shot_id] ||= [];
      grouped[audio.shot_id].push(mapShotAudio(audio));
    }

    sendJson(res, 200, { audio: grouped });
  } catch (error) {
    sendServerError(res, error);
  }
}
