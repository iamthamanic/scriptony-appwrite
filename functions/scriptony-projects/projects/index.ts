/**
 * Project collection routes (Scriptony HTTP API).
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import { hydrateProjectRow, hydrateProjectRows, normalizeProjectInput } from "../../_shared/scriptony";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const data = await requestGraphql<{
        projects: Array<Record<string, any>>;
      }>(
        `
          query GetProjects($userId: uuid!, $organizationId: uuid!) {
            projects(
              where: {
                _and: [
                  {
                    _or: [
                      { organization_id: { _eq: $organizationId } }
                      { user_id: { _eq: $userId } }
                    ]
                  }
                  {
                    _or: [
                      { is_deleted: { _eq: false } }
                      { is_deleted: { _is_null: true } }
                    ]
                  }
                ]
              }
              order_by: { created_at: desc }
            ) {
              id
              title
              type
              logline
              genre
              duration
              world_id
              cover_image_url
              narrative_structure
              beat_template
              episode_layout
              season_engine
              concept_blocks
              target_pages
              words_per_page
              reading_speed_wpm
              organization_id
              user_id
              is_deleted
              created_at
              updated_at
            }
          }
        `,
        {
          userId: bootstrap.user.id,
          organizationId: bootstrap.organizationId,
        }
      );

      sendJson(res, 200, { projects: hydrateProjectRows(data.projects) });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      const projectInput = normalizeProjectInput(body);
      if (!("type" in projectInput)) {
        projectInput.type = "film";
      }

      if (!projectInput.title) {
        sendBadRequest(res, "title is required");
        return;
      }

      const created = await requestGraphql<{
        insert_projects_one: Record<string, any>;
      }>(
        `
          mutation CreateProject($object: projects_insert_input!) {
            insert_projects_one(object: $object) {
              id
              title
              type
              logline
              genre
              duration
              world_id
              cover_image_url
              narrative_structure
              beat_template
              episode_layout
              season_engine
              concept_blocks
              target_pages
              words_per_page
              reading_speed_wpm
              organization_id
              user_id
              created_at
              updated_at
            }
          }
        `,
        {
          object: {
            ...projectInput,
            organization_id: bootstrap.organizationId,
            user_id: bootstrap.user.id,
          },
        }
      );

      sendJson(res, 201, { project: hydrateProjectRow(created.insert_projects_one) });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
