/**
 * Shot character assignment routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../../../_shared/auth";
import { requestGraphql } from "../../../../../_shared/graphql-compat";
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
} from "../../../../../_shared/http";
import { getShotById, mapShot } from "../../../../../_shared/timeline";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const shotId = getParam(req, "id");
    if (!shotId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const body = await readJsonBody<{ character_id?: string; characterId?: string }>(req);
    const characterId = body.character_id ?? body.characterId;
    if (!characterId) {
      sendBadRequest(res, "character_id is required");
      return;
    }

    await requestGraphql(
      `
        mutation AddShotCharacter($shotId: uuid!, $characterId: uuid!) {
          insert_shot_characters_one(
            object: { shot_id: $shotId, character_id: $characterId }
            on_conflict: {
              constraint: shot_characters_pkey
              update_columns: [character_id]
            }
          ) {
            shot_id
          }
        }
      `,
      { shotId, characterId }
    );

    const shot = await getShotById(shotId);
    sendJson(res, 200, { shot: shot ? mapShot(shot) : { id: shotId, characters: [] } });
  } catch (error) {
    sendServerError(res, error);
  }
}
