/**
 * Upload completed render images from ComfyUI to Appwrite Storage.
 *
 * Downloads each output image from ComfyUI's /view endpoint and uploads
 * it to the configured Appwrite Storage bucket.
 */

import { ID, Permission, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { getStorage } from "./appwrite-client.js";
import { getConfig } from "./config.js";
import { log } from "./logger.js";
import { getImage } from "./comfyui-client.js";

/**
 * Upload a single image from ComfyUI to Appwrite Storage.
 *
 * @returns The Appwrite file ID of the uploaded file.
 */
export async function uploadImageToStorage(
  filename: string,
  subfolder: string,
  type: string,
  mimeType: string,
): Promise<string> {
  const config = getConfig();
  const bucketId = config.BRIDGE_STORAGE_BUCKET;

  log.info("storage", "Downloading image from ComfyUI", { filename, subfolder, type });

  const buffer = await getImage(filename, subfolder, type);

  log.info("storage", "Uploading to Appwrite Storage", {
    filename,
    size: buffer.length,
    bucket: bucketId,
  });

  const storage: Storage = getStorage();
  const inputFile = InputFile.fromBuffer(buffer, filename);

  const result = await storage.createFile(
    bucketId,
    ID.unique(),
    inputFile,
    [Permission.read(Role.users())],
  );

  log.info("storage", "Upload complete", { fileId: result.$id, filename });
  return result.$id;
}

/**
 * Upload all output images from a ComfyUI execution to Appwrite Storage.
 *
 * @param outputs The outputs object from ComfyUI history
 * @returns Array of Appwrite file IDs
 */
export async function uploadAllOutputs(
  outputs: Record<string, unknown>,
): Promise<string[]> {
  const fileIds: string[] = [];

  for (const [_nodeId, nodeOutput] of Object.entries(outputs)) {
    const node = nodeOutput as { images?: Array<{ filename: string; subfolder: string; type: string }> };
    if (!node.images) continue;

    for (const img of node.images) {
      const mimeType = guessMimeType(img.filename);
      const fileId = await uploadImageToStorage(
        img.filename,
        img.subfolder ?? "",
        img.type ?? "output",
        mimeType,
      );
      fileIds.push(fileId);
    }
  }

  return fileIds;
}

/** Guess MIME type from filename extension. */
function guessMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}