/**
 * Single-project routes (Scriptony HTTP API).
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
import { getAccessibleProject, getUserOrganizationIds, normalizeProjectInput } from "../../_shared/scriptony";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const projectId = getParam(req, "id");
    if (!projectId) {
      sendBadRequest(res, "Project ID is required");
      return;
    }

    const organizationIds = await getUserOrganizationIds(bootstrap.user.id);
    const project = await getAccessibleProject(projectId, bootstrap.user.id, organizationIds);
    if (!project) {
      sendNotFound(res, "Project not found or access denied");
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, { project });
      return;
    }

    if (req.method === "PUT") {
      const body = await readJsonBody<Record<string, any>>(req);
      const changes = normalizeProjectInput(body);
      if (typeof body.is_deleted === "boolean") {
        changes.is_deleted = body.is_deleted;
      }
      if (typeof body.organization_id === "string" && body.organization_id.trim()) {
        changes.organization_id = body.organization_id.trim();
      }

      const updated = await requestGraphql<{
        update_projects_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateProject($projectId: uuid!, $changes: projects_set_input!) {
            update_projects_by_pk(pk_columns: { id: $projectId }, _set: $changes) {
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
              organization_id
              user_id
              created_at
              updated_at
            }
          }
        `,
        {
          projectId,
          changes,
        }
      );

      sendJson(res, 200, { project: updated.update_projects_by_pk });
      return;
    }

    if (req.method === "DELETE") {
      await requestGraphql(
        `
          mutation SoftDeleteProject($projectId: uuid!) {
            update_projects_by_pk(
              pk_columns: { id: $projectId }
              _set: { is_deleted: true }
            ) {
              id
            }
          }
        `,
        { projectId }
      );

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
