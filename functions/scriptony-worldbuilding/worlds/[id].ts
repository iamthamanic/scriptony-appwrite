/**
 * Single-world routes for the Scriptony worldbuilding service.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  getParam,
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import { worldsUpdatePayload } from "../../_shared/scriptony";

async function getWorld(worldId: string, organizationId: string) {
  const data = await requestGraphql<{
    worlds: Array<Record<string, any>>;
  }>(
    `
      query GetWorld($worldId: uuid!, $organizationId: uuid!) {
        worlds(
          where: {
            id: { _eq: $worldId }
            organization_id: { _eq: $organizationId }
          }
          limit: 1
        ) {
          id
          name
          description
          cover_image_url
          linked_project_id
          organization_id
          created_at
          updated_at
        }
      }
    `,
    { worldId, organizationId },
  );

  return data.worlds[0] || null;
}

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

    const worldId = getParam(req, "id");
    if (!worldId) {
      sendBadRequest(res, "World ID is required");
      return;
    }

    const world = await getWorld(worldId, bootstrap.organizationId);
    if (!world) {
      sendNotFound(res, "World not found");
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, { world });
      return;
    }

    if (req.method === "PUT") {
      const body = await readJsonBody<Record<string, any>>(req);
      const changes = worldsUpdatePayload(body);

      const updated = await requestGraphql<{
        update_worlds_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateWorld($worldId: uuid!, $changes: worlds_set_input!) {
            update_worlds_by_pk(pk_columns: { id: $worldId }, _set: $changes) {
              id
              name
              description
              cover_image_url
              linked_project_id
              organization_id
              created_at
              updated_at
            }
          }
        `,
        { worldId, changes },
      );

      sendJson(res, 200, { world: updated.update_worlds_by_pk });
      return;
    }

    if (req.method === "DELETE") {
      await requestGraphql(
        `
          mutation DeleteWorld($worldId: uuid!) {
            delete_worlds_by_pk(id: $worldId) {
              id
            }
          }
        `,
        { worldId },
      );

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
