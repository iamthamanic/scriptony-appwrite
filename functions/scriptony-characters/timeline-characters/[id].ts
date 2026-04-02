/**
 * Timeline character item routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  getParam,
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import {
  getCharacterById,
  mapCharacter,
  normalizeCharacterInput,
} from "../../_shared/timeline";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const characterId = getParam(req, "id");
    if (!characterId) {
      sendBadRequest(res, "id is required");
      return;
    }

    if (req.method === "GET") {
      const character = await getCharacterById(characterId);
      if (!character) {
        sendNotFound(res, "Character not found");
        return;
      }

      sendJson(res, 200, { character: mapCharacter(character) });
      return;
    }

    if (req.method === "PUT") {
      const existing = await getCharacterById(characterId);
      if (!existing) {
        sendNotFound(res, "Character not found");
        return;
      }

      const body = await readJsonBody<Record<string, any>>(req);
      const updates = normalizeCharacterInput(body);
      delete updates.project_id;
      delete updates.organization_id;
      delete updates.world_id;

      const updated = await requestGraphql<{
        update_characters_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateCharacter($id: uuid!, $changes: characters_set_input!) {
            update_characters_by_pk(pk_columns: { id: $id }, _set: $changes) {
              id
              project_id
              world_id
              organization_id
              name
              role
              description
              image_url
              avatar_url
              backstory
              personality
              color
              reference_images_json
              created_at
              updated_at
            }
          }
        `,
        {
          id: characterId,
          changes: updates,
        }
      );

      sendJson(res, 200, { character: mapCharacter(updated.update_characters_by_pk || existing) });
      return;
    }

    if (req.method === "DELETE") {
      await requestGraphql(
        `
          mutation DeleteCharacter($id: uuid!) {
            delete_characters_by_pk(id: $id) {
              id
            }
          }
        `,
        { id: characterId }
      );

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
