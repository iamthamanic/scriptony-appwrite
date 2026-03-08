/**
 * Project overview stats route for the Nhost compatibility layer.
 */

import { requireUserBootstrap } from "../../../../../_shared/auth";
import { getProjectStatsPayload, toDurationSeconds } from "../../../../../_shared/observability";
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
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
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

    const payload = await getProjectStatsPayload(projectId);
    const totalDuration = payload.shots.reduce((sum, shot) => sum + toDurationSeconds(shot), 0);

    sendJson(res, 200, {
      timeline: {
        acts: payload.nodes.filter((node) => node.level === 1).length,
        sequences: payload.nodes.filter((node) => node.level === 2).length,
        scenes: payload.nodes.filter((node) => node.level === 3).length,
        shots: payload.shots.length,
        total_duration: totalDuration,
      },
      content: {
        characters: payload.characters.length,
        worlds: payload.worlds.length,
      },
      metadata: {
        type: payload.project?.type || "film",
        genre: payload.project?.genre || null,
        created_at: payload.project?.created_at || null,
        updated_at: payload.project?.updated_at || null,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
