/**
 * Job Runner - KISS: Simple wrapper for async job execution
 * Usage: Wrap any long-running function with this
 */

import { jobService } from "./jobService.ts";
import type { JobStatusResponse } from "./types.ts";

/**
 * Execute a function as an async job
 * 1. Creates job entry immediately
 * 2. Returns jobId to client (202 Accepted)
 * 3. Executes async in background
 */
export async function runAsJob<TPayload, TResult>(
  functionName: string,
  payload: TPayload,
  executor: (
    payload: TPayload,
    updateProgress: (p: number) => Promise<void>,
  ) => Promise<TResult>,
  options?: {
    jobId?: string;
    timeoutMs?: number;
  },
): Promise<{ jobId: string } & JobStatusResponse<TResult>> {
  // Step 1: Create job entry (immediate)
  const job = await jobService.createJob({
    functionName,
    payload,
    jobId: options?.jobId,
  });

  // Step 2: Start execution async (non-blocking)
  const startExecution = async () => {
    try {
      await jobService.startJob(job.$id);

      // Progress updater
      const updateProgress = async (progress: number) => {
        await jobService.updateProgress(job.$id, progress);
      };

      // Execute the actual work
      const result = await executor(payload, updateProgress);

      // Mark as complete
      await jobService.completeJob(job.$id, result);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      await jobService.failJob(job.$id, errorMessage);
    }
  };

  // Fire and forget - don't await
  startExecution().catch(console.error);

  // Step 3: Return immediately to client
  return {
    jobId: job.$id,
    status: "pending",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

/**
 * Get current status of a job
 * Fast operation - always < 100ms
 */
export async function getJobStatus<TResult>(
  jobId: string,
): Promise<JobStatusResponse<TResult> | null> {
  const job = await jobService.getJob(jobId);

  if (!job) return null;

  return {
    jobId: job.$id,
    status: job.status,
    progress: job.progress,
    result: job.result as TResult | undefined,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
