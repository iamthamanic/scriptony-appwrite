/**
 * Shot collection routes for the Nhost compatibility layer.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { requestGraphql } from "../../../_shared/hasura";
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
} from "../../../_shared/http";
import { getShots, mapShot, normalizeShotInput } from "../../../_shared/timeline";

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

      const shots = await getShots({ projectId });
      sendJson(res, 200, { shots: shots.map(mapShot) });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      const shotInput = normalizeShotInput(body);

      if (!shotInput.scene_id || !shotInput.project_id || !shotInput.shot_number) {
        sendBadRequest(res, "scene_id, project_id, and shot_number are required");
        return;
      }

      const created = await requestGraphql<{
        insert_shots_one: Record<string, any>;
      }>(
        `
          mutation CreateShot($object: shots_insert_input!) {
            insert_shots_one(object: $object) {
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
          object: {
            ...shotInput,
            user_id: bootstrap.user.id,
            order_index: shotInput.order_index ?? 0,
          },
        }
      );

      sendJson(res, 201, { shot: mapShot(created.insert_shots_one) });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
