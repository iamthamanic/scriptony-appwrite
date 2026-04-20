/**
 * Timeline node bulk creation route for the Scriptony HTTP API.
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
import { mapNode, normalizeNodeInput } from "../../_shared/timeline";
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

    const body = await readJsonBody<{ nodes?: Array<Record<string, any>> }>(
      req,
    );
    const rawNodes = Array.isArray(body.nodes) ? body.nodes : [];
    const nodes = rawNodes.map(normalizeNodeInput);

    if (
      nodes.length === 0 ||
      nodes.some(
        (node) =>
          !node.project_id || !node.template_id || !node.level || !node.title,
      )
    ) {
      sendBadRequest(
        res,
        "nodes must contain project_id, template_id, level, and title",
      );
      return;
    }

    const _project = await requireProjectAccess(
      String(nodes[0].project_id),
      bootstrap.user.id,
      res,
    );
    if (!_project) return;

    const created = await requestGraphql<{
      insert_timeline_nodes: { returning: Array<Record<string, any>> };
    }>(
      `
        mutation BulkCreateTimelineNodes($objects: [timeline_nodes_insert_input!]!) {
          insert_timeline_nodes(objects: $objects) {
            returning {
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
        }
      `,
      {
        objects: nodes.map((node) => ({
          ...node,
          order_index: node.order_index ?? 0,
          metadata_json: JSON.stringify(node.metadata ?? {}),
        })),
      },
    );

    sendJson(res, 201, {
      nodes: created.insert_timeline_nodes.returning.map(mapNode),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
