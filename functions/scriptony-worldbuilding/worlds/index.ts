/**
 * World collection routes for the Scriptony worldbuilding service.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import { worldsInsertPayload } from "../../_shared/scriptony";

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

    if (req.method === "GET") {
      const data = await requestGraphql<{
        worlds: Array<Record<string, any>>;
      }>(
        `
          query GetWorlds($organizationId: uuid!) {
            worlds(
              where: { organization_id: { _eq: $organizationId } }
              order_by: { created_at: desc }
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
        { organizationId: bootstrap.organizationId },
      );

      sendJson(res, 200, { worlds: data.worlds });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      const insertPayload = worldsInsertPayload(body, bootstrap.organizationId);
      const name = insertPayload.name;
      if (name == null || String(name).trim() === "") {
        sendBadRequest(res, "name is required");
        return;
      }

      const created = await requestGraphql<{
        insert_worlds_one: Record<string, any>;
      }>(
        `
          mutation CreateWorld($object: worlds_insert_input!) {
            insert_worlds_one(object: $object) {
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
        {
          object: insertPayload,
        },
      );

      sendJson(res, 201, { world: created.insert_worlds_one });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
