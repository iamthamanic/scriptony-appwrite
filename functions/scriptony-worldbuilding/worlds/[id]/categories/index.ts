/**
 * World category routes for the Scriptony worldbuilding service.
 */

import { requireUserBootstrap } from "../../../../_shared/auth";
import { requestGraphql } from "../../../../_shared/graphql-compat";
import {
  getParam,
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const worldId = getParam(req, "id");
    if (!worldId) {
      sendBadRequest(res, "World ID is required");
      return;
    }

    if (req.method === "GET") {
      const data = await requestGraphql<{
        world_categories: Array<Record<string, any>>;
      }>(
        `
          query GetWorldCategories($worldId: uuid!) {
            world_categories(
              where: { world_id: { _eq: $worldId } }
              order_by: { created_at: asc }
            ) {
              id
              world_id
              name
              description
              type
              icon
              color
              created_at
              updated_at
              world_items(order_by: { created_at: asc }) {
                id
                world_category_id
                name
                description
                image_url
                metadata
                created_at
                updated_at
              }
            }
          }
        `,
        { worldId }
      );

      sendJson(res, 200, { categories: data.world_categories });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      if (!body.name) {
        sendBadRequest(res, "Category name is required");
        return;
      }

      const created = await requestGraphql<{
        insert_world_categories_one: Record<string, any>;
      }>(
        `
          mutation CreateWorldCategory($object: world_categories_insert_input!) {
            insert_world_categories_one(object: $object) {
              id
              world_id
              name
              description
              type
              icon
              color
              created_at
              updated_at
            }
          }
        `,
        {
          object: {
            world_id: worldId,
            name: body.name,
            description: body.description ?? null,
            type: body.type ?? null,
            icon: body.icon ?? null,
            color: body.color ?? null,
          },
        }
      );

      sendJson(res, 201, { category: created.insert_world_categories_one });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
