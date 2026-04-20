/**
 * Timeline node children routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import {
  getParam,
  getQuery,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../../_shared/http";
import {
  getRecursiveChildren,
  getTimelineChildren,
  mapNode,
} from "../../../_shared/timeline";

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

    const nodeId = getParam(req, "id");
    if (!nodeId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const recursive = getQuery(req, "recursive") === "true";
    const children = recursive
      ? await getRecursiveChildren(nodeId)
      : (await getTimelineChildren(nodeId)).map(mapNode);

    sendJson(res, 200, { children });
  } catch (error) {
    sendServerError(res, error);
  }
}
