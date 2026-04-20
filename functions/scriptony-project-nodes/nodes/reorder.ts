/**
 * Timeline node reorder route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import { getNodeById } from "../../_shared/timeline";
import { requireProjectAccess } from "../../_shared/scriptony";

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

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const body = await readJsonBody<{ nodeIds?: string[] }>(req);
    const nodeIds = Array.isArray(body.nodeIds) ? body.nodeIds : [];
    if (nodeIds.length === 0) {
      sendBadRequest(res, "nodeIds is required");
      return;
    }

    const firstNode = await getNodeById(nodeIds[0]);
    if (!firstNode?.project_id) {
      sendNotFound(res, "Node not found");
      return;
    }
    const _project = await requireProjectAccess(
      String(firstNode.project_id),
      bootstrap.user.id,
      res,
    );
    if (!_project) return;

    await Promise.all(
      nodeIds.map((id, index) =>
        requestGraphql(
          `
            mutation ReorderTimelineNode($id: uuid!, $orderIndex: Int!) {
              update_timeline_nodes_by_pk(
                pk_columns: { id: $id }
                _set: { order_index: $orderIndex }
              ) {
                id
              }
            }
          `,
          { id, orderIndex: index },
        )
      ),
    );

    sendJson(res, 200, { success: true });
  } catch (error) {
    sendServerError(res, error);
  }
}
