/**
 * Zod schemas for Style Guide API (project_visual_style + items).
 * Single source of validation for scriptony-style-guide handlers.
 */

import { z } from "zod";

export const styleGuideStatusSchema = z.enum(["draft", "published"]);
export type StyleGuideStatus = z.infer<typeof styleGuideStatusSchema>;

export const stringArrayJsonSchema = z.array(z.string().max(512)).max(200);

export const patchStyleGuideBodySchema = z
  .object({
    title: z.string().max(512).optional(),
    style_summary: z.string().max(50000).optional(),
    tone_summary: z.string().max(8000).optional(),
    keywords: stringArrayJsonSchema.optional(),
    negative_keywords: stringArrayJsonSchema.optional(),
    must_have: stringArrayJsonSchema.optional(),
    avoid: stringArrayJsonSchema.optional(),
    palette_primary: stringArrayJsonSchema.optional(),
    palette_secondary: stringArrayJsonSchema.optional(),
    palette_accent: stringArrayJsonSchema.optional(),
    palette_background: stringArrayJsonSchema.optional(),
    typography_notes: z.string().max(8000).optional(),
    compact_prompt: z.string().max(32000).optional(),
    status: styleGuideStatusSchema.optional(),
  })
  .strict();

export const referenceKindSchema = z.enum(["image", "text", "link"]);
export type ReferenceKind = z.infer<typeof referenceKindSchema>;

const optionalUrl = z
  .union([z.string().url().max(2048), z.literal("")])
  .optional();

export const createReferenceBodySchema = z
  .object({
    kind: referenceKindSchema,
    title: z.string().max(1024).optional(),
    caption: z.string().max(8000).optional(),
    image_url: optionalUrl,
    source_url: optionalUrl,
    source_name: z.string().max(512).optional(),
    tags: stringArrayJsonSchema.optional(),
    influence: z.number().int().min(1).max(5).optional(),
    pinned: z.boolean().optional(),
    license_note: z.string().max(4000).optional(),
    text_body: z.string().max(32000).optional(),
  })
  .strict();

export const updateReferenceBodySchema = createReferenceBodySchema
  .partial()
  .extend({
    order_index: z.number().int().min(0).optional(),
  });

export const reorderReferencesBodySchema = z
  .object({
    ordered_ids: z.array(z.string().max(64)).min(1).max(500),
  })
  .strict();

export const extractPaletteBodySchema = z
  .object({
    colors: z
      .array(z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/))
      .min(1)
      .max(24),
  })
  .strict();

/** Map API camelCase patch to Appwrite snake_case + *_json string fields. */
export function patchBodyToAppwriteRow(
  body: z.infer<typeof patchStyleGuideBodySchema>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (body.title !== undefined) row.title = body.title;
  if (body.style_summary !== undefined) row.style_summary = body.style_summary;
  if (body.tone_summary !== undefined) row.tone_summary = body.tone_summary;
  if (body.keywords !== undefined) {
    row.keywords_json = JSON.stringify(body.keywords);
  }
  if (body.negative_keywords !== undefined) {
    row.negative_keywords_json = JSON.stringify(body.negative_keywords);
  }
  if (body.must_have !== undefined) {
    row.must_have_json = JSON.stringify(body.must_have);
  }
  if (body.avoid !== undefined) row.avoid_json = JSON.stringify(body.avoid);
  if (body.palette_primary !== undefined) {
    row.palette_primary_json = JSON.stringify(body.palette_primary);
  }
  if (body.palette_secondary !== undefined) {
    row.palette_secondary_json = JSON.stringify(body.palette_secondary);
  }
  if (body.palette_accent !== undefined) {
    row.palette_accent_json = JSON.stringify(body.palette_accent);
  }
  if (body.palette_background !== undefined) {
    row.palette_background_json = JSON.stringify(body.palette_background);
  }
  if (body.typography_notes !== undefined) {
    row.typography_notes = body.typography_notes;
  }
  if (body.compact_prompt !== undefined) {
    row.compact_prompt = body.compact_prompt;
  }
  if (body.status !== undefined) row.status = body.status;
  return row;
}

export function parseJsonStringArray(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.map((x) => String(x)) : [];
    } catch {
      return [];
    }
  }
  return [];
}
