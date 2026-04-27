/**
 * T14 Job Handlers — Cancel + Retry.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import {
  cancelJobDoc,
  getJobById,
  resetJobForRetry,
  triggerFunctionExecution,
} from "../_shared/job-service";
import { SUPPORTED_JOBS } from "../config/supported-jobs";

export async function handleCancel(
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

  if (job.status !== "pending" && job.status !== "processing") {
    sendJson(res, 409, {
      error: `Cannot cancel job with status: ${job.status}`,
    });
    return;
  }

  try {
    await cancelJobDoc(jobId);

    sendJson(res, 200, {
      success: true,
      jobId,
      status: "cancelled",
      message: "Job cancelled",
    });
  } catch (error) {
    sendServerError(res, error);
  }
}

export async function handleRetry(
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

  if (job.status !== "failed" && job.status !== "cancelled") {
    sendJson(res, 409, {
      error: `Cannot retry job with status: ${job.status}`,
    });
    return;
  }

  const config = SUPPORTED_JOBS[job.functionName];
  if (!config) {
    sendJson(res, 422, {
      error: `Unsupported job type for retry: ${job.functionName}`,
    });
    return;
  }

  try {
    await resetJobForRetry(jobId);

    triggerFunctionExecution(
      config.functionId,
      jobId,
      job.payload,
      bootstrap.user.id,
    ).catch((err) => {
      console.error(`[jobs] retry trigger failed for ${jobId}:`, err);
      // Fire-and-forget; client polls status for actual result
    });

    sendJson(res, 200, {
      success: true,
      jobId,
      status: "pending",
      message: "Job retried",
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
