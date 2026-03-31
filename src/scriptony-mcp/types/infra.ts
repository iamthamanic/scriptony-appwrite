/**
 * Host-provided operations for project/scene tools. Implemented in Appwrite (GraphQL layer).
 * Keeps scriptony-mcp free of node-appwrite / HTTP.
 */

import type { ToolResult } from "../results/envelope";

export interface ProjectSummaryPayload {
  project: Record<string, unknown> | null;
  scene_count: number;
}

export interface SceneNodePayload extends Record<string, unknown> {
  id: string;
  title?: string;
  level?: number;
  summary?: string | null;
  project_id?: string;
}

export interface ScriptonyMcpInfra {
  getProjectSummary(projectId: string): Promise<ToolResult<ProjectSummaryPayload>>;
  listProjectScenes(projectId: string): Promise<ToolResult<{ scenes: SceneNodePayload[] }>>;
  getSceneDetails(sceneId: string): Promise<ToolResult<{ scene: SceneNodePayload | null }>>;
  renameProject(projectId: string, title: string): Promise<ToolResult<{ project_id: string; title: string }>>;
  createScene(input: {
    projectId: string;
    templateId: string;
    title: string;
    parentId?: string | null;
    summary?: string | null;
  }): Promise<ToolResult<{ scene: SceneNodePayload | null }>>;
}
