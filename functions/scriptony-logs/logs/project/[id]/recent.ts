/**
 * Project activity log route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../../../_shared/auth";
import { requestGraphql } from "../../../../../_shared/graphql-compat";
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

    const projectId = getParam(req, "id");
    if (!projectId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const limit = Math.min(Number(getQuery(req, "limit") || "50"), 100);
    const data = await requestGraphql<{
      activity_logs: Array<Record<string, any>>;
    }>(
      `
        query GetProjectLogs($projectId: uuid!, $limit: Int!) {
          activity_logs(
            where: { project_id: { _eq: $projectId } }
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
      { projectId, limit }
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
