/**
 * Legacy project listing endpoint used by a few admin/debug tools.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const data = await requestGraphql<{
      projects: Array<Record<string, any>>;
    }>(
      `
        query LegacyProjectsList($organizationId: uuid!, $userId: uuid!) {
          projects(
            where: {
              _and: [
                {
                  _or: [
                    { organization_id: { _eq: $organizationId } }
                    { user_id: { _eq: $userId } }
                  ]
                }
                {
                  _or: [
                    { is_deleted: { _eq: false } }
                    { is_deleted: { _is_null: true } }
                  ]
                }
              ]
            }
            order_by: { created_at: desc }
          ) {
            id
            title
            type
            created_at
          }
        }
      `,
      {
        organizationId: bootstrap.organizationId,
        userId: bootstrap.user.id,
      },
    );

    sendJson(res, 200, data.projects);
  } catch (error) {
    sendServerError(res, error);
  }
}
