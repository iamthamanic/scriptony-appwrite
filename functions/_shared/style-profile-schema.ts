/**
 * Validation and JSON serialization helpers for Puppet-Layer style profiles.
 */

import { z } from "zod";

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Expected hex color");

const compactStringArraySchema = z.array(z.string().trim().min(1).max(255)).max(64);
const paletteArraySchema = z.array(hexColorSchema).max(32);
const nullableTrimmedStringSchema = z.union([z.string(), z.null()]).optional();

export const styleProfileConfigSchema = z
  .object({
    styleSummary: z.string().trim().max(4000).optional(),
    toneSummary: z.string().trim().max(4000).optional(),
    keywords: compactStringArraySchema.optional(),
    negativeKeywords: compactStringArraySchema.optional(),
    mustHave: compactStringArraySchema.optional(),
    avoid: compactStringArraySchema.optional(),
    palettePrimary: paletteArraySchema.optional(),
    paletteSecondary: paletteArraySchema.optional(),
    paletteAccent: paletteArraySchema.optional(),
    paletteBackground: paletteArraySchema.optional(),
    typographyNotes: z.string().trim().max(4000).optional(),
    compactPrompt: z.string().trim().max(8000).optional(),
    source: z
      .object({
        type: z.enum(["manual", "style-guide", "import", "unknown"]).optional(),
        referenceId: z.string().trim().max(255).optional(),
        label: z.string().trim().max(255).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const createStyleProfileBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  projectId: nullableTrimmedStringSchema,
  previewImageId: nullableTrimmedStringSchema,
  config: styleProfileConfigSchema.default({}),
});

export const updateStyleProfileBodySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  projectId: nullableTrimmedStringSchema,
  previewImageId: nullableTrimmedStringSchema,
  config: styleProfileConfigSchema.optional(),
});

export const applyStyleProfileBodySchema = z
  .object({
    shotId: z.string().trim().min(1).max(255),
    profileId: nullableTrimmedStringSchema,
    styleProfileId: nullableTrimmedStringSchema,
  })
  .superRefine((body, ctx) => {
    if (body.profileId === undefined && body.styleProfileId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "profileId or styleProfileId is required",
        path: ["profileId"],
      });
    }
  });

export type StyleProfileConfig = z.infer<typeof styleProfileConfigSchema>;
export type CreateStyleProfileBody = z.infer<typeof createStyleProfileBodySchema>;
export type UpdateStyleProfileBody = z.infer<typeof updateStyleProfileBodySchema>;
export type ApplyStyleProfileBody = z.infer<typeof applyStyleProfileBodySchema>;

function normalizeNullableString(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalizeStyleProfileCreateBody(
  body: CreateStyleProfileBody
): CreateStyleProfileBody {
  return {
    ...body,
    projectId: normalizeNullableString(body.projectId),
    previewImageId: normalizeNullableString(body.previewImageId),
  };
}

export function normalizeStyleProfileUpdateBody(
  body: UpdateStyleProfileBody
): UpdateStyleProfileBody {
  return {
    ...body,
    projectId: normalizeNullableString(body.projectId),
    previewImageId: normalizeNullableString(body.previewImageId),
  };
}

export function normalizeApplyStyleProfileBody(
  body: ApplyStyleProfileBody
): { shotId: string; styleProfileId: string | null } {
  const profileId = normalizeNullableString(body.styleProfileId ?? body.profileId);
  return {
    shotId: body.shotId.trim(),
    styleProfileId: profileId ?? null,
  };
}

export function serializeStyleProfileConfig(config: StyleProfileConfig): string {
  const json = JSON.stringify(config);
  if (json.length > 10000) {
    throw new Error("config exceeds 10000 characters");
  }
  return json;
}

export function parseStyleProfileConfig(raw: unknown): StyleProfileConfig {
  if (typeof raw !== "string" || !raw.trim()) {
    return {};
  }
  const parsed = JSON.parse(raw);
  return styleProfileConfigSchema.parse(parsed);
}
