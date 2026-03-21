/**
 * Single-beat routes for the Scriptony beats service.
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
import { normalizeBeatInput } from "../../_shared/scriptony";

async function getBeat(beatId: string) {
  const data = await requestGraphql<{
    story_beats_by_pk: Record<string, any> | null;
  }>(
    `
      query GetBeat($beatId: uuid!) {
        story_beats_by_pk(id: $beatId) {
          id
          project_id
        }
      }
    `,
    { beatId }
  );

  return data.story_beats_by_pk;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const beatId = getParam(req, "id");
    if (!beatId) {
      sendBadRequest(res, "Beat ID is required");
      return;
    }

    const beat = await getBeat(beatId);
    if (!beat) {
      sendNotFound(res, "Beat not found");
      return;
    }

    if (req.method === "PATCH") {
      const body = await readJsonBody<Record<string, any>>(req);
      const changes = normalizeBeatInput(body);

      const updated = await requestGraphql<{
        update_story_beats_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateBeat($beatId: uuid!, $changes: story_beats_set_input!) {
            update_story_beats_by_pk(pk_columns: { id: $beatId }, _set: $changes) {
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
          beatId,
          changes,
        }
      );

      sendJson(res, 200, { beat: updated.update_story_beats_by_pk });
      return;
    }

    if (req.method === "DELETE") {
      await requestGraphql(
        `
          mutation DeleteBeat($beatId: uuid!) {
            delete_story_beats_by_pk(id: $beatId) {
              id
            }
          }
        `,
        { beatId }
      );

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["PATCH", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
