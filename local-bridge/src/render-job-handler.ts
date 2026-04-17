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
 * Hardening:
 *   - Bounded concurrency (max 3 parallel jobs)
 *   - Job deduplication (skip if already active)
 *   - AbortController for cancelling polling when WS resolves
 *   - Reject pending WS resolvers on shutdown
 *   - Structured logging with job type/shotId context
 */

import { Databases } from "node-appwrite";
import { getDatabases, Collections } from "./appwrite-client.js";
import { submitPrompt, getHistory } from "./comfyui-client.js";
import { uploadAllOutputs } from "./storage-upload.js";
import { resolveWorkflowAsync } from "./workflow-resolver.js";
import { resolveInputs } from "./input-resolver.js";
import { retryDbOperation } from "./db-callback.js";
import { getConfig } from "./config.js";
import { log } from "./logger.js";
import type {
  ActiveJob,
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
// In-memory job tracking
// ---------------------------------------------------------------------------

const activeJobs = new Map<string, ActiveJob>();

/** WebSocket completion resolvers — keyed by promptId. */
const wsCompletionResolvers = new Map<string, {
  resolve: (outputs: Record<string, unknown>) => void;
  reject: (error: Error) => void;
}>();

/** AbortControllers for cancelling polling when WS resolves. */
const pollAbortControllers = new Map<string, AbortController>();

export function getActiveJobs(): Map<string, ActiveJob> {
  return activeJobs;
}

export function getQueueLength(): number {
  return _queue.length;
}

export function getRunningCount(): number {
  return _running;
}

/**
 * Called by the ComfyUI WebSocket listener when an execution completes.
 * Resolves the matching job promise and cancels the polling loop.
 */
export function resolveWsCompletion(
  promptId: string,
  outputs: Record<string, unknown>,
): void {
  // Cancel polling for this prompt
  const ac = pollAbortControllers.get(promptId);
  if (ac) {
    ac.abort();
    pollAbortControllers.delete(promptId);
  }

  const resolvers = wsCompletionResolvers.get(promptId);
  if (resolvers) {
    resolvers.resolve(outputs);
    wsCompletionResolvers.delete(promptId);
  }
}

/**
 * Reject all pending WS completion resolvers (called on shutdown).
 */
export function rejectAllPendingResolvers(reason: string): void {
  for (const [promptId, resolvers] of wsCompletionResolvers) {
    resolvers.reject(new Error(reason));
    wsCompletionResolvers.delete(promptId);
  }
  for (const [promptId, ac] of pollAbortControllers) {
    ac.abort();
    pollAbortControllers.delete(promptId);
  }
}

// ---------------------------------------------------------------------------
// Job deduplication + public entry point
// ---------------------------------------------------------------------------

export function handleRenderJob(jobId: string): void {
  // Dedup: skip if already being processed
  if (activeJobs.has(jobId)) {
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
      // Map Appwrite document fields to RenderJobDocument
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
    log.error("handler", "Failed to fetch render job", { jobId, err: err instanceof Error ? err.message : String(err) });
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

  // Shot update is idempotent — retry independently
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
      jobId, shotId, err: err instanceof Error ? err.message : String(err),
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
// Wait for completion: WS + Polling race
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 300;
const POLL_BACKOFF_MAX_MS = 30_000;

async function waitForCompletion(
  promptId: string,
): Promise<Record<string, unknown> | null> {
  const abortController = new AbortController();
  pollAbortControllers.set(promptId, abortController);

  const wsPromise = new Promise<Record<string, unknown> | null>((resolve, reject) => {
    wsCompletionResolvers.set(promptId, {
      resolve: (outputs) => resolve(outputs),
      reject,
    });

    setTimeout(() => {
      wsCompletionResolvers.delete(promptId);
      reject(new Error("WS completion timeout"));
    }, MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS);
  });

  const pollPromise = pollForCompletion(promptId, abortController.signal);

  try {
    const result = await Promise.race([wsPromise, pollPromise]);
    wsCompletionResolvers.delete(promptId);
    pollAbortControllers.delete(promptId);
    return result;
  } catch {
    wsCompletionResolvers.delete(promptId);
    pollAbortControllers.delete(promptId);
    // Poll promise is still running — race again (it will resolve or the abort will cancel it)
    return pollForCompletion(promptId, abortController.signal);
  }
}

async function pollForCompletion(
  promptId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  let consecutiveNulls = 0;
  let interval = POLL_INTERVAL_MS;

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    if (signal?.aborted) {
      throw new Error("Polling aborted (WS resolved or shutdown)");
    }

    const entry = await getHistory(promptId);
    if (entry) {
      consecutiveNulls = 0;
      if (entry.status?.statusStr === "success" || entry.status?.completed) {
        return entry.outputs ?? {};
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

    await new Promise((resolve) => setTimeout(resolve, interval));
    // Backoff: double interval up to max
    interval = Math.min(interval * 2, POLL_BACKOFF_MAX_MS);
  }
  throw new Error(`ComfyUI execution timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

// ---------------------------------------------------------------------------
// Main handler: process a render job (internal)
// ---------------------------------------------------------------------------

async function handleRenderJobInner(jobId: string): Promise<void> {
  const jobState: ActiveJob = {
    jobId,
    promptId: null,
    state: "pending",
    startedAt: new Date(),
  };
  activeJobs.set(jobId, jobState);

  let jobType = "unknown";
  let shotId = "unknown";

  try {
    // 1. Fetch the full job document
    updateState(jobId, "pending");
    const job = await fetchRenderJob(jobId);
    if (!job) {
      throw new Error(`Render job ${jobId} not found in database`);
    }

    jobType = job.type;
    shotId = job.shotId;

    log.info("handler", "Processing render job", {
      jobId, shotId, type: jobType, jobClass: job.jobClass,
    });

    // 2. Resolve input images (download from Storage, upload to ComfyUI)
    updateState(jobId, "submitting");
    const inputs = await resolveInputs(job);

    // 3. Build ComfyUI workflow from template + inputs
    const workflow = await resolveWorkflowAsync(job, { inputs });
    const clientId = `bridge-${jobId}`;

    // 4. Submit to ComfyUI
    const result = await submitPrompt(workflow, clientId);
    jobState.promptId = result.promptId;

    log.info("handler", "Submitted to ComfyUI", {
      jobId, promptId: result.promptId, type: jobType,
    });

    // 5. Wait for completion (WS + polling race)
    updateState(jobId, "executing");
    const outputs = await waitForCompletion(result.promptId);

    // 6. Download and upload output images
    if (outputs && Object.keys(outputs).length > 0) {
      updateState(jobId, "downloading");
      updateState(jobId, "uploading");
      const outputImageIds = await uploadAllOutputs(outputs);

      // 7. Mark job as complete in DB
      updateState(jobId, "callback");
      await markJobCompleted(jobId, job.shotId, outputImageIds);
    } else {
      log.warn("handler", "ComfyUI returned zero outputs", { jobId, type: jobType });
      updateState(jobId, "callback");
      await markJobCompleted(jobId, job.shotId, []);
    }

    updateState(jobId, "completed");
    log.info("handler", "Render job completed", { jobId, type: jobType, shotId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateState(jobId, "failed", message);
    log.error("handler", "Render job failed", { jobId, type: jobType, shotId, error: message });

    try {
      await markJobFailed(jobId, message);
    } catch (callbackErr) {
      log.error("handler", "Failed to mark job as failed in DB", {
        jobId, callbackErr: callbackErr instanceof Error ? callbackErr.message : String(callbackErr),
      });
    }
  } finally {
    setTimeout(() => activeJobs.delete(jobId), 60_000);
  }
}

function updateState(jobId: string, state: BridgeJobState, error?: string): void {
  const job = activeJobs.get(jobId);
  if (job) {
    job.state = state;
    if (error) job.error = error;
  }
  log.info("handler", `Job state: ${state}`, { jobId });
}

// ---------------------------------------------------------------------------
// Graceful shutdown: drain in-flight jobs
// ---------------------------------------------------------------------------

export async function drainJobs(timeoutMs = 30_000): Promise<void> {
  log.info("handler", "Draining in-flight jobs", {
    active: activeJobs.size,
    queued: _queue.length,
    running: _running,
  });

  // Clear the queue — queued jobs will not be started
  _queue.length = 0;

  // Reject all pending WS completion resolvers
  rejectAllPendingResolvers("Bridge shutting down");

  // Wait for active jobs to complete (with timeout)
  const start = Date.now();
  while (activeJobs.size > 0 && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  if (activeJobs.size > 0) {
    log.warn("handler", "Timeout draining jobs, marking remaining as failed", {
      remaining: Array.from(activeJobs.keys()),
    });
    // Mark remaining active jobs as failed in DB
    for (const [jobId, job] of activeJobs) {
      if (job.state !== "completed" && job.state !== "failed") {
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