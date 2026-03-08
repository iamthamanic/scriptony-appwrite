/**
 * Single-organization routes for the Nhost-backed auth compatibility layer.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/hasura";
import {
  getParam,
  readJsonBody,
  sendBadRequest,
  sendForbidden,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";

async function getMembership(orgId: string, userId: string) {
  const data = await requestGraphql<{
    organization_members: Array<{ role: string }>;
    organizations_by_pk: Record<string, any> | null;
  }>(
    `
      query GetOrganizationMembership($orgId: uuid!, $userId: uuid!) {
        organization_members(
          where: {
            organization_id: { _eq: $orgId }
            user_id: { _eq: $userId }
          }
          limit: 1
        ) {
          role
        }
        organizations_by_pk(id: $orgId) {
          id
          name
          slug
          owner_id
          created_at
        }
      }
    `,
    { orgId, userId }
  );

  return {
    role: data.organization_members[0]?.role || null,
    organization: data.organizations_by_pk,
  };
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const orgId = getParam(req, "id");
    if (!orgId) {
      sendBadRequest(res, "Organization ID is required");
      return;
    }

    const membership = await getMembership(orgId, bootstrap.user.id);
    if (!membership.role || !membership.organization) {
      sendNotFound(res, "Organization not found or access denied");
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, {
        organization: membership.organization,
        role: membership.role,
      });
      return;
    }

    if (req.method === "PUT") {
      if (membership.role !== "owner") {
        sendForbidden(res, "Only organization owners can update settings");
        return;
      }

      const body = await readJsonBody<{ name?: string; slug?: string }>(req);
      const changes = Object.fromEntries(
        Object.entries({
          name: body.name,
          slug: body.slug,
        }).filter(([_, value]) => value !== undefined)
      );

      if (!Object.keys(changes).length) {
        sendBadRequest(res, "No valid organization fields to update");
        return;
      }

      const updated = await requestGraphql<{
        update_organizations_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateOrganization($orgId: uuid!, $changes: organizations_set_input!) {
            update_organizations_by_pk(pk_columns: { id: $orgId }, _set: $changes) {
              id
              name
              slug
              owner_id
              created_at
            }
          }
        `,
        {
          orgId,
          changes,
        }
      );

      sendJson(res, 200, {
        organization: updated.update_organizations_by_pk,
      });
      return;
    }

    if (req.method === "DELETE") {
      if (membership.role !== "owner") {
        sendForbidden(res, "Only organization owners can delete organizations");
        return;
      }

      await requestGraphql(
        `
          mutation DeleteOrganization($orgId: uuid!) {
            delete_organizations_by_pk(id: $orgId) {
              id
            }
          }
        `,
        { orgId }
      );

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
