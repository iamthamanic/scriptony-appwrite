/**
 * Built-in project/scene capability tools — business logic delegated to ScriptonyMcpInfra.
 * execute() assumes validateToolInput passed (see tool-loop).
 */

import { ToolRegistry } from "../registry/registry";
import { readString, resolveProjectId } from "../schemas/input-helpers";
import {
  schemaCreateScene,
  schemaProjectId,
  schemaRenameProject,
  schemaSceneId,
} from "../schemas/project-schemas";
import type { InternalTool, McpToolContext } from "../types/tool";

export function registerProjectCapabilityTools(registry: ToolRegistry): void {
  const tools: InternalTool[] = [
    {
      name: "get_project_summary",
      description: "Returns a hydrated project row and count of level-3 (scene) timeline nodes.",
      inputSchema: schemaProjectId,
      policy: "read",
      riskLevel: "low",
      requiresApproval: false,
      execute: async (ctx: McpToolContext, input: unknown) => {
        const projectId = resolveProjectId(input, ctx)!;
        return ctx.infra.getProjectSummary(projectId);
      },
    },
    {
      name: "list_project_scenes",
      description: "Lists scene-level timeline nodes (level 3) for a project.",
      inputSchema: schemaProjectId,
      policy: "read",
      riskLevel: "low",
      requiresApproval: false,
      execute: async (ctx: McpToolContext, input: unknown) => {
        const projectId = resolveProjectId(input, ctx)!;
        return ctx.infra.listProjectScenes(projectId);
      },
    },
    {
      name: "get_scene_details",
      description: "Loads a single timeline node (scene) by id.",
      inputSchema: schemaSceneId,
      policy: "read",
      riskLevel: "low",
      requiresApproval: false,
      execute: async (ctx: McpToolContext, input: unknown) => {
        const sceneId = readString(input, "scene_id")!;
        return ctx.infra.getSceneDetails(sceneId);
      },
    },
    {
      name: "rename_project",
      description: "Updates the project title (write).",
      inputSchema: schemaRenameProject,
      policy: "write",
      riskLevel: "medium",
      requiresApproval: true,
      execute: async (ctx: McpToolContext, input: unknown) => {
        const projectId = resolveProjectId(input, ctx)!;
        const title = readString(input, "title")!;
        return ctx.infra.renameProject(projectId, title);
      },
    },
    {
      name: "create_scene",
      description: "Creates a new level-3 timeline node (scene). Requires template_id from the project template model.",
      inputSchema: schemaCreateScene,
      policy: "write",
      riskLevel: "medium",
      requiresApproval: true,
      execute: async (ctx: McpToolContext, input: unknown) => {
        const projectId = resolveProjectId(input, ctx)!;
        const templateId = readString(input, "template_id")!;
        const title = readString(input, "title")!;
        const parentIdRaw = readString(input, "parent_id");
        const summary = readString(input, "summary");
        return ctx.infra.createScene({
          projectId,
          templateId,
          title,
          parentId: parentIdRaw ?? null,
          summary: summary ?? null,
        });
      },
    },
  ];

  for (const t of tools) {
    registry.register(t);
  }
}

export function createDefaultCapabilityRegistry(): ToolRegistry {
  const r = new ToolRegistry();
  registerProjectCapabilityTools(r);
  return r;
}
