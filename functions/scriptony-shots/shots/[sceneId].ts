/**
 * Scene-scoped shot routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
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
import { getShots, mapShot } from "../../../_shared/timeline";

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

    const sceneId = getParam(req, "sceneId");
    if (!sceneId) {
      sendBadRequest(res, "sceneId is required");
      return;
    }

    const shots = await getShots({ sceneId });
    sendJson(res, 200, { shots: shots.map(mapShot) });
  } catch (error) {
    sendServerError(res, error);
  }
}
