/**
 * useLongRunningJob - React hook for async job management
 * SOLID: Encapsulates job lifecycle logic
 * KISS: Simple polling + state management
 *
 * Usage:
 * const { start, status, isLoading, result, error } = useLongRunningJob<StyleGuide>();
 *
 * const handleGenerate = async () => {
 *   const { jobId } = await start('style-guide', { projectId: '123' });
 *   // Automatically polls until complete
 * };
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { startJob, getJobStatus } from "@/lib/jobs/jobApi";
import type {
  JobStatus,
  JobStatusResponse,
  JobStartResponse,
} from "@/lib/jobs/types";

interface UseLongRunningJobOptions {
  intervalMs?: number; // Default: 1000ms
  timeoutMs?: number; // Default: 300000 (5 minutes)
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: JobStatus) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: string) => void;
}

interface UseLongRunningJobReturn<TResult> {
  // State
  jobId: string | null;
  status: JobStatus | null;
  progress: number;
  result: TResult | null;
  error: string | null;

  // Loading states
  isLoading: boolean; // true while polling
  isSubmitting: boolean; // true during initial POST

  // Actions
  start: <TPayload>(
    functionName: string,
    payload: TPayload,
  ) => Promise<JobStartResponse>;
  stop: () => void; // Cancel polling
  reset: () => void; // Reset all state
}

export function useLongRunningJob<TResult = unknown>(
  options: UseLongRunningJobOptions = {},
): UseLongRunningJobReturn<TResult> {
  const {
    intervalMs = 1000,
    timeoutMs = 300000,
    onProgress,
    onStatusChange,
    onComplete,
    onError,
  } = options;

  // State
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Refs for polling control
  const abortRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  /**
   * Start a new job
   */
  const start = useCallback(
    async <TPayload>(
      functionName: string,
      payload: TPayload,
    ): Promise<JobStartResponse> => {
      // Reset previous state
      reset();
      setIsSubmitting(true);
      abortRef.current = false;

      try {
        const response = await startJob(functionName, payload);

        setJobId(response.jobId);
        setStatus("pending");
        onStatusChange?.("pending");

        // Start polling
        startPolling(response.jobId);

        return response;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to start job";
        setError(errorMsg);
        onError?.(errorMsg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onStatusChange, onError],
  );

  /**
   * Poll job status
   */
  const startPolling = useCallback(
    async (currentJobId: string) => {
      setIsPolling(true);
      const startTime = Date.now();

      const poll = async () => {
        if (abortRef.current) return;

        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          setError("Job timed out");
          setIsPolling(false);
          onError?.("Job timed out");
          return;
        }

        try {
          const jobStatus = await getJobStatus<TResult>(currentJobId);

          if (abortRef.current) return;

          // Update state
          setStatus(jobStatus.status);
          if (jobStatus.progress !== undefined) {
            setProgress(jobStatus.progress);
            onProgress?.(jobStatus.progress);
          }

          onStatusChange?.(jobStatus.status);

          // Handle completion
          if (jobStatus.status === "completed") {
            setResult(jobStatus.result || null);
            setIsPolling(false);
            if (jobStatus.result) {
              onComplete?.(jobStatus.result);
            }
            return;
          }

          // Handle failure
          if (jobStatus.status === "failed") {
            const errorMsg = jobStatus.error || "Job failed";
            setError(errorMsg);
            setIsPolling(false);
            onError?.(errorMsg);
            return;
          }

          // Continue polling
          timeoutRef.current = setTimeout(poll, intervalMs);
        } catch (err) {
          // Network error? Retry
          if (!abortRef.current) {
            timeoutRef.current = setTimeout(poll, intervalMs * 2); // Backoff
          }
        }
      };

      poll();
    },
    [intervalMs, timeoutMs, onProgress, onStatusChange, onComplete, onError],
  );

  /**
   * Stop polling
   */
  const stop = useCallback(() => {
    abortRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    stop();
    setJobId(null);
    setStatus(null);
    setProgress(0);
    setResult(null);
    setError(null);
    setIsSubmitting(false);
  }, [stop]);

  const isLoading = isSubmitting || isPolling;

  return {
    jobId,
    status,
    progress,
    result,
    error,
    isLoading,
    isSubmitting,
    start,
    stop,
    reset,
  };
}

export default useLongRunningJob;
