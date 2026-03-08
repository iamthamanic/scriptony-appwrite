/**
 * Image Upload API Client
 * 
 * Helper functions for uploading images through the backend storage adapter.
 */

import { getAuthToken } from '../auth/getAuthToken';
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from '../api-gateway';

const PROJECTS_API_BASE = buildFunctionRouteUrl(EDGE_FUNCTIONS.PROJECTS);
const WORLDBUILDING_API_BASE = buildFunctionRouteUrl(EDGE_FUNCTIONS.WORLDBUILDING);

/**
 * Upload project cover image
 * @param projectId - Project ID
 * @param file - Image file (max 5MB)
 * @returns Signed URL for the uploaded image (valid for 1 year)
 */
export async function uploadProjectImage(
  projectIdParam: string,
  file: File
): Promise<string> {
  // Get access token
  const accessToken = await getAuthToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);

  // Upload to backend
  const response = await fetch(
    `${PROJECTS_API_BASE}/projects/${projectIdParam}/upload-image`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to upload image: ${response.statusText}`);
  }

  const { imageUrl } = await response.json();
  return imageUrl;
}

/**
 * Upload world cover image
 * @param worldId - World ID
 * @param file - Image file (max 5MB)
 * @returns Signed URL for the uploaded image (valid for 1 year)
 */
export async function uploadWorldImage(
  worldId: string,
  file: File
): Promise<string> {
  // Get access token
  const accessToken = await getAuthToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);

  // Upload to backend
  const response = await fetch(
    `${WORLDBUILDING_API_BASE}/worlds/${worldId}/upload-image`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to upload image: ${response.statusText}`);
  }

  const { imageUrl } = await response.json();
  return imageUrl;
}

/**
 * Validate image file before upload
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB (default: 5)
 * @throws Error if file is invalid
 */
export function validateImageFile(file: File, maxSizeMB: number = 5): void {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(`Image too large: ${fileSizeMB} MB (Max: ${maxSizeMB} MB)`);
  }

  // Check file extension
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !validExtensions.includes(fileExt)) {
    throw new Error(`Invalid file type. Allowed: ${validExtensions.join(', ')}`);
  }
}
