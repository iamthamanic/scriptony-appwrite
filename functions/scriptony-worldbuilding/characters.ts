/**
 * Worldbuilding character listing route.
 *
 * This covers the current frontend usage where world statistics fetch
 * `/characters?world_id=...` from the worldbuilding service.
 */

import { requireUserBootstrap } from "../_shared/auth";
import { requestGraphql } from "../_shared/hasura";
import {
  getQuery,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../_shared/http";

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

    const worldId = getQuery(req, "world_id");
    const data = await requestGraphql<{
      characters: Array<Record<string, any>>;
    }>(
      `
        query GetWorldbuildingCharacters($organizationId: uuid!, $worldId: uuid) {
          characters(
            where: {
              organization_id: { _eq: $organizationId }
              world_id: { _eq: $worldId }
            }
            order_by: { created_at: desc }
          ) {
            id
            world_id
            organization_id
            name
            description
            backstory
            personality
            image_url
            color
            created_at
            updated_at
          }
        }
      `,
      {
        organizationId: bootstrap.organizationId,
        worldId: worldId || null,
      }
    );

    sendJson(res, 200, { characters: data.characters });
  } catch (error) {
    sendServerError(res, error);
  }
}
