/**
 * Render job handler for the Local Bridge.
 *
 * Full lifecycle:
 *   1. Receive Realtime event (renderJobs status=executing)
 *   2. Read full job document from Appwrite DB
 *   3. Resolve input images (download from Storage, upload to ComfyUI)
 *   4. Construct ComfyUI workflow from job type + template
 *   5. Submit to ComfyUI
 *   6. Wait for completion (WebSocket first, polling fallback)
 *   7. Download output images from ComfyUI
 *   8. Upload images to Appwrite Storage
 *   9. Mark job completed/failed directly in Appwrite DB
 *
 * Design:
 *   - Single `jobContexts` Map replaces 3 parallel Maps (KISS)
 *   - Bounded concurrency (max 3 parallel jobs) with queue + dedup
 *   - WS completion resolves the single JobContext.completion promise
 *   - Polling uses AbortController, cancelled on WS resolve
 */

import { getDatabases, Collections } from "./appwrite-client.js";
import { submitPrompt, getHistory } from "./comfyui-client.js";
import { uploadAllOutputs } from "./storage-upload.js";
import { resolveWorkflowAsync } from "./workflow-resolver.js";
import { resolveInputs } from "./input-resolver.js";
import { retryDbOperation } from "./db-callback.js";
import { getConfig } from "./config.js";
import { log, formatError } from "./logger.js";
import type {
  JobContext,
  BridgeJobState,
  RenderJobDocument,
} from "./types.js";

// ---------------------------------------------------------------------------
// Concurrency pool
// ---------------------------------------------------------------------------

const MAX_CONCURRENCY = 3;
let _running = 0;
const _queue: string[] = [];

function enqueueJob(jobId: string): void {
  if (_running < MAX_CONCURRENCY) {
    _running++;
    runJob(jobId);
  } else {
    _queue.push(jobId);
    log.info("handler", `Job queued (concurrency limit ${MAX_CONCURRENCY})`, { jobId, queued: _queue.length });
  }
}

function dequeueNext(): void {
  if (_queue.length > 0 && _running < MAX_CONCURRENCY) {
    const nextId = _queue.shift()!;
    _running++;
    runJob(nextId);
  }
}

function runJob(jobId: string): void {
  handleRenderJobInner(jobId).finally(() => {
    _running--;
    dequeueNext();
  });
}

// ---------------------------------------------------------------------------
// Single job-context map (replaces 3 parallel Maps)
// ---------------------------------------------------------------------------

const jobContexts = new Map<string, JobContext>();

export function getActiveJobs(): Map<string, JobContext> {
  return jobContexts;
}

export function getQueueLength(): number {
  return _queue.length;
}

export function getRunningCount(): number {
  return _running;
}

/**
 * Called by the ComfyUI WebSocket listener when an execution completes.
 * Resolves the matching job's completion promise and cancels polling.
 */
export function resolveWsCompletion(
  promptId: string,
  outputs: Record<string, unknown>,
): void {
  for (const [, ctx] of jobContexts) {
    if (ctx.promptId === promptId && !ctx.settled) {
      ctx.pollAbort.abort();
      ctx.settled = true;
      ctx.completion.resolve(outputs);
      return;
    }
  }
}

/**
 * Reject all pending completion promises (called on shutdown).
 */
export function rejectAllPendingResolvers(reason: string): void {
  for (const [, ctx] of jobContexts) {
    if (!ctx.settled) {
      ctx.pollAbort.abort();
      ctx.settled = true;
      ctx.completion.reject(new Error(reason));
    }
  }
}

// ---------------------------------------------------------------------------
// Job deduplication + public entry point
// ---------------------------------------------------------------------------

export function handleRenderJob(jobId: string): void {
  if (jobContexts.has(jobId)) {
    log.info("handler", "Job already active, skipping duplicate", { jobId });
    return;
  }
  enqueueJob(jobId);
}

// ---------------------------------------------------------------------------
// Read render job from Appwrite DB
// ---------------------------------------------------------------------------

