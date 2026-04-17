/**
 * Bridge orchestrator — wires together all components.
 *
 * On startup:
 *   1. Initialize Appwrite client
 *   2. Connect to ComfyUI WebSocket
 *   3. Subscribe to Appwrite Realtime for renderJobs
 *   4. Start health check server
 *
 * On shutdown:
 *   1. Stop accepting new jobs (unsubscribe Realtime)
 *   2. Disconnect ComfyUI WebSocket
 *   3. Drain in-flight jobs (with timeout)
 *   4. Stop health check server
 */

import { loadConfig, getConfig } from "./config.js";
import { setLogLevel, log } from "./logger.js";
import { subscribeRenderJobs, unsubscribeRenderJobs } from "./realtime-subscriber.js";
import { connectWebSocket, disconnectWebSocket } from "./comfyui-client.js";
import { handleRenderJob, drainJobs, resolveWsCompletion } from "./render-job-handler.js";
import { startHealthServer, stopHealthServer } from "./health.js";
import type { RealtimeEvent } from "./types.js";

// ---------------------------------------------------------------------------
// Startup reconciliation
// ---------------------------------------------------------------------------

async function reconcileInProgressJobs(): Promise<void> {
  const { Query } = await import("node-appwrite");
  const { getDatabases, Collections } = await import("./appwrite-client.js");
  const config = getConfig();

  log.info("orchestrator", "Reconciling in-progress jobs");

  try {
    const db = getDatabases();
    // Paginate through all in-progress jobs (not just first 50)
    let offset = 0;
    const limit = 50;
    let totalProcessed = 0;

    while (true) {
      const response = await db.listDocuments(
        config.BRIDGE_APPWRITE_DATABASE_ID,
        Collections.renderJobs,
        [Query.equal("status", "executing"), Query.limit(limit), Query.offset(offset)],
      );

      const jobs = response.documents;
      if (jobs.length === 0) break;

      for (const job of jobs) {
        handleRenderJob(job.$id);
        totalProcessed++;
      }

      if (jobs.length < limit) break;
      offset += limit;
    }

    if (totalProcessed === 0) {
      log.info("orchestrator", "No in-progress jobs found");
    } else {
      log.info("orchestrator", `Reconciled ${totalProcessed} in-progress job(s)`);
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
    log.warn("orchestrator", "Received event without job ID");
    return;
  }

  handleRenderJob(jobId);
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

export async function stop(): Promise<void> {
  log.info("orchestrator", "Shutting down Local Bridge");

  // 1. Stop accepting new events
  unsubscribeRenderJobs();

  // 2. Disconnect ComfyUI WebSocket (also rejects pending WS resolvers)
  disconnectWebSocket();

  // 3. Drain in-flight jobs (wait up to 30s, then mark remaining as failed)
  await drainJobs(30_000);

  // 4. Stop health check server
  stopHealthServer();

  log.info("orchestrator", "Local Bridge stopped");
}