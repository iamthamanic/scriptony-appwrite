/**
 * Timeline-node activity log route for the Nhost compatibility layer.
 */

import { requireUserBootstrap } from "../../../../../_shared/auth";
import { requestGraphql } from "../../../../../_shared/hasura";
import {
  getParam,
  getQuery,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../../../_shared/http";

const ENTITY_TYPE_MAP: Record<string, string> = {
  act: "Act",
  sequence: "Sequence",
  scene: "Scene",
  shot: "Shot",
};

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

    const nodeType = getParam(req, "nodeType");
    const id = getParam(req, "id");
    if (!nodeType || !id) {
      sendBadRequest(res, "nodeType and id are required");
      return;
    }

    const entityType = ENTITY_TYPE_MAP[nodeType];
    if (!entityType) {
      sendBadRequest(res, `Unsupported nodeType: ${nodeType}`);
      return;
    }

    const limit = Math.min(Number(getQuery(req, "limit") || "20"), 50);
    const data = await requestGraphql<{
      activity_logs: Array<Record<string, any>>;
    }>(
      `
        query GetNodeLogs($entityType: String!, $entityId: uuid!, $limit: Int!) {
          activity_logs(
            where: {
              entity_type: { _eq: $entityType }
              entity_id: { _eq: $entityId }
            }
            order_by: { created_at: desc }
            limit: $limit
          ) {
            id
            created_at
            user_id
            entity_type
            entity_id
            action
            details
          }
        }
      `,
      { entityType, entityId: id, limit }
    );

    sendJson(res, 200, {
      logs: data.activity_logs.map((log) => ({
        id: log.id,
        timestamp: log.created_at,
        user: null,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        details: log.details,
        parent_path: [],
      })),
      count: data.activity_logs.length,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