async function fetchRenderJob(jobId: string): Promise<RenderJobDocument | null> {
  const db = getDatabases();
  const config = getConfig();

  try {
    return await retryDbOperation(async () => {
      const doc = await db.getDocument(
        config.BRIDGE_APPWRITE_DATABASE_ID,
        Collections.renderJobs,
        jobId,
      );
      return {
        id: String(doc.$id ?? doc.id ?? ""),
        $id: String(doc.$id),
        userId: String(doc.userId ?? doc.user_id ?? ""),
        projectId: String(doc.projectId ?? doc.project_id ?? ""),
        shotId: String(doc.shotId ?? doc.shot_id ?? ""),
        type: String(doc.type ?? ""),
        jobClass: String(doc.jobClass ?? doc.job_class ?? "exploratory") as RenderJobDocument["jobClass"],
        status: String(doc.status ?? "queued") as RenderJobDocument["status"],
        reviewStatus: String(doc.reviewStatus ?? doc.review_status ?? "pending") as RenderJobDocument["reviewStatus"],
        guideBundleId: doc.guideBundleId ?? doc.guide_bundle_id ?? null,
        styleProfileId: doc.styleProfileId ?? doc.style_profile_id ?? null,
        repairConfig: doc.repairConfig ?? doc.repair_config ?? null,
        outputImageIds: Array.isArray(doc.outputImageIds ?? doc.output_image_ids) ? doc.outputImageIds ?? doc.output_image_ids : [],
        createdAt: String(doc.createdAt ?? doc.created_at ?? doc.$createdAt ?? ""),
        completedAt: doc.completedAt ?? doc.completed_at ?? null,
      } as RenderJobDocument;
    });
  } catch (err) {
    log.error("handler", "Failed to fetch render job", { jobId, err: formatError(err) });
    return null;
  }
}

// ---------------------------------------------------------------------------
// DB-Direct callbacks with retry
// ---------------------------------------------------------------------------

async function markJobCompleted(
  jobId: string,
  shotId: string,
  outputImageIds: string[],
): Promise<void> {
  const db = getDatabases();
  const config = getConfig();
  const now = new Date().toISOString();

  log.info("handler", "Marking job completed in DB", { jobId, outputImageIds });

  await retryDbOperation(async () => {
    await db.updateDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.renderJobs,
      jobId,
      { status: "completed", outputImageIds, completedAt: now },
    );
  });

  try {
    await retryDbOperation(async () => {
      await db.updateDocument(
        config.BRIDGE_APPWRITE_DATABASE_ID,
        Collections.shots,
        shotId,
        { latestRenderJobId: jobId },
      );
    });
  } catch (err) {
    log.warn("handler", "Failed to update shot latestRenderJobId (non-critical)", {
      jobId, shotId, err: formatError(err),
    });
  }

  log.info("handler", "Job marked completed in DB", { jobId });
}

async function markJobFailed(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const db = getDatabases();
  const config = getConfig();

  log.info("handler", "Marking job failed in DB", { jobId, errorMessage });

  await retryDbOperation(async () => {
    await db.updateDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.renderJobs,
      jobId,
      { status: "failed", error: errorMessage },
    );
  });

  log.info("handler", "Job marked failed in DB", { jobId });
}

// ---------------------------------------------------------------------------
// Wait for completion: WS + Polling race (bug-fixed)
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_DURATION_MS = 600_000; // 10 min hard cap

async function waitForCompletion(ctx: JobContext): Promise<Record<string, unknown>> {
  // Start polling in the background — resolves ctx.completion if WS never fires
  pollForCompletion(ctx).catch((err) => {
    // Poll errored — reject if not yet settled
    if (!ctx.settled) {
      ctx.settled = true;
      ctx.completion.reject(err);
    }
  });

  // Set a hard timeout
  const timeout = setTimeout(() => {
    if (!ctx.settled) {
      ctx.settled = true;
      ctx.completion.reject(new Error(`ComfyUI execution timed out after ${MAX_POLL_DURATION_MS / 1000}s`));
    }
  }, MAX_POLL_DURATION_MS);

  try {
    return await ctx.completion.promise;
  } finally {
    clearTimeout(timeout);
    ctx.pollAbort.abort();
  }
}

async function pollForCompletion(ctx: JobContext): Promise<void> {
  let interval = POLL_INTERVAL_MS;
  let consecutiveNulls = 0;
  const promptId = ctx.promptId!;

  while (!ctx.pollAbort.signal.aborted) {
    const entry = await getHistory(promptId);
    if (entry) {
      consecutiveNulls = 0;
      if (entry.status?.statusStr === "success" || entry.status?.completed) {
        if (!ctx.settled) {
          ctx.settled = true;
          ctx.completion.resolve(entry.outputs ?? {});
        }
        return;
      }
      if (entry.status?.statusStr === "error") {
        throw new Error(
          `ComfyUI execution failed: ${entry.status.messages?.join(", ") ?? "unknown error"}`,
        );
      }
    } else {
      consecutiveNulls++;
      if (consecutiveNulls >= 10) {
        throw new Error("ComfyUI history not found after 10 consecutive attempts — execution may have been purged");
      }
    }

    await new Promise((resolve) => {
      const timer = setTimeout(resolve, interval);
      ctx.pollAbort.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        resolve(undefined);
      }, { once: true });
    });

    interval = Math.min(interval * 2, 30_000);
  }
}

