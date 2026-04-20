/**
 * Timeline node item routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  getParam,
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
import {
  getNodeById,
  mapNode,
  normalizeNodeInput,
} from "../../_shared/timeline";

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

    const nodeId = getParam(req, "id");
    if (!nodeId) {
      sendBadRequest(res, "id is required");
      return;
    }

    if (req.method === "GET") {
      const node = await getNodeById(nodeId);
      if (!node) {
        sendNotFound(res, "Node not found");
        return;
      }

      sendJson(res, 200, { node: mapNode(node) });
      return;
    }

    if (req.method === "PUT") {
      const existing = await getNodeById(nodeId);
      if (!existing) {
        sendNotFound(res, "Node not found");
        return;
      }

      const body = await readJsonBody<Record<string, any>>(req);
      const updates = normalizeNodeInput(body);
      delete updates.project_id;
      delete updates.template_id;
      delete updates.level;
      delete updates.parent_id;

      const updated = await requestGraphql<{
        update_timeline_nodes_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateTimelineNode($id: uuid!, $changes: timeline_nodes_set_input!) {
            update_timeline_nodes_by_pk(pk_columns: { id: $id }, _set: $changes) {
              id
              project_id
              template_id
              level
              parent_id
              title
              summary
              order_index
              node_type
              scene_id
              metadata_json
              created_at
              updated_at
            }
          }
        `,
        {
          id: nodeId,
          changes: updates,
        },
      );

      sendJson(res, 200, {
        node: mapNode(updated.update_timeline_nodes_by_pk || existing),
      });
      return;
    }

    if (req.method === "DELETE") {
      await requestGraphql(
        `
          mutation DeleteTimelineNode($id: uuid!) {
            delete_timeline_nodes_by_pk(id: $id) {
              id
            }
          }
        `,
        { id: nodeId },
      );

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
