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
 */

import { Databases, Query } from "node-appwrite";
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
// In-memory job tracking
// ---------------------------------------------------------------------------

const activeJobs = new Map<string, ActiveJob>();

/** WebSocket completion resolvers — keyed by promptId. */
const wsCompletionResolvers = new Map<string, {
  resolve: (outputs: Record<string, unknown>) => void;
  reject: (error: Error) => void;
}>();

export function getActiveJobs(): Map<string, ActiveJob> {
  return activeJobs;
}

/**
 * Called by the ComfyUI WebSocket listener when an execution completes.
 * Resolves the matching job promise so polling can be skipped.
 */
export function resolveWsCompletion(
  promptId: string,
  outputs: Record<string, unknown>,
): void {
  const resolvers = wsCompletionResolvers.get(promptId);
  if (resolvers) {
    resolvers.resolve(outputs);
    wsCompletionResolvers.delete(promptId);
  }
}

// ---------------------------------------------------------------------------
// Read render job from Appwrite DB
// ---------------------------------------------------------------------------

async function fetchRenderJob(jobId: string): Promise<RenderJobDocument | null> {
  const db: Databases = getDatabases();
  const config = getConfig();

  try {
    return await retryDbOperation(async () => {
      const doc = await db.getDocument(
        config.BRIDGE_APPWRITE_DATABASE_ID,
        Collections.renderJobs,
        jobId,
      );
      return doc as unknown as RenderJobDocument;
    });
  } catch (err) {
    log.error("handler", "Failed to fetch render job", { jobId, err });
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
  const db: Databases = getDatabases();
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

  await retryDbOperation(async () => {
    await db.updateDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.shots,
      shotId,
      { latestRenderJobId: jobId },
    );
  });

  log.info("handler", "Job marked completed in DB", { jobId });
}

async function markJobFailed(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const db: Databases = getDatabases();
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
const MAX_POLL_ATTEMPTS = 300; // 10 minutes at 2s intervals

async function waitForCompletion(
  promptId: string,
): Promise<Record<string, unknown> | null> {
  // Create a WS promise that resolves when ComfyUI WS reports completion
  const wsPromise = new Promise<Record<string, unknown> | null>((resolve, reject) => {
    wsCompletionResolvers.set(promptId, {
      resolve: (outputs) => resolve(outputs),
      reject,
    });

    // Auto-cleanup if the promise never resolves
    setTimeout(() => {
      wsCompletionResolvers.delete(promptId);
      reject(new Error("WS completion timeout"));
    }, MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS);
  });

  // Polling fallback
  const pollPromise = pollForCompletion(promptId);

  // Race: first to resolve wins
  try {
    const result = await Promise.race([wsPromise, pollPromise]);
    wsCompletionResolvers.delete(promptId);
    return result;
  } catch {
    // WS might fail; try polling alone
    wsCompletionResolvers.delete(promptId);
    return pollForCompletion(promptId);
  }
}

async function pollForCompletion(
  promptId: string,
): Promise<Record<string, unknown> | null> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const entry = await getHistory(promptId);
    if (entry) {
      if (entry.status?.statusStr === "success" || entry.status?.completed) {
        return entry.outputs ?? {};
      }
      if (entry.status?.statusStr === "error") {
        throw new Error(
          `ComfyUI execution failed: ${entry.status.messages?.join(", ") ?? "unknown error"}`,
        );
      }
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`ComfyUI execution timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

// ---------------------------------------------------------------------------
// Main handler: process a render job
// ---------------------------------------------------------------------------

export async function handleRenderJob(jobId: string): Promise<void> {
  const jobState: ActiveJob = {
    jobId,
    promptId: null,
    state: "pending",
    startedAt: new Date(),
  };
  activeJobs.set(jobId, jobState);

  try {
    // 1. Fetch the full job document
    updateState(jobId, "pending");
    const job = await fetchRenderJob(jobId);
    if (!job) {
      throw new Error(`Render job ${jobId} not found in database`);
    }

    log.info("handler", "Processing render job", {
      jobId,
      shotId: job.shotId,
      type: job.type,
      jobClass: job.jobClass,
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
      jobId,
      promptId: result.promptId,
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
      // No outputs — still mark complete (edge case)
      updateState(jobId, "callback");
      await markJobCompleted(jobId, job.shotId, []);
    }

    updateState(jobId, "completed");
    log.info("handler", "Render job completed", { jobId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateState(jobId, "failed", message);
    log.error("handler", "Render job failed", { jobId, error: message });

    // Attempt to mark the job as failed in the DB
    try {
      await markJobFailed(jobId, message);
    } catch (callbackErr) {
      log.error("handler", "Failed to report failure to backend", {
        jobId,
        callbackErr,
      });
    }
  } finally {
    // Clean up after a delay
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