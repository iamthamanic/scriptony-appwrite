/**
 * T14 Job Service — Shared Job-Helpers.
 */

import { ID, Query } from "node-appwrite";
import {
  createDocument,
  dbId,
  deleteDocument,
  getDocument,
  listDocumentsFull,
  updateDocument,
} from "../../_shared/appwrite-db";
import type { Job, JobStatus } from "../../_shared/jobs/types";

const DATABASE_ID = dbId();
const JOBS_COLLECTION = "jobs";

export interface JobCreateRequest {
  payload: Record<string, unknown>;
}

export async function getJobById(jobId: string): Promise<Job | null> {
  try {
    const doc = await getDocument(DATABASE_ID, JOBS_COLLECTION, jobId);
    return {
      $id: doc.$id,
      functionName: doc.function_name as string,
      status: doc.status as JobStatus,
      payload: JSON.parse((doc.payload_json as string) || "{}"),
      result: doc.result_json
        ? JSON.parse(doc.result_json as string)
        : undefined,
      error: doc.error as string | undefined,
      progress: doc.progress as number | undefined,
      user_id: (doc.user_id as string) || undefined,
      createdAt: doc.created_at as string,
      updatedAt: doc.updated_at as string,
      completedAt: doc.completed_at as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function createJobEntry(
  functionName: string,
  payload: unknown,
  userId: string,
): Promise<Job> {
  const now = new Date().toISOString();

  const doc = await createDocument(DATABASE_ID, JOBS_COLLECTION, ID.unique(), {
    function_name: functionName,
    status: "pending" as JobStatus,
    payload_json: JSON.stringify(payload),
    user_id: userId,
    progress: 0,
    result_json: null,
    error: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  });

  return {
    $id: doc.$id,
    functionName: doc.function_name as string,
    status: doc.status as JobStatus,
    payload: JSON.parse((doc.payload_json as string) || "{}"),
    result: doc.result_json ? JSON.parse(doc.result_json as string) : undefined,
    error: doc.error as string | undefined,
    progress: doc.progress as number | undefined,
    user_id: (doc.user_id as string) || undefined,
    createdAt: doc.created_at as string,
    updatedAt: doc.updated_at as string,
    completedAt: doc.completed_at as string | undefined,
  };
}

export async function cancelJobDoc(jobId: string): Promise<void> {
  await updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
    status: "cancelled",
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function resetJobForRetry(jobId: string): Promise<void> {
  await updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
    status: "pending",
    error: null,
    progress: 0,
    result_json: null,
    completed_at: null,
    updated_at: new Date().toISOString(),
  });
}

export async function triggerFunctionExecution(
  functionId: string,
  jobId: string,
  payload: unknown,
  userId: string,
): Promise<void> {
  const endpoint =
    process.env.SCRIPTONY_APPWRITE_API_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    "http://appwrite/v1";
  const apiKey = process.env.APPWRITE_API_KEY;
  const projectId = process.env.APPWRITE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error("Missing Appwrite credentials");
  }

  const response = await fetch(
    `${endpoint}/functions/${functionId}/executions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Key": apiKey,
        "X-Appwrite-Project": projectId,
      },
      body: JSON.stringify({
        async: true,
        data: JSON.stringify({
          __jobId: jobId,
          __userId: userId,
          ...payload,
        }),
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to trigger function: ${response.status} ${text}`);
  }
}

export async function cleanupOldJobs(
  olderThanHours: number,
): Promise<{ deleted: number; failed: number }> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - olderThanHours);

  const oldJobs = await listDocumentsFull(DATABASE_ID, JOBS_COLLECTION, [
    Query.equal("status", ["completed", "failed"]),
    Query.lessThan("updated_at", cutoff.toISOString()),
    Query.limit(100),
  ]);

  let deleted = 0;
  let failed = 0;
  for (const job of oldJobs) {
    try {
      await deleteDocument(DATABASE_ID, JOBS_COLLECTION, job.id as string);
      deleted++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[job-service] cleanup delete failed for ${job.id}: ${msg}`,
      );
    }
  }

  return { deleted, failed };
}
