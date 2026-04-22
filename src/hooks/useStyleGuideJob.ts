/**
 * useStyleGuideJob - Async job-based Style Guide operations
 * Replaces synchronous API calls to prevent 408 timeouts
 */

import { useCallback } from "react";
import { useLongRunningJob } from "./useLongRunningJob";
import type { StyleGuideData, StyleGuideItem } from "@/lib/api/style-guide-api";

interface StyleGuideJobResult {
  styleGuide: StyleGuideData;
  item?: StyleGuideItem;
}

interface UseStyleGuideJobOptions {
  onSuccess?: (data: StyleGuideJobResult) => void;
  onError?: (error: string) => void;
}

export function useStyleGuideJob(options: UseStyleGuideJobOptions = {}) {
  const { start, result, isLoading, progress, error, reset } =
    useLongRunningJob<StyleGuideJobResult>({
      onComplete: (data) => {
        options.onSuccess?.(data as StyleGuideJobResult);
      },
      onError: (err) => {
        options.onError?.(err);
      },
    });

  /**
   * Get Style Guide via async job
   * Fast operation - usually completes in < 1s
   */
  const getStyleGuide = useCallback(
    async (projectId: string) => {
      reset();
      await start("style-guide", {
        action: "get",
        projectId,
      });
    },
    [start, reset],
  );

  /**
   * Create reference (image upload) via async job
   * This is the SLOW operation that causes 408 timeouts
   */
  const createReference = useCallback(
    async (
      projectId: string,
      payload: {
        kind: "image" | "text" | "link";
        title?: string;
        caption?: string;
        image_url?: string;
        source_url?: string;
        source_name?: string;
        tags?: string[];
        influence?: number;
        pinned?: boolean;
        license_note?: string;
        text_body?: string;
        fileBase64?: string;
        fileName?: string;
        mimeType?: string;
      },
    ) => {
      reset();
      await start("style-guide", {
        action: "createReference",
        projectId,
        payload,
      });
    },
    [start, reset],
  );

  /**
   * Update reference via async job
   */
  const updateReference = useCallback(
    async (
      referenceId: string,
      payload: Partial<{
        kind: "image" | "text" | "link";
        title?: string;
        caption?: string;
        image_url?: string;
        source_url?: string;
        source_name?: string;
        tags?: string[];
        influence?: number;
        pinned?: boolean;
        license_note?: string;
        text_body?: string;
      }>,
    ) => {
      reset();
      await start("style-guide", {
        action: "updateReference",
        referenceId,
        payload,
      });
    },
    [start, reset],
  );
  const extractPalette = useCallback(
    async (referenceId: string, colors: string[]) => {
      reset();
      await start("style-guide", {
        action: "extractPalette",
        referenceId,
        colors,
      });
    },
    [start, reset],
  );

  /**
   * Delete reference via async job
   */
  const deleteReference = useCallback(
    async (referenceId: string) => {
      reset();
      await start("style-guide", {
        action: "deleteReference",
        referenceId,
      });
    },
    [start, reset],
  );

  /**
   * Reorder references via async job
   */
  const reorderReferences = useCallback(
    async (projectId: string, orderedIds: string[]) => {
      reset();
      await start("style-guide", {
        action: "reorderReferences",
        projectId,
        orderedIds,
      });
    },
    [start, reset],
  );

  return {
    // Actions
    getStyleGuide,
    createReference,
    updateReference,
    extractPalette,
    deleteReference,
    reorderReferences,

    // State
    result,
    isLoading,
    progress,
    error,
    reset,
  };
}
