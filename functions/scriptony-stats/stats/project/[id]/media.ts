/**
 * Project media analytics route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../../../_shared/auth";
import { requestGraphql } from "../../../../../_shared/graphql-compat";
import { getProjectStatsPayload } from "../../../../../_shared/observability";
import {
  getParam,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../../../_shared/http";

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

    const projectId = getParam(req, "id");
    if (!projectId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const [payload, audioCount] = await Promise.all([
      getProjectStatsPayload(projectId),
      requestGraphql<{
        shot_audio_aggregate: { aggregate: { count: number } | null };
      }>(
        `
          query GetProjectAudioCount($projectId: uuid!) {
            shot_audio_aggregate(where: { shot: { project_id: { _eq: $projectId } } }) {
              aggregate {
                count
              }
            }
          }
        `,
        { projectId }
      ),
    ]);

    const images = payload.shots.filter((shot) => shot.image_url || shot.storyboard_url).length;

    sendJson(res, 200, {
      audio_files: audioCount.shot_audio_aggregate.aggregate?.count || 0,
      images,
      total_storage: "N/A",
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
