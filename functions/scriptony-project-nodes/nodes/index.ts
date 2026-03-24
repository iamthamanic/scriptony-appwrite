/**
 * Timeline node collection routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  getQuery,
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import {
  getTimelineNodes,
  mapNode,
  normalizeNodeInput,
} from "../../_shared/timeline";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const projectId = getQuery(req, "project_id") || getQuery(req, "projectId");
      if (!projectId) {
        sendBadRequest(res, "project_id is required");
        return;
      }

      const levelValue = getQuery(req, "level");
      const parentQuery = getQuery(req, "parent_id") ?? getQuery(req, "parentId");
      const parentId =
        parentQuery === undefined ? undefined : parentQuery === "null" ? null : parentQuery;

      const nodes = await getTimelineNodes({
        projectId,
        level: levelValue ? Number(levelValue) : undefined,
        parentId,
      });

      sendJson(res, 200, { nodes: nodes.map(mapNode) });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      const nodeInput = normalizeNodeInput(body);

      if (
        !nodeInput.project_id ||
        !nodeInput.template_id ||
        !nodeInput.level ||
        !nodeInput.title
      ) {
        sendBadRequest(
          res,
          "Missing required fields: project_id, template_id, level, title"
        );
        return;
      }

      const created = await requestGraphql<{
        insert_timeline_nodes_one: Record<string, any>;
      }>(
        `
          mutation CreateTimelineNode($object: timeline_nodes_insert_input!) {
            insert_timeline_nodes_one(object: $object) {
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
          object: {
            ...nodeInput,
            order_index: nodeInput.order_index ?? 0,
            metadata_json: JSON.stringify(nodeInput.metadata ?? {}),
          },
        }
      );

      sendJson(res, 201, { node: mapNode(created.insert_timeline_nodes_one) });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
