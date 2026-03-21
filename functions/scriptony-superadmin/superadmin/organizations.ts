/**
 * Superadmin organizations route for the Scriptony HTTP API.
 */

import { requestGraphql } from "../../_shared/graphql-compat";
import { sendJson, sendMethodNotAllowed, sendServerError, type RequestLike, type ResponseLike } from "../../_shared/http";
import { requireSuperadmin } from "../_shared";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
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
      organizations: Array<Record<string, any>>;
      organization_members: Array<{ organization_id: string }>;
      projects: Array<{ organization_id: string }>;
      worlds: Array<{ organization_id: string }>;
    }>(
      `
        query GetSuperadminOrganizations {
          organizations(order_by: { created_at: desc }) {
            id
            name
            slug
            owner_id
            created_at
          }
          organization_members { organization_id }
          projects(where: { _or: [{ is_deleted: { _eq: false } }, { is_deleted: { _is_null: true } }] }) { organization_id }
          worlds { organization_id }
        }
      `
    );

    const memberCounts = data.organization_members.reduce<Record<string, number>>((acc, row) => {
      acc[row.organization_id] = (acc[row.organization_id] || 0) + 1;
      return acc;
    }, {});
    const projectCounts = data.projects.reduce<Record<string, number>>((acc, row) => {
      acc[row.organization_id] = (acc[row.organization_id] || 0) + 1;
      return acc;
    }, {});
    const worldCounts = data.worlds.reduce<Record<string, number>>((acc, row) => {
      acc[row.organization_id] = (acc[row.organization_id] || 0) + 1;
      return acc;
    }, {});

    sendJson(res, 200, {
      organizations: data.organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        ownerEmail: "unknown",
        memberCount: memberCounts[org.id] || 0,
        projectCount: projectCounts[org.id] || 0,
        worldCount: worldCounts[org.id] || 0,
        createdAt: org.created_at,
      })),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
