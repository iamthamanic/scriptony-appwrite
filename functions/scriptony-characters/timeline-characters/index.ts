/**
 * Timeline character collection routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  getQuery,
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import {
  getCharactersByProject,
  mapCharacter,
  normalizeCharacterInput,
} from "../../_shared/timeline";
import { requireProjectAccess } from "../../_shared/scriptony";

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
      const projectId = getQuery(req, "project_id") ||
        getQuery(req, "projectId");
      if (!projectId) {
        sendBadRequest(res, "project_id is required");
        return;
      }

      const _project = await requireProjectAccess(projectId, bootstrap.user.id, res);
      if (!_project) return;

      const characters = await getCharactersByProject(projectId);
      sendJson(res, 200, { characters: characters.map(mapCharacter) });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      const characterInput = normalizeCharacterInput(body);
      const projectId = characterInput.project_id;

      if (!projectId || !characterInput.name) {
        sendBadRequest(res, "project_id and name are required");
        return;
      }

      const _project = await requireProjectAccess(projectId, bootstrap.user.id, res);
      if (!_project) return;

      const created = await requestGraphql<{
        insert_characters_one: Record<string, any>;
      }>(
        `
          mutation CreateCharacter($object: characters_insert_input!) {
            insert_characters_one(object: $object) {
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
          object: {
            ...characterInput,
            organization_id: characterInput.organization_id ??
              bootstrap.organizationId,
          },
        },
      );

      sendJson(res, 201, {
        character: mapCharacter(created.insert_characters_one),
      });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
