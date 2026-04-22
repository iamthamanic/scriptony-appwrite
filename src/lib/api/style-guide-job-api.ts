/**
 * Style Guide API with Job Queue fallback
 * 
 * First tries direct API call (fast operations).
 * Falls back to async job queue for slow operations (image upload, etc.)
 * to avoid 408 timeouts.
 */

import { apiClient } from "../api-client";
import { startJob, getJobStatus, getJobResult } from "../jobs/jobApi";
import type {
  StyleGuideData,
  StyleGuideItem,
  CreateReferencePayload,
} from "./style-guide-api";

const MAX_DIRECT_WAIT_MS = 10000; // 10 seconds - if longer, use job queue

interface StyleGuideJobResult {
  styleGuide: StyleGuideData;
  item?: StyleGuideItem;
}

/**
 * Create reference with automatic job queue fallback
 */
export async function createReferenceWithFallback(
  projectId: string,
  payload: CreateReferencePayload,
): Promise<StyleGuideData> {
  // For image uploads with files, always use job queue
  if (payload.fileBase64 || payload.kind === "image") {
    return createReferenceViaJob(projectId, payload);
  }

  // For text/link, try direct API first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAX_DIRECT_WAIT_MS);

    const res = await apiClient.post<{
      styleGuide: StyleGuideData;
      item?: StyleGuideItem;
    }>(`/style-guide/${projectId}/references`, payload, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return res.styleGuide;
  } catch (error) {
    // If timeout or error, fall back to job queue
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("timeout"))
    ) {
      console.log("Direct API timeout, falling back to job queue...");
      return createReferenceViaJob(projectId, payload);
    }
    throw error;
  }
}

/**
 * Create reference via async job queue
 * No timeout issues, but takes longer
 */
async function createReferenceViaJob(
  projectId: string,
  payload: CreateReferencePayload,
): Promise<StyleGuideData> {
  const { jobId } = await startJob("style-guide", {
    action: "createReference",
    projectId,
    payload,
  });

  // Poll for result
  const startTime = Date.now();
  const maxWaitMs = 300000; // 5 minutes
  const pollIntervalMs = 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getJobStatus<StyleGuideJobResult>(jobId);

    if (status.status === "completed" && status.result) {
      return status.result.styleGuide;
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Job failed");
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Job polling timeout");
}

/**
 * Extract palette with job queue fallback
 */
export async function extractPaletteWithFallback(
  referenceId: string,
  colors: string[],
): Promise<StyleGuideData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAX_DIRECT_WAIT_MS);

    const res = await apiClient.post<{ styleGuide: StyleGuideData }>(
      `/style-guide/references/${referenceId}/extract-palette`,
      { colors },
      { signal: controller.signal },
    );

    clearTimeout(timeoutId);
    return res.styleGuide;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("timeout"))
    ) {
      return extractPaletteViaJob(referenceId, colors);
    }
    throw error;
  }
}

async function extractPaletteViaJob(
  referenceId: string,
  colors: string[],
): Promise<StyleGuideData> {
  const { jobId } = await startJob("style-guide", {
    action: "extractPalette",
    referenceId,
    colors,
  });

  const startTime = Date.now();
  const maxWaitMs = 300000;
  const pollIntervalMs = 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getJobStatus<StyleGuideJobResult>(jobId);

    if (status.status === "completed" && status.result) {
      return status.result.styleGuide;
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Job failed");
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Job polling timeout");
}

// Re-export other functions that don't have timeout issues
export {
  getStyleGuide,
  patchStyleGuide,
  updateReference,
  deleteReference,
  reorderReferences,
  buildPrompt,
  exportStyleGuide,
} from "./style-guide-api";
