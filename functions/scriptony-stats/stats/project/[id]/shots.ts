/**
 * Project shot analytics route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../../../_shared/auth";
import {
  countBy,
  getProjectStatsPayload,
  toDurationSeconds,
} from "../../../../../_shared/observability";
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

    const payload = await getProjectStatsPayload(projectId);
    const durations = payload.shots.map(toDurationSeconds).filter((value) => value > 0);
    const durationStats = durations.length
      ? {
          average: Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
          min: Math.min(...durations),
          max: Math.max(...durations),
          total: durations.reduce((sum, value) => sum + value, 0),
        }
      : { average: 0, min: 0, max: 0, total: 0 };

    sendJson(res, 200, {
      total_shots: payload.shots.length,
      duration_stats: durationStats,
      camera_angles: countBy(payload.shots, "camera_angle", "Not Set"),
      framings: countBy(payload.shots, "framing", "Not Set"),
      lenses: countBy(payload.shots, "lens", "Not Set"),
      movements: countBy(payload.shots, "camera_movement", "Static"),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
