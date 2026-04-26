/**
 * Jobs Handler - Central async job queue for long-running operations
 */

import { ID, Query } from "node-appwrite";
import { requireUserBootstrap } from "../_shared/auth";
import {
  C,
  createDocument,
  dbId,
  deleteDocument,
  getDocument,
  listDocumentsFull,
  updateDocument,
} from "../_shared/appwrite-db";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import type { Job, JobStatus } from "../_shared/jobs/types";

const DATABASE_ID = dbId();
const JOBS_COLLECTION = "jobs";

const SUPPORTED_JOBS: Record<
  string,
  {
    functionId: string;
    timeoutMs: number;
    requiresAuth: boolean;
  }
> = {
  "style-guide": {
    functionId: "scriptony-style-guide",
    timeoutMs: 120000,
    requiresAuth: true,
  },
  "image-generate": {
    functionId: "scriptony-image",
    timeoutMs: 180000,
    requiresAuth: true,
  },
  "audio-process": {
    functionId: "scriptony-audio",
    timeoutMs: 300000,
    requiresAuth: true,
  },
  // T08: Audio Production Orchestration
  "audio-production-generate": {
    functionId: "scriptony-audio-story",
    timeoutMs: 300000,
    requiresAuth: true,
  },
  "audio-production-preview": {
    functionId: "scriptony-audio-story",
    timeoutMs: 300000,
    requiresAuth: true,
  },
  "audio-production-export": {
    functionId: "scriptony-audio-story",
    timeoutMs: 600000,
    requiresAuth: true,
  },
};

interface JobCreateRequest {
  payload: Record<string, unknown>;
}

async function createJobEntry(
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
    createdAt: doc.created_at as string,
    updatedAt: doc.updated_at as string,
    completedAt: doc.completed_at as string | undefined,
  };
}

async function getJobById(jobId: string): Promise<Job | null> {
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
      createdAt: doc.created_at as string,
      updatedAt: doc.updated_at as string,
      completedAt: doc.completed_at as string | undefined,
    };
  } catch {
    return null;
  }
}

async function triggerFunctionExecution(
  functionId: string,
  jobId: string,
  payload: unknown,
  userId: string,
): Promise<void> {
  const endpoint =
    Deno.env.get("SCRIPTONY_APPWRITE_API_ENDPOINT") ||
    Deno.env.get("APPWRITE_FUNCTION_API_ENDPOINT") ||
    "http://appwrite/v1";
  const apiKey = Deno.env.get("APPWRITE_API_KEY");
  const projectId = Deno.env.get("APPWRITE_PROJECT_ID");

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

async function handleCreateJob(
  req: RequestLike,
  res: ResponseLike,
  functionName: string,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const config = SUPPORTED_JOBS[functionName];
  if (!config) {
    sendBadRequest(res, `Unknown job type: ${functionName}`);
    return;
  }

  const body = (await readJsonBody(req)) as JobCreateRequest;

  try {
    const job = await createJobEntry(
      functionName,
      body.payload,
      bootstrap.user.id,
    );

    triggerFunctionExecution(
      config.functionId,
      job.$id,
      body.payload,
      bootstrap.user.id,
    ).catch(console.error);

    sendJson(res, 201, {
      jobId: job.$id,
      status: "pending",
      message: `Job queued for ${functionName}`,
      createdAt: job.createdAt,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}

async function handleGetStatus(
  req: RequestLike,
  res: ResponseLike,
  jobId: string,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const job = await getJobById(jobId);
  if (!job) {
    sendNotFound(res, "Job not found");
    return;
  }

  sendJson(res, 200, {
    success: true,
    jobId: job.$id,
    status: job.status,
    progress: job.progress ?? 0,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}

async function handleGetResult(
  req: RequestLike,
  res: ResponseLike,
  jobId: string,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const job = await getJobById(jobId);
  if (!job) {
    sendNotFound(res, "Job not found");
    return;
  }

  if (job.status === "pending" || job.status === "processing") {
    sendJson(res, 202, {
      success: false,
      error: "Job still processing",
      status: job.status,
      progress: job.progress ?? 0,
    });
    return;
  }

  if (job.status === "failed") {
    sendJson(res, 500, {
      success: false,
      error: job.error || "Job failed",
      status: "failed",
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    result: job.result,
    completedAt: job.updatedAt,
  });
}

async function handleCleanup(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody(req);
  const olderThanHours = body?.hours ?? 24;

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - olderThanHours);

  try {
    const oldJobs = await listDocumentsFull(DATABASE_ID, JOBS_COLLECTION, [
      Query.equal("status", ["completed", "failed"]),
      Query.lessThan("updated_at", cutoff.toISOString()),
      Query.limit(100),
    ]);

    let deleted = 0;
    for (const job of oldJobs.documents) {
      try {
        await deleteDocument(DATABASE_ID, JOBS_COLLECTION, job.$id);
        deleted++;
      } catch {
        // Ignore
      }
    }

    sendJson(res, 200, {
      success: true,
      deleted,
      message: `Cleaned up ${deleted} old jobs`,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}

const HEALTH_DATA = {
  status: "ok",
  service: "scriptony-jobs-handler",
  version: "1.0.0",
  supported_jobs: Object.keys(SUPPORTED_JOBS),
};

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname =
    (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string"
      ? new URL(req.url, "http://localhost").pathname
      : "/");

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, HEALTH_DATA);
    return;
  }

  try {
    const createMatch = pathname.match(/^\/v1\/jobs\/([^/]+)$/);
    if (createMatch && req.method === "POST") {
      await handleCreateJob(req, res, createMatch[1]);
      return;
    }

    const statusMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/status$/);
    if (statusMatch && req.method === "GET") {
      await handleGetStatus(req, res, statusMatch[1]);
      return;
    }

    const resultMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/result$/);
    if (resultMatch && req.method === "GET") {
      await handleGetResult(req, res, resultMatch[1]);
      return;
    }

    if (pathname === "/v1/jobs/cleanup" && req.method === "POST") {
      await handleCleanup(req, res);
      return;
    }

    sendNotFound(res, `Route not found: ${pathname}`);
  } catch (e) {
    sendServerError(res, e);
  }
}

export default createAppwriteHandler(dispatch);
