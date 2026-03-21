/**
 * Flattened world-items route used by the existing worldbuilding UI.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  getParam,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

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

    const data = await requestGraphql<{
      world_categories: Array<Record<string, any>>;
    }>(
      `
        query GetWorldItems($worldId: uuid!) {
          world_categories(where: { world_id: { _eq: $worldId } }) {
            id
            name
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

    const items = data.world_categories.flatMap((category) =>
      (category.world_items || []).map((item: Record<string, any>) => ({
        ...item,
        categoryName: category.name,
      }))
    );

    sendJson(res, 200, { items });
  } catch (error) {
    sendServerError(res, error);
  }
}