// ---------------------------------------------------------------------------
// Main handler: process a render job (internal)
// ---------------------------------------------------------------------------

async function handleRenderJobInner(jobId: string): Promise<void> {
  const ctx: JobContext = {
    jobId,
    promptId: null,
    state: "pending",
    startedAt: new Date(),
    settled: false,
    completion: Promise.withResolvers<Record<string, unknown>>(),
    pollAbort: new AbortController(),
  };
  jobContexts.set(jobId, ctx);

  let jobType = "unknown";
  let shotId = "unknown";

  try {
    updateState(ctx, "pending");
    const job = await fetchRenderJob(jobId);
    if (!job) {
      throw new Error(`Render job ${jobId} not found in database`);
    }

    jobType = job.type;
    shotId = job.shotId;

    log.info("handler", "Processing render job", {
      jobId, shotId, type: jobType, jobClass: job.jobClass,
    });

    // Resolve inputs + build workflow
    updateState(ctx, "submitting");
    const inputs = await resolveInputs(job);
    const workflow = await resolveWorkflowAsync(job, { inputs });
    const clientId = `bridge-${jobId}`;

    // Submit to ComfyUI
    const result = await submitPrompt(workflow, clientId);
    ctx.promptId = result.promptId;

    log.info("handler", "Submitted to ComfyUI", {
      jobId, promptId: result.promptId, type: jobType,
    });

    // Wait for completion
    updateState(ctx, "executing");
    const outputs = await waitForCompletion(ctx);

    // Download and upload output images
    if (outputs && Object.keys(outputs).length > 0) {
      updateState(ctx, "downloading");
      updateState(ctx, "uploading");
      const outputImageIds = await uploadAllOutputs(outputs);

      updateState(ctx, "callback");
      await markJobCompleted(jobId, job.shotId, outputImageIds);
    } else {
      log.warn("handler", "ComfyUI returned zero outputs", { jobId, type: jobType });
      updateState(ctx, "callback");
      await markJobCompleted(jobId, job.shotId, []);
    }

    updateState(ctx, "completed");
    log.info("handler", "Render job completed", { jobId, type: jobType, shotId });
  } catch (err) {
    const message = formatError(err);
    updateState(ctx, "failed", message);
    log.error("handler", "Render job failed", { jobId, type: jobType, shotId, error: message });

    try {
      await markJobFailed(jobId, message);
    } catch (callbackErr) {
      log.error("handler", "Failed to mark job as failed in DB", {
        jobId, callbackErr: formatError(callbackErr),
      });
    }
  } finally {
    setTimeout(() => jobContexts.delete(jobId), 60_000);
  }
}

function updateState(ctx: JobContext, state: BridgeJobState, error?: string): void {
  ctx.state = state;
  if (error) ctx.error = error;
  log.info("handler", `Job state: ${state}`, { jobId: ctx.jobId });
}

// ---------------------------------------------------------------------------
// Graceful shutdown: drain in-flight jobs
// ---------------------------------------------------------------------------

export async function drainJobs(timeoutMs = 30_000): Promise<void> {
  log.info("handler", "Draining in-flight jobs", {
    active: jobContexts.size,
    queued: _queue.length,
    running: _running,
  });

  _queue.length = 0;
  rejectAllPendingResolvers("Bridge shutting down");

  const start = Date.now();
  while (jobContexts.size > 0 && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  if (jobContexts.size > 0) {
    log.warn("handler", "Timeout draining jobs, marking remaining as failed", {
      remaining: Array.from(jobContexts.keys()),
    });
    for (const [jobId, ctx] of jobContexts) {
      if (ctx.state !== "completed" && ctx.state !== "failed") {
        try {
          await markJobFailed(jobId, "Bridge shutdown — job interrupted");
        } catch {
          // Best effort
        }
      }
    }
  }

  log.info("handler", "Job drain complete");
}