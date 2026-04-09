/**
 * Shot character removal routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../../_shared/auth";
import { requestGraphql } from "../../../../_shared/graphql-compat";
import {
  getParam,
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
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "DELETE") {
      sendMethodNotAllowed(res, ["DELETE"]);
      return;
    }

    const shotId = getParam(req, "id");
    const characterId = getParam(req, "characterId");
    if (!shotId || !characterId) {
      sendBadRequest(res, "id and characterId are required");
      return;
    }

    await requestGraphql(
      `
        mutation RemoveShotCharacter($shotId: uuid!, $characterId: uuid!) {
          delete_shot_characters_by_pk(
            shot_id: $shotId
            character_id: $characterId
          ) {
            shot_id
          }
        }
      `,
      { shotId, characterId }
    );

    sendJson(res, 200, { success: true });
  } catch (error) {
    sendServerError(res, error);
  }
}
