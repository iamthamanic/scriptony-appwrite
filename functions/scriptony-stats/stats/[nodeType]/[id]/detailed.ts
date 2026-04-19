/**
 * Detailed node stats route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../../../../_shared/auth";
import {
  getParam,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../../../../../_shared/http";

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

    const nodeType = getParam(req, "nodeType");
    const id = getParam(req, "id");
    if (!nodeType || !id) {
      sendBadRequest(res, "nodeType and id are required");
      return;
    }

    sendJson(res, 200, {
      timeline_analytics: [],
      character_analytics: [],
      media_analytics: { audio: 0, images: 0 },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
