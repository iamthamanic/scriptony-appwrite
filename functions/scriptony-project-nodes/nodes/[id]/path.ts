/**
 * Timeline node path routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import {
  getParam,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../../_shared/http";
import { buildNodePath, getNodeById } from "../../../_shared/timeline";
import { requireProjectAccess } from "../../../_shared/scriptony";

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

    const node = await getNodeById(nodeId);
    if (!node) {
      sendNotFound(res, "Node not found");
      return;
    }

    const _project = await requireProjectAccess(
      String(node.project_id),
      bootstrap.user.id,
      res,
    );
    if (!_project) return;

    const path = await buildNodePath(nodeId);
    sendJson(res, 200, { path });
  } catch (error) {
    sendServerError(res, error);
  }
}
