/**
 * Zod schemas for scriptony-script request validation.
 */

import { z } from "zod";

export const scriptTypeSchema = z.enum([
  "screenplay",
  "book",
  "series",
  "audiobook",
  "radioplay",
]);

export const scriptFormatSchema = z.enum([
  "standard",
  "fountain",
  "markdown",
  "plain",
]);

export const scriptStatusSchema = z.enum([
  "draft",
  "revision",
  "final",
  "archived",
]);

export const createScriptSchema = z.object({
  project_id: z.string().min(1, "project_id is required"),
  title: z.string().min(1, "title is required").max(1024),
  type: scriptTypeSchema.default("screenplay"),
  format: scriptFormatSchema.default("standard"),
  status: scriptStatusSchema.default("draft"),
  node_id: z.string().optional(),
  language: z.string().max(16).optional(),
});

export const updateScriptSchema = z.object({
  title: z.string().min(1).max(1024).optional(),
  type: scriptTypeSchema.optional(),
  format: scriptFormatSchema.optional(),
  status: scriptStatusSchema.optional(),
  node_id: z.string().optional(),
  language: z.string().max(16).optional(),
  revision: z.number().int().min(0).optional(),
  expected_revision: z.number().int().min(0).optional(),
});

export const blockTypeSchema = z.enum([
  "scene_heading",
  "action",
  "dialogue",
  "narration",
  "sound_effect",
  "stage_direction",
  "chapter_text",
  "paragraph",
  "note",
]);

export const createBlockSchema = z.object({
  project_id: z.string().min(1, "project_id is required"),
  script_id: z.string().optional(),
  node_id: z.string().optional(),
  parent_id: z.string().optional(),
  order_index: z.number().int().min(0).default(0),
  type: blockTypeSchema,
  content: z.string().max(50000).default(""),
  speaker_character_id: z.string().nullable().optional(),
  notes: z.string().max(8000).optional(),
});

export const updateBlockSchema = z.object({
  script_id: z.string().optional(),
  node_id: z.string().optional(),
  parent_id: z.string().optional(),
  order_index: z.number().int().min(0).optional(),
  type: blockTypeSchema.optional(),
  content: z.string().max(50000).optional(),
  speaker_character_id: z.string().nullable().optional(),
  notes: z.string().max(8000).optional(),
  revision: z.number().int().min(0).optional(),
  expected_revision: z.number().int().min(0).optional(),
});

export const reorderBlockSchema = z.object({
  project_id: z.string().min(1, "project_id is required"),
  script_id: z.string().optional(),
  block_ids: z.array(z.string()).min(1, "block_ids is required"),
});

export const nodeBlocksQuerySchema = z.object({
  nodeId: z.string().min(1, "nodeId is required"),
  project_id: z.string().min(1, "project_id is required"),
});
