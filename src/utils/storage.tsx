import { getAuthToken } from "../lib/auth/getAuthToken";
import { apiGateway } from "../lib/api-gateway";
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../lib/api-gateway";
import {
  prepareImageFileForUpload,
  type PrepareImageFileOptions,
} from "../lib/image-upload-prep";

interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload an image through the backend storage adapter
 * @param file - The file to upload
 * @param userId - The user ID
 * @param folder - Optional folder name (e.g., 'avatars', 'characters', 'worlds')
 * @returns Object with the signed URL and file path
 */
export async function uploadImage(
  file: File,
  userId: string,
  folder: string = "general",
  prepOptions?: PrepareImageFileOptions
): Promise<UploadResult> {
  try {
    // Get auth token
    const token = await getAuthToken();

    if (!token) {
      throw new Error("Unauthorized - please log in");
    }

    const ready = await prepareImageFileForUpload(file, prepOptions);

    const formData = new FormData();
    formData.append("file", ready);
    formData.append("userId", userId);
    formData.append("folder", folder);

    // apiGateway doesn't support FormData yet, so this uses fetch directly
    // with the correct backend route URL from the gateway.
    const response = await fetch(
      buildFunctionRouteUrl(EDGE_FUNCTIONS.AUTH, "/storage/upload"),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const data = await response.json();
    return {
      url: data.url,
      path: data.path,
    };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

/**
 * Get storage usage for a user
 * @param userId - The user ID (not used, derived from auth token)
 * @returns Storage usage information
 */
export async function getStorageUsage(userId?: string): Promise<{
  totalSize: number;
  fileCount: number;
  files: Array<{ name: string; size: number; createdAt: string }>;
}> {
  try {
    // Get auth token
    const token = await getAuthToken();

    if (!token) {
      throw new Error("Unauthorized - please log in");
    }

    // Use API Gateway for storage usage
    return await apiGateway({
      method: "GET",
      route: "/storage/usage",
      accessToken: token,
    });
  } catch (error) {
    console.error("Storage usage error:", error);
    throw error;
  }
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Get the storage limit for the free tier
 * Current app storage soft limit: 1 GB
 */
export const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB
export const STORAGE_LIMIT_MB = 1024; // 1 GB in MB

/**
 * Check if upload would exceed storage limit
 */
export function wouldExceedLimit(currentBytes: number, fileSize: number): boolean {
  return (currentBytes + fileSize) > STORAGE_LIMIT_BYTES;
}
