/**
 * Beat collection routes for the Scriptony beats service.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  getQuery,
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import { normalizeBeatInput } from "../../_shared/scriptony";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const projectId = getQuery(req, "project_id") || getQuery(req, "projectId");
      if (!projectId) {
        sendBadRequest(res, "project_id is required");
        return;
      }

      const data = await requestGraphql<{
        story_beats: Array<Record<string, any>>;
      }>(
        `
          query GetStoryBeats($projectId: uuid!) {
            story_beats(
              where: { project_id: { _eq: $projectId } }
              order_by: [{ order_index: asc }, { created_at: asc }]
            ) {
              id
              project_id
              user_id
              label
              template_abbr
              description
              from_container_id
              to_container_id
              pct_from
              pct_to
              color
              notes
              order_index
              created_at
              updated_at
            }
          }
        `,
        { projectId }
      );

      sendJson(res, 200, { beats: data.story_beats });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      const projectId = body.project_id ?? body.projectId;
      const beatInput = normalizeBeatInput(body);

      if (!projectId || !beatInput.label || !beatInput.from_container_id || !beatInput.to_container_id) {
        sendBadRequest(
          res,
          "Missing required fields: project_id, label, from_container_id, to_container_id"
        );
        return;
      }

      const created = await requestGraphql<{
        insert_story_beats_one: Record<string, any>;
      }>(
        `
          mutation CreateBeat($object: story_beats_insert_input!) {
            insert_story_beats_one(object: $object) {
              id
              project_id
              user_id
              label
              template_abbr
              description
              from_container_id
              to_container_id
              pct_from
              pct_to
              color
              notes
              order_index
              created_at
              updated_at
            }
          }
        `,
        {
          object: {
            ...beatInput,
            project_id: projectId,
            user_id: bootstrap.user.id,
          },
        }
      );

      sendJson(res, 201, { beat: created.insert_story_beats_one });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
