/**
 * Direct shot lookup route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import {
  getParam,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";
import { getShotById, mapShot } from "../../../_shared/timeline";

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

    const shot = await getShotById(shotId);
    if (!shot) {
      sendNotFound(res, "Shot not found");
      return;
    }

    sendJson(res, 200, { shot: mapShot(shot) });
  } catch (error) {
    sendServerError(res, error);
  }
}
