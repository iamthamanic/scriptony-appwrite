/**
 * Shot item routes for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../../../_shared/auth";
import { requestGraphql } from "../../../../_shared/graphql-compat";
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
} from "../../../../_shared/http";
import { getShotById, mapShot, normalizeShotInput } from "../../../../_shared/timeline";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const shotId = getParam(req, "id");
    if (!shotId) {
      sendBadRequest(res, "id is required");
      return;
    }

    if (req.method === "PUT") {
      const existing = await getShotById(shotId);
      if (!existing) {
        sendNotFound(res, "Shot not found");
        return;
      }

      const body = await readJsonBody<Record<string, any>>(req);
      const updates = normalizeShotInput(body);
      delete updates.scene_id;
      delete updates.project_id;
      delete updates.user_id;

      const updated = await requestGraphql<{
        update_shots_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateShot($id: uuid!, $changes: shots_set_input!) {
            update_shots_by_pk(pk_columns: { id: $id }, _set: $changes) {
              id
              scene_id
              project_id
              shot_number
              description
              camera_angle
              camera_movement
              framing
              lens
              duration
              shotlength_minutes
              shotlength_seconds
              composition
              lighting_notes
              image_url
              sound_notes
              storyboard_url
              reference_image_url
              dialog
              notes
              order_index
              user_id
              created_at
              updated_at
              shot_characters {
                character {
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
                  created_at
                  updated_at
                }
              }
              shot_audio(order_by: { created_at: asc }) {
                id
                shot_id
                type
                file_url
                file_name
                label
                file_size
                start_time
                end_time
                fade_in
                fade_out
                waveform_data
                duration
                created_at
              }
            }
          }
        `,
        {
          id: shotId,
          changes: {
            ...updates,
            user_id: bootstrap.user.id,
          },
        }
      );

      sendJson(res, 200, { shot: mapShot(updated.update_shots_by_pk || existing) });
      return;
    }

    if (req.method === "DELETE") {
      await requestGraphql(
        `
          mutation DeleteShot($id: uuid!) {
            delete_shots_by_pk(id: $id) {
              id
            }
          }
        `,
        { id: shotId }
      );

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["PUT", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
