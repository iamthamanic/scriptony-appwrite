/**
 * Superadmin stats route for the Scriptony HTTP API.
 */

import { requestGraphql } from "../../_shared/graphql-compat";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from "../../_shared/http";
import { requireSuperadmin } from "../_shared";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const bootstrap = await requireSuperadmin(req, res);
    if (!bootstrap) {
      return;
    }

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const data = await requestGraphql<{
      users_aggregate: { aggregate: { count: number } | null };
      organizations_aggregate: { aggregate: { count: number } | null };
      projects_aggregate: { aggregate: { count: number } | null };
      worlds_aggregate: { aggregate: { count: number } | null };
    }>(
      `
        query GetSuperadminStats {
          users_aggregate { aggregate { count } }
          organizations_aggregate { aggregate { count } }
          projects_aggregate(where: { _or: [{ is_deleted: { _eq: false } }, { is_deleted: { _is_null: true } }] }) {
            aggregate { count }
          }
          worlds_aggregate { aggregate { count } }
        }
      `,
    );

    sendJson(res, 200, {
      stats: {
        totalUsers: data.users_aggregate.aggregate?.count || 0,
        totalOrganizations: data.organizations_aggregate.aggregate?.count || 0,
        totalProjects: data.projects_aggregate.aggregate?.count || 0,
        totalWorlds: data.worlds_aggregate.aggregate?.count || 0,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
