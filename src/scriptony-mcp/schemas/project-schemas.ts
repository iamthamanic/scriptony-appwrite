/**
 * Shared JSON-schema fragments for project/scene tools.
 */

import type { JsonSchema } from "../types/json-schema";

export const schemaProjectId: JsonSchema = {
  type: "object",
  properties: {
    project_id: { type: "string", description: "Project UUID" },
  },
  required: ["project_id"],
};

export const schemaSceneId: JsonSchema = {
  type: "object",
  properties: {
    scene_id: { type: "string", description: "Timeline node UUID (scene)" },
  },
  required: ["scene_id"],
};

export const schemaRenameProject: JsonSchema = {
  type: "object",
  properties: {
    project_id: { type: "string" },
    title: { type: "string", description: "New project title" },
  },
  required: ["project_id", "title"],
};

export const schemaCreateScene: JsonSchema = {
  type: "object",
  properties: {
    project_id: { type: "string" },
    template_id: {
      type: "string",
      description: "Timeline template UUID for the new node",
    },
    title: { type: "string" },
    parent_id: {
      type: "string",
      description: "Optional parent timeline node UUID",
    },
    summary: { type: "string" },
  },
  required: ["project_id", "template_id", "title"],
};
