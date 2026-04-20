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
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";

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
