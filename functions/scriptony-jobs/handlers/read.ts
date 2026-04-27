/**
 * T14 Job Handlers — Create, Status, Result.
 */

import { z } from "zod";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import {
  createJobEntry,
  getJobById,
  triggerFunctionExecution,
} from "../_shared/job-service";
import { SUPPORTED_JOBS } from "../config/supported-jobs";

const JobCreateBody = z.object({
  payload: z.record(z.unknown()).default({}),
});

export async function handleCreateJob(
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
    sendJson(res, 422, { error: `Unknown job type: ${functionName}` });
    return;
  }

  const parsed = JobCreateBody.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    sendJson(res, 400, {
      error: "Invalid request body",
      details: parsed.error.issues,
    });
    return;
  }

  try {
    const job = await createJobEntry(
      functionName,
      parsed.data.payload,
      bootstrap.user.id,
    );

    triggerFunctionExecution(
      config.functionId,
      job.$id,
      parsed.data.payload,
      bootstrap.user.id,
    ).catch((err: unknown) => {
      console.error(`[jobs] trigger failed for ${job.$id}:`, err);
    });

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

export async function handleGetStatus(
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

  if (job.user_id && job.user_id !== bootstrap.user.id) {
    sendJson(res, 403, { error: "Forbidden: not your job" });
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

export async function handleGetResult(
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

  if (job.user_id && job.user_id !== bootstrap.user.id) {
    sendJson(res, 403, { error: "Forbidden: not your job" });
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
