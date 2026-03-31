/**
 * Appwrite-backed ScriptonyMcpInfra — GraphQL via requestGraphql + access checks from _shared/scriptony + _shared/timeline.
 */

import { requestGraphql } from "../_shared/graphql-compat";
import {
  getAccessibleProject,
  getUserOrganizationIds,
  hydrateProjectRow,
  normalizeProjectInput,
} from "../_shared/scriptony";
import { getNodeById, getTimelineNodes, mapNode, normalizeNodeInput } from "../_shared/timeline";
import type { BootstrapResult } from "../_shared/auth";
import { errResult, okResult } from "../../src/scriptony-mcp/results/envelope";
import type { SceneNodePayload, ScriptonyMcpInfra } from "../../src/scriptony-mcp/types/infra";

export function createScriptonyInfra(bootstrap: BootstrapResult): ScriptonyMcpInfra {
  const userId = bootstrap.user.id;

  async function ensureProject(projectId: string) {
    const organizationIds = await getUserOrganizationIds(userId);
    const project = await getAccessibleProject(projectId, userId, organizationIds);
    if (!project) {
      return { ok: false as const, error: "Project not found or access denied" };
    }
    return { ok: true as const, project };
  }

  return {
    async getProjectSummary(projectId) {
      const access = await ensureProject(projectId);
      if (!access.ok) {
        return errResult(access.error, { code: "FORBIDDEN", message: access.error });
      }
      const scenes = await getTimelineNodes({ projectId, level: 3 });
      return okResult("Project summary", {
        project: hydrateProjectRow(access.project) as Record<string, unknown>,
        scene_count: scenes.length,
      });
    },

    async listProjectScenes(projectId) {
      const access = await ensureProject(projectId);
      if (!access.ok) {
        return errResult(access.error, { code: "FORBIDDEN", message: access.error });
      }
      const scenes = await getTimelineNodes({ projectId, level: 3 });
      const mapped = scenes.map((n) => mapNode(n) as unknown as SceneNodePayload);
      return okResult("Scenes listed", { scenes: mapped });
    },

    async getSceneDetails(sceneId) {
      const row = await getNodeById(sceneId);
      if (!row) {
        return okResult("No timeline node for this id.", { scene: null });
      }
      const access = await ensureProject(row.project_id as string);
      if (!access.ok) {
        return errResult(access.error, { code: "FORBIDDEN", message: access.error });
      }
      return okResult("Scene loaded", { scene: mapNode(row) as unknown as SceneNodePayload });
    },

    async renameProject(projectId, title) {
      const access = await ensureProject(projectId);
      if (!access.ok) {
        return errResult(access.error, { code: "FORBIDDEN", message: access.error });
      }
      const updated = await requestGraphql<{
        update_projects_by_pk: Record<string, unknown> | null;
      }>(
        `
          mutation UpdateProject($projectId: uuid!, $changes: projects_set_input!) {
            update_projects_by_pk(pk_columns: { id: $projectId }, _set: $changes) {
              id
              title
            }
          }
        `,
        {
          projectId,
          changes: normalizeProjectInput({ title }),
        }
      );
      const row = updated.update_projects_by_pk;
      if (!row) {
        return errResult("Update failed", { code: "UPDATE_FAILED", message: "No row returned" });
      }
      return okResult("Project renamed", {
        project_id: String(row.id),
        title: String(row.title ?? title),
      });
    },

    async createScene(input) {
      const access = await ensureProject(input.projectId);
      if (!access.ok) {
        return errResult(access.error, { code: "FORBIDDEN", message: access.error });
      }

      const nodeInput = normalizeNodeInput({
        project_id: input.projectId,
        template_id: input.templateId,
        level: 3,
        parent_id: input.parentId,
        title: input.title,
        summary: input.summary,
      });

      if (!nodeInput.project_id || !nodeInput.template_id || !nodeInput.level || !nodeInput.title) {
        return errResult("Invalid scene payload", {
          code: "VALIDATION",
          message: "project_id, template_id, level, title required after normalize",
        });
      }

      const created = await requestGraphql<{
        insert_timeline_nodes_one: Record<string, unknown>;
      }>(
        `
          mutation CreateTimelineNode($object: timeline_nodes_insert_input!) {
            insert_timeline_nodes_one(object: $object) {
              id
              project_id
              template_id
              level
              parent_id
              title
              summary
              order_index
              node_type
              scene_id
              metadata_json
              created_at
              updated_at
            }
          }
        `,
        {
          object: {
            ...nodeInput,
            order_index: nodeInput.order_index ?? 0,
            metadata_json: nodeInput.metadata_json ?? "{}",
          },
        }
      );

      const row = created.insert_timeline_nodes_one;
      return okResult("Scene created", { scene: mapNode(row) as unknown as SceneNodePayload });
    },
  };
}
