import { z } from "zod";

/**
 * Owner/Purpose-Matrix – Single Source of Truth.
 *
 * Alle Dokumentationen (backend-domain-map.md, Done-Reports etc.)
 * verweisen auf diese Datei. Änderungen nur hier vornehmen.
 */

export const ownerTypes = [
  "project",
  "shot",
  "script",
  "script_block",
  "world",
  "world_item",
  "character",
  "style_guide",
  "stage",
  "scene",
] as const;

export const mediaTypes = ["image", "audio", "video", "document"] as const;

const PURPOSES_BY_OWNER = {
  project: ["cover", "backdrop", "reference"] as const,
  shot: ["storyboard", "reference", "dialogue_audio"] as const,
  script: ["reference", "attachment", "export_pdf"] as const,
  script_block: ["dialogue_audio", "ambience", "sfx"] as const,
  world: ["reference_map", "style_reference"] as const,
  world_item: ["image", "attachment"] as const,
  character: ["avatar", "reference", "concept_art"] as const,
  style_guide: ["reference", "color_palette", "font"] as const,
  stage: ["stage_document", "prop_image"] as const,
  scene: ["mood_image", "reference"] as const,
} as const;

const PURPOSES_BY_MEDIA = {
  image: [
    "cover",
    "backdrop",
    "reference",
    "storyboard",
    "avatar",
    "concept_art",
    "mood_image",
    "prop_image",
    "color_palette",
  ] as const,
  audio: ["dialogue_audio", "ambience", "sfx", "music", "voiceover"] as const,
  video: ["reference", "clip", "animatic"] as const,
  document: [
    "attachment",
    "export_pdf",
    "stage_document",
    "script",
    "font",
  ] as const,
} as const;

/** Union type of all valid purpose strings — typo-safe at compile time. */
export type AssetPurpose =
  | (typeof PURPOSES_BY_OWNER)[keyof typeof PURPOSES_BY_OWNER][number]
  | (typeof PURPOSES_BY_MEDIA)[keyof typeof PURPOSES_BY_MEDIA][number];

/** Shared lookup helper — DRY for isValidCombination + formatMatrixViolation. */
function resolvePurposes(
  ownerType: string | undefined | null,
  mediaType: string | undefined | null,
) {
  const ownerPurposes = ownerType
    ? (PURPOSES_BY_OWNER as Record<string, readonly string[]>)[ownerType]
    : undefined;
  const mediaPurposes = mediaType
    ? (PURPOSES_BY_MEDIA as Record<string, readonly string[]>)[mediaType]
    : undefined;

  // Fail closed: if owner_type or media_type is provided but unmapped, reject
  const ownerInvalid =
    ownerType !== undefined &&
    ownerType !== null &&
    ownerType !== "" &&
    ownerPurposes === undefined;
  const mediaInvalid =
    mediaType !== undefined &&
    mediaType !== null &&
    mediaType !== "" &&
    mediaPurposes === undefined;

  return { ownerPurposes, mediaPurposes, ownerInvalid, mediaInvalid };
}

export function isValidCombination(
  ownerType: string | undefined | null,
  mediaType: string | undefined | null,
  purpose: string | undefined | null,
): boolean {
  if (!purpose) return true;

  const { ownerPurposes, mediaPurposes, ownerInvalid, mediaInvalid } =
    resolvePurposes(ownerType, mediaType);

  if (ownerInvalid || mediaInvalid) return false;

  if (ownerPurposes && mediaPurposes) {
    return ownerPurposes.includes(purpose) && mediaPurposes.includes(purpose);
  }
  if (ownerPurposes) return ownerPurposes.includes(purpose);
  if (mediaPurposes) return mediaPurposes.includes(purpose);
  return true;
}

export function formatMatrixViolation(
  ownerType: string | undefined | null,
  mediaType: string | undefined | null,
  purpose: string | undefined | null,
): string {
  if (!purpose) return "";
  const parts: string[] = [];
  const { ownerPurposes, mediaPurposes, ownerInvalid, mediaInvalid } =
    resolvePurposes(ownerType, mediaType);

  if (ownerInvalid) {
    parts.push(`owner_type '${ownerType}' is not a valid owner type`);
  }
  if (mediaInvalid) {
    parts.push(`media_type '${mediaType}' is not a valid media type`);
  }
  if (ownerPurposes && !ownerPurposes.includes(purpose)) {
    parts.push(
      `purpose '${purpose}' is not allowed for owner_type '${ownerType}' (allowed: ${ownerPurposes.join(", ")})`,
    );
  }
  if (mediaPurposes && !mediaPurposes.includes(purpose)) {
    parts.push(
      `purpose '${purpose}' is not allowed for media_type '${mediaType}' (allowed: ${mediaPurposes.join(", ")})`,
    );
  }
  return parts.join("; ");
}

export const createAssetSchema = z
  .object({
    project_id: z.string().min(1),
    owner_type: z.enum(ownerTypes).optional(),
    owner_id: z.string().optional(),
    media_type: z.enum(mediaTypes).optional(),
    purpose: z.string().optional(),
    fileBase64: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    bucket_id: z.string().optional(),
    metadata: z.string().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!isValidCombination(data.owner_type, data.media_type, data.purpose)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: formatMatrixViolation(
          data.owner_type,
          data.media_type,
          data.purpose,
        ),
      });
    }
  });

export const updateAssetSchema = z
  .object({
    owner_type: z.enum(ownerTypes).optional().nullable(),
    owner_id: z.string().optional().nullable(),
    media_type: z.enum(mediaTypes).optional().nullable(),
    purpose: z.string().optional().nullable(),
    status: z.enum(["uploading", "active", "failed", "deleted"]).optional(),
    metadata: z.string().optional().nullable(),
    expected_revision: z.coerce.number().optional(),
  })
  .strict();

export const linkAssetSchema = z
  .object({
    owner_type: z.enum(ownerTypes),
    owner_id: z.string().min(1),
  })
  .strict();
