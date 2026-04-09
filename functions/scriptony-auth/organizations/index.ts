/**
 * Organization collection routes for the Scriptony auth service.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";

function buildSlug(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Date.now()}`;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const data = await requestGraphql<{
        organization_members: Array<Record<string, any>>;
      }>(
        `
          query GetOrganizations($userId: uuid!) {
            organization_members(where: { user_id: { _eq: $userId } }) {
              role
              organizations {
                id
                name
                slug
                owner_id
                created_at
              }
            }
          }
        `,
        { userId: bootstrap.user.id }
      );

      sendJson(res, 200, {
        organizations: data.organization_members,
      });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<{ name?: string; slug?: string }>(req);
      if (!body.name) {
        sendBadRequest(res, "Organization name is required");
        return;
      }

      const created = await requestGraphql<{
        insert_organizations_one: Record<string, any>;
      }>(
        `
          mutation CreateOrganization($object: organizations_insert_input!) {
            insert_organizations_one(object: $object) {
              id
              name
              slug
              owner_id
              created_at
            }
          }
        `,
        {
          object: {
            name: body.name,
            slug: body.slug || buildSlug(body.name),
            owner_id: bootstrap.user.id,
          },
        }
      );

      await requestGraphql(
        `
          mutation AddOwnerMembership($object: organization_members_insert_input!) {
            insert_organization_members_one(object: $object) {
              organization_id
            }
          }
        `,
        {
          object: {
            organization_id: created.insert_organizations_one.id,
            user_id: bootstrap.user.id,
            role: "owner",
          },
        }
      );

      sendJson(res, 200, {
        organization: created.insert_organizations_one,
      });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
