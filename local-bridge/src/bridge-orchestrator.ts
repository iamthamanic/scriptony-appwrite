/**
 * Bridge orchestrator — wires together all components.
 *
 * On startup:
 *   1. Initialize Appwrite client
 *   2. Connect to ComfyUI WebSocket
 *   3. Subscribe to Appwrite Realtime for renderJobs
 *   4. Start health check server
 *
 * Event flow:
 *   Realtime event → handleRenderJob → ComfyUI → Storage → Callback
 */

import { loadConfig, getConfig } from "./config.js";
import { setLogLevel, log } from "./logger.js";
import { subscribeRenderJobs, unsubscribeRenderJobs } from "./realtime-subscriber.js";
import { connectWebSocket, disconnectWebSocket } from "./comfyui-client.js";
import { handleRenderJob, resolveWsCompletion } from "./render-job-handler.js";
import { startHealthServer, stopHealthServer } from "./health.js";
import type { RealtimeEvent } from "./types.js";

// ---------------------------------------------------------------------------
// Startup reconciliation
// ---------------------------------------------------------------------------

/**
 * On startup, query Appwrite DB for any render jobs with status "executing"
 * that may have been submitted before the bridge went down.
 */
async function reconcileInProgressJobs(): Promise<void> {
  const { Query } = await import("node-appwrite");
  const { getDatabases, Collections } = await import("./appwrite-client.js");
  const config = getConfig();

  log.info("orchestrator", "Reconciling in-progress jobs");

  try {
    const db = getDatabases();
    const response = await db.listDocuments(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.renderJobs,
      [Query.equal("status", "executing"), Query.limit(50)],
    );

    const jobs = response.documents;
    if (jobs.length === 0) {
      log.info("orchestrator", "No in-progress jobs found");
      return;
    }

    log.info("orchestrator", `Found ${jobs.length} in-progress job(s), re-processing`, {
      jobIds: jobs.map((d: { $id: string }) => d.$id),
    });

    for (const job of jobs) {
      handleRenderJob(job.$id).catch((err) => {
        log.error("orchestrator", "Reconciliation: failed to process job", {
          jobId: job.$id,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }
  } catch (err) {
    log.error("orchestrator", "Reconciliation query failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Event handler
// ---------------------------------------------------------------------------

function onRenderJobEvent(event: RealtimeEvent): void {
  const payload = event.payload ?? {};
  const jobId = String(payload.$id ?? payload.id ?? "");

  if (!jobId) {
    log.warn("orchestrator", "Received event without job ID", { payload });
    return;
  }

  log.info("orchestrator", "Dispatching render job", { jobId });
  handleRenderJob(jobId).catch((err) => {
    log.error("orchestrator", "Unhandled error in render job handler", {
      jobId,
      err: err instanceof Error ? err.message : String(err),
    });
  });
}

// ---------------------------------------------------------------------------
// Main start/stop
// ---------------------------------------------------------------------------

export async function start(): Promise<void> {
  const config = loadConfig();
  setLogLevel(config.BRIDGE_LOG_LEVEL);

  log.info("orchestrator", "Starting Local Bridge", {
    appwriteEndpoint: config.BRIDGE_APPWRITE_ENDPOINT,
    comfyuiUrl: config.BRIDGE_COMFYUI_URL,
    blenderUrl: config.BRIDGE_BLENDER_URL,
    healthPort: config.BRIDGE_HEALTH_PORT,
  });

  // Connect to ComfyUI WebSocket
  try {
    connectWebSocket(
      (progress) => {
        log.debug("orchestrator", "ComfyUI progress", {
          node: progress.nodeId,
          value: progress.value,
          max: progress.max,
        });
      },
      (promptId, outputs) => {
        log.info("orchestrator", "ComfyUI execution completed via WS", {
          promptId,
          outputNodes: Object.keys(outputs),
        });
        // Resolve the WS promise so the job handler can skip polling
        resolveWsCompletion(promptId, outputs);
      },
    );
  } catch (err) {
    log.warn("orchestrator", "ComfyUI WebSocket not available, will use polling", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // Subscribe to Appwrite Realtime
  subscribeRenderJobs(onRenderJobEvent);

  // Reconcile in-progress jobs from before bridge started
  await reconcileInProgressJobs();

  // Start health check server
  startHealthServer(config.BRIDGE_HEALTH_PORT);

  log.info("orchestrator", "Local Bridge is running");
}

export function stop(): void {
  log.info("orchestrator", "Shutting down Local Bridge");

  unsubscribeRenderJobs();
  disconnectWebSocket();
  stopHealthServer();

  log.info("orchestrator", "Local Bridge stopped");
}