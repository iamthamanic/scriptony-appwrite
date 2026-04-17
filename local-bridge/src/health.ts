/**
 * Health check HTTP server for the Local Bridge.
 *
 * GET /health — status report:
 *   - Appwrite Realtime connection status
 *   - ComfyUI reachability
 *   - Active job count + concurrency info
 *   - Blender addon reachability
 *
 * All other paths/methods → 404
 */

import { createServer, type Server } from "node:http";
import { log } from "./logger.js";
import { getActiveJobs, getQueueLength, getRunningCount } from "./render-job-handler.js";
import { healthCheck as comfyuiHealth } from "./comfyui-client.js";
import { healthCheck as blenderHealth } from "./blender-client.js";
import { isRealtimeConnected, getReconnectAttempts } from "./realtime-subscriber.js";

let _server: Server | null = null;

export function startHealthServer(port: number): void {
  _server = createServer(async (req, res) => {
    // Only respond to GET /health
    if (req.method !== "GET" || req.url !== "/health") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const activeJobs = getActiveJobs();
    const jobCount = activeJobs.size;

    let comfyuiOk = false;
    let blenderOk = false;

    try { comfyuiOk = await comfyuiHealth(); } catch { comfyuiOk = false; }
    try { blenderOk = await blenderHealth(); } catch { blenderOk = false; }

    const realtimeConnected = isRealtimeConnected();

    const status = {
      status: "ok",
      service: "scriptony-local-bridge",
      timestamp: new Date().toISOString(),
      connections: {
        appwriteRealtime: realtimeConnected,
        comfyUI: comfyuiOk,
        blender: blenderOk,
      },
      reconnectAttempts: getReconnectAttempts(),
      concurrency: {
        running: getRunningCount(),
        queued: getQueueLength(),
        activeJobs: jobCount,
      },
      jobs: Array.from(activeJobs.entries()).map(([id, job]) => ({
        jobId: id,
        state: job.state,
        promptId: job.promptId,
        startedAt: job.startedAt.toISOString(),
        error: job.error,
      })),
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(status, null, 2));
  });

  _server.listen(port, () => {
    log.info("health", `Health check server listening on port ${port}`);
  });
}

export function stopHealthServer(): void {
  if (_server) {
    _server.close();
    _server = null;
    log.info("health", "Health check server stopped");
  }
}