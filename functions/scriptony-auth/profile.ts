/**
 * Profile endpoint compatible with the legacy auth adapter expectations.
 */

import { requireUserBootstrap } from "../_shared/auth";
import { requestGraphql } from "../_shared/hasura";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const data = await requestGraphql<{
        users_by_pk: Record<string, any> | null;
        organization_members: Array<Record<string, any>>;
      }>(
        `
          query GetProfile($userId: uuid!) {
            users_by_pk(id: $userId) {
              id
              name
              email
              avatar_url
              bio
              organization_id
              created_at
              updated_at
            }
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
        profile: data.users_by_pk,
        organizations: data.organization_members,
      });
      return;
    }

    if (req.method === "PUT") {
      const body = await readJsonBody<Record<string, any>>(req);
      const updatePayload = Object.fromEntries(
        Object.entries({
          name: body.name,
          avatar_url: body.avatar_url ?? body.avatar,
          bio: body.bio,
        }).filter(([_, value]) => value !== undefined)
      );

      if (!Object.keys(updatePayload).length) {
        sendBadRequest(res, "No valid profile fields to update");
        return;
      }

      const updated = await requestGraphql<{
        update_users_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateProfile($userId: uuid!, $changes: users_set_input!) {
            update_users_by_pk(pk_columns: { id: $userId }, _set: $changes) {
              id
              name
              email
              avatar_url
              bio
              organization_id
              updated_at
            }
          }
        `,
        {
          userId: bootstrap.user.id,
          changes: updatePayload,
        }
      );

      sendJson(res, 200, {
        profile: updated.update_users_by_pk,
      });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
