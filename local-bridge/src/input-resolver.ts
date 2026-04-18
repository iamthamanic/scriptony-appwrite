/**
 * Input resolver — downloads input images from Appwrite Storage
 * and uploads them to ComfyUI so they can be referenced in workflows.
 *
 * Handles:
 *   - Guide bundle masks and source images
 *   - Style profile reference images
 *   - Repair config input images
 */

import { Databases, Storage } from "node-appwrite";
import { getDatabases, getStorage, Collections } from "./appwrite-client.js";
import { uploadImage } from "./comfyui-client.js";
import { getConfig } from "./config.js";
import { log, formatError } from "./logger.js";
import type { RenderJobDocument } from "./types.js";

// ---------------------------------------------------------------------------
// Download a file from Appwrite Storage
// ---------------------------------------------------------------------------

export async function downloadFromStorage(
  bucketId: string,
  fileId: string,
): Promise<Buffer> {
  const storage: Storage = getStorage();

  log.info("input-resolver", "Downloading from Appwrite Storage", { bucketId, fileId });

  const result = await storage.getFileDownload(bucketId, fileId);
  const arrayBuffer = result instanceof ArrayBuffer
    ? result
    : (result as unknown as { buffer?: ArrayBuffer }).buffer ?? result;

  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// Resolve guide bundle inputs
// ---------------------------------------------------------------------------

async function resolveGuideBundleInputs(
  guideBundleId: string,
): Promise<Record<string, string>> {
  const db: Databases = getDatabases();
  const config = getConfig();
  const inputs: Record<string, string> = {};

  try {
    const doc = await db.getDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.guideBundles,
      guideBundleId,
    );

    const bucketId = config.BRIDGE_STORAGE_BUCKET;

    // Download mask file if present
    const maskFileId = String(doc.maskFileId ?? doc.mask_file_id ?? "");
    if (maskFileId) {
      log.info("input-resolver", "Downloading mask from guide bundle", { maskFileId });
      const maskBuffer = await downloadFromStorage(bucketId, maskFileId);
      const comfyName = await uploadImage(maskBuffer, `mask-${maskFileId}.png`, "image/png");
      inputs.mask_image = comfyName;
    }

    // Download source file if present
    const sourceFileId = String(doc.sourceFileId ?? doc.source_file_id ?? "");
    if (sourceFileId) {
      log.info("input-resolver", "Downloading source from guide bundle", { sourceFileId });
      const sourceBuffer = await downloadFromStorage(bucketId, sourceFileId);
      const comfyName = await uploadImage(sourceBuffer, `source-${sourceFileId}.png`, "image/png");
      inputs.input_image = comfyName;
    }
  } catch (err) {
    log.warn("input-resolver", "Failed to resolve guide bundle", {
      guideBundleId,
      err: formatError(err),
    });
  }

  return inputs;
}

// ---------------------------------------------------------------------------
// Main: resolve all inputs for a render job
// ---------------------------------------------------------------------------

export async function resolveInputs(
  job: RenderJobDocument,
): Promise<Record<string, string>> {
  const inputs: Record<string, string> = {};

  // Guide bundle → mask + source
  if (job.guideBundleId) {
    const bundleInputs = await resolveGuideBundleInputs(job.guideBundleId);
    Object.assign(inputs, bundleInputs);
  }

  // Repair config may specify additional input image IDs
  if (job.repairConfig) {
    try {
      const rc = JSON.parse(job.repairConfig) as Record<string, unknown>;
      const inputImageId = String(rc.inputImageId ?? rc.input_image_id ?? "");
      if (inputImageId && !inputs.input_image) {
        const config = getConfig();
        const buffer = await downloadFromStorage(config.BRIDGE_STORAGE_BUCKET, inputImageId);
        const comfyName = await uploadImage(buffer, `input-${inputImageId}.png`, "image/png");
        inputs.input_image = comfyName;
      }
    } catch {
      // Invalid repairConfig — ignore, workflow-resolver handles defaults
    }
  }

  log.info("input-resolver", "Resolved inputs", {
    jobId: job.id,
    inputKeys: Object.keys(inputs),
  });

  return inputs;
}