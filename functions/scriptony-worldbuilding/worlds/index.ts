/**
 * World collection routes for the Nhost-backed worldbuilding compatibility layer.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/hasura";
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
import { normalizeWorldInput } from "../../_shared/scriptony";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
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
              lore
              image_url
              cover_image_url
              linked_project_id
              organization_id
              created_at
              updated_at
            }
          }
        `,
        { organizationId: bootstrap.organizationId }
      );

      sendJson(res, 200, { worlds: data.worlds });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      const worldInput = normalizeWorldInput(body);
      if (!worldInput.name) {
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
              lore
              image_url
              cover_image_url
              linked_project_id
              organization_id
              created_at
              updated_at
            }
          }
        `,
        {
          object: {
            ...worldInput,
            organization_id: bootstrap.organizationId,
          },
        }
      );

      sendJson(res, 201, { world: created.insert_worlds_one });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
