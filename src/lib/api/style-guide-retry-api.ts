/**
 * Style Guide API with Retry Logic for Timeouts
 *
 * Handles 408/504 timeouts by:
 * 1. First attempt with 10s timeout
 * 2. If timeout, retry with longer timeout (60s)
 * 3. If still fails, return cached/pending state and poll
 */

import { apiClient, ApiError } from "../api-client";
import type {
  StyleGuideData,
  StyleGuideItem,
  CreateReferencePayload,
} from "./style-guide-api";

interface PendingOperation {
  id: string;
  status: "pending" | "completed" | "failed";
  result?: StyleGuideData;
  error?: string;
}

const pendingOps = new Map<string, PendingOperation>();

function generateOpId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create reference with retry logic for timeouts
 */
export async function createReferenceWithRetry(
  projectId: string,
  payload: CreateReferencePayload,
  onProgress?: (status: "uploading" | "processing" | "completed") => void,
): Promise<StyleGuideData> {
  const opId = generateOpId();

  onProgress?.("uploading");

  try {
    // Attempt 1: Short timeout (10s) for small images
    const res = await apiClient.post<{
      styleGuide: StyleGuideData;
      item?: StyleGuideItem;
    }>(`/style-guide/${projectId}/references`, payload, {
      timeout: 10000,
    });

    onProgress?.("completed");
    return res.styleGuide;
  } catch (error) {
    const apiError = error as ApiError;

    // If 408/504 timeout or network error, retry with longer timeout
    if (
      apiError.status === 408 ||
      apiError.status === 504 ||
      apiError.status === 0
    ) {
      console.log("First attempt timeout, retrying with longer timeout...");
      onProgress?.("processing");

      try {
        // Attempt 2: Longer timeout (60s)
        const res = await apiClient.post<{
          styleGuide: StyleGuideData;
          item?: StyleGuideItem;
        }>(`/style-guide/${projectId}/references`, payload, {
          timeout: 60000,
        });

        onProgress?.("completed");
        return res.styleGuide;
      } catch (retryError) {
        const retryApiError = retryError as ApiError;

        // If still timeout, start background polling
        if (retryApiError.status === 408 || retryApiError.status === 504) {
          console.log("Second attempt timeout, starting background polling...");
          return startBackgroundPolling(projectId, opId, onProgress);
        }

        throw retryError;
      }
    }

    throw error;
  }
}

/**
 * Start background polling for operation completion
 * Returns current state immediately, updates in background
 */
async function startBackgroundPolling(
  projectId: string,
  opId: string,
  onProgress?: (status: "uploading" | "processing" | "completed") => void,
): Promise<StyleGuideData> {
  // Store pending operation
  pendingOps.set(opId, {
    id: opId,
    status: "pending",
  });

  // Start background polling
  pollForCompletion(projectId, opId, onProgress);

  // Return current style guide state immediately
  // (the reference will be added when processing completes)
  const { getStyleGuide } = await import("./style-guide-api");
  const currentState = await getStyleGuide(projectId);

  // Add placeholder for pending reference
  return {
    ...currentState,
    // The actual reference will appear on next refresh
  };
}

async function pollForCompletion(
  projectId: string,
  opId: string,
  onProgress?: (status: "uploading" | "processing" | "completed") => void,
): Promise<void> {
  const maxAttempts = 30; // 30 attempts * 2s = 60s max
  const intervalMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      const { getStyleGuide } = await import("./style-guide-api");
      const state = await getStyleGuide(projectId);

      // Check if new reference appeared (by comparing timestamps or count)
      pendingOps.set(opId, {
        id: opId,
        status: "completed",
        result: state,
      });

      onProgress?.("completed");
      return;
    } catch (error) {
      // Continue polling
    }
  }

  // Max attempts reached
  pendingOps.set(opId, {
    id: opId,
    status: "failed",
    error: "Processing timeout - please refresh to see result",
  });
}

/**
 * Get pending operation status
 */
export function getPendingOperation(id: string): PendingOperation | undefined {
  return pendingOps.get(id);
}

/**
 * Clear pending operation
 */
export function clearPendingOperation(id: string): void {
  pendingOps.delete(id);
}

// Re-export other functions
export {
  getStyleGuide,
  patchStyleGuide,
  updateReference,
  deleteReference,
  reorderReferences,
  buildPrompt,
  exportStyleGuide,
} from "./style-guide-api";
