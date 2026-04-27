/**
 * T14 Job Handlers — Cleanup.
 */

import { z } from "zod";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import { cleanupOldJobs } from "../_shared/job-service";

const CleanupBody = z.object({
  hours: z.number().int().positive().optional(),
});

export async function handleCleanup(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const parsed = CleanupBody.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    sendJson(res, 400, {
      error: "Invalid request body",
      details: parsed.error.issues,
    });
    return;
  }
  const olderThanHours = parsed.data.hours ?? 24;

  try {
    const { deleted, failed } = await cleanupOldJobs(olderThanHours);

    sendJson(res, 200, {
      success: true,
      deleted,
      failed,
      message: `Cleaned up ${deleted} old jobs (${failed} failed)`,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
