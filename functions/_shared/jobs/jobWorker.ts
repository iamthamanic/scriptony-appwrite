/**
 * Job Worker Helpers
 * Functions call these to report progress/completion when running as jobs
 */

import { dbId, getDatabases } from "../appwrite-db";

const DATABASE_ID = dbId();
const JOBS_COLLECTION = "jobs";

interface JobContext {
  jobId: string;
  userId: string;
  isJob: boolean;
}

/**
 * Extract job context from function payload
 * Call this at the start of your function
 */
export function extractJobContext(payload: unknown): JobContext | null {
  if (!payload || typeof payload !== "object") return null;

  const p = payload as Record<string, unknown>;
  const jobId = p.__jobId as string | undefined;
  const userId = p.__userId as string | undefined;

  if (!jobId) return null;

  return {
    jobId,
    userId: userId || "",
    isJob: true,
  };
}

/**
 * Strip internal job fields from payload before processing
 */
export function stripJobFields(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const { __jobId, __userId, ...rest } = payload;
  return rest;
}

/**
 * Update job progress (0-100)
 */
export async function reportJobProgress(
  jobId: string,
  progress: number,
): Promise<void> {
  try {
    const db = getDatabases();
    await db.updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
      progress: Math.min(100, Math.max(0, progress)),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Failed to update job progress:`, error);
  }
}

/**
 * Mark job as completed with result
 */
export async function completeJob<T>(
  jobId: string,
  result: T,
): Promise<void> {
  try {
    const db = getDatabases();
    await db.updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
      status: "completed",
      result_json: JSON.stringify(result),
      progress: 100,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Failed to complete job:`, error);
  }
}

/**
 * Mark job as failed
 */
export async function failJob(
  jobId: string,
  error: string,
): Promise<void> {
  try {
    const db = getDatabases();
    await db.updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
      status: "failed",
      error: error.slice(0, 2000),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`Failed to fail job:`, err);
  }
}

/**
 * Wrap any async operation with job reporting
 * Usage: const result = await wrapWithJobReporting(jobContext, async () => { ... });
 */
export async function wrapWithJobReporting<T>(
  context: JobContext | null,
  operation: (reportProgress: (p: number) => void) => Promise<T>,
): Promise<T> {
  if (!context?.isJob) {
    // Not running as job, just execute
    return await operation(() => {}); // No-op progress reporter
  }

  try {
    // Mark as processing
    await reportJobProgress(context.jobId, 0);

    const result = await operation(async (progress) => {
      await reportJobProgress(context.jobId, progress);
    });

    // Mark as complete
    await completeJob(context.jobId, result);

    return result;
  } catch (error) {
    // Mark as failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    await failJob(context.jobId, errorMessage);
    throw error;
  }
}
