/**
 * Jobs Handler - Central entry point for all async job operations
 * Replaces direct function calls for long-running operations
 *
 * Endpoints:
 * POST /v1/jobs/:functionName - Create new job
 * GET  /v1/jobs/:jobId/status  - Check job status
 * GET  /v1/jobs/:jobId/result  - Get final result (if completed)
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { getJobStatus } from "../_shared/jobs/jobRunner.ts";
import { jobService } from "../_shared/jobs/jobService.ts";
import type { Context } from "npm:hono";

const app = new Hono();

// CORS for all origins in dev
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

// Health check
app.get("/health", (c: Context) => {
  return c.json({ status: "ok", service: "jobs-handler" });
});

/**
 * POST /v1/jobs/:functionName
 * Creates a new async job
 * Returns: { jobId, status, createdAt }
 * Status: 202 Accepted
 */
app.post("/v1/jobs/:functionName", async (c: Context) => {
  const functionName = c.req.param("functionName");
  const payload = await c.req.json().catch(() => ({}));

  // Generate job ID
  const jobId = crypto.randomUUID();

  // Create job entry (pending status)
  const job = await jobService.createJob({
    functionName,
    payload,
    jobId,
  });

  // Trigger the actual function asynchronously
  // This would call the specific function endpoint
  triggerFunctionExecution(functionName, jobId, payload).catch(console.error);

  return c.json({
    jobId: job.$id,
    status: "pending",
    message: `Job queued for ${functionName}`,
    createdAt: job.createdAt,
  }, 202);
});

/**
 * GET /v1/jobs/:jobId/status
 * Fast status check (< 100ms)
 * Returns: { jobId, status, progress?, result?, error? }
 */
app.get("/v1/jobs/:jobId/status", async (c: Context) => {
  const jobId = c.req.param("jobId");
  const status = await getJobStatus(jobId);

  if (!status) {
    return c.json({ success: false, error: "Job not found" }, 404);
  }

  return c.json({
    success: true,
    ...status,
  });
});

/**
 * GET /v1/jobs/:jobId/result
 * Returns final result (only if status === 'completed')
 */
app.get("/v1/jobs/:jobId/result", async (c: Context) => {
  const jobId = c.req.param("jobId");
  const status = await getJobStatus(jobId);

  if (!status) {
    return c.json({ success: false, error: "Job not found" }, 404);
  }

  if (status.status === "pending" || status.status === "processing") {
    return c.json({
      success: false,
      error: "Job still processing",
      status: status.status,
      progress: status.progress,
    }, 202);
  }

  if (status.status === "failed") {
    return c.json({
      success: false,
      error: status.error || "Job failed",
      status: "failed",
    }, 500);
  }

  return c.json({
    success: true,
    result: status.result,
    completedAt: status.updatedAt,
  });
});

// Cleanup endpoint (for cron or manual trigger)
app.post("/v1/jobs/cleanup", async (c: Context) => {
  const body = await c.req.json().catch(() => ({ hours: 24 }));
  const deleted = await jobService.cleanupOldJobs(body.hours || 24);

  return c.json({
    success: true,
    deleted,
    message: `Cleaned up ${deleted} old jobs`,
  });
});

/**
 * Helper: Trigger actual function execution
 * This would use Appwrite Function execution or internal call
 */
async function triggerFunctionExecution(
  functionName: string,
  jobId: string,
  payload: unknown,
): Promise<void> {
  // In production, this could:
  // 1. Call the specific function directly via HTTP
  // 2. Use Appwrite's executeFunction
  // 3. Queue in Redis/SQS for worker processing

  const endpoint = Deno.env.get("SCRIPTONY_APPWRITE_API_ENDPOINT") ||
    Deno.env.get("APPWRITE_FUNCTION_API_ENDPOINT") ||
    "http://appwrite/v1";

  // Build the execution URL
  const execUrl = `${endpoint}/functions/scriptony-${functionName}/executions`;

  try {
    const response = await fetch(execUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Key": Deno.env.get("APPWRITE_API_KEY") || "",
        "X-Appwrite-Project": Deno.env.get("APPWRITE_PROJECT_ID") || "",
      },
      body: JSON.stringify({
        data: JSON.stringify({ jobId, payload }),
        async: true, // Don't wait for result
      }),
    });

    if (!response.ok) {
      console.error(
        `Failed to trigger function ${functionName}:`,
        await response.text(),
      );
      await jobService.failJob(
        jobId,
        `Failed to trigger function: ${response.status}`,
      );
    }
  } catch (error) {
    console.error(`Error triggering function ${functionName}:`, error);
    await jobService.failJob(
      jobId,
      error instanceof Error ? error.message : String(error),
    );
  }
}

// Deno serve
Deno.serve({ port: 3000 }, app.fetch);
