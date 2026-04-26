import { z } from "zod";

const ownerTypes = [
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

const mediaTypes = ["image", "audio", "video", "document"] as const;

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
  .strict();

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
