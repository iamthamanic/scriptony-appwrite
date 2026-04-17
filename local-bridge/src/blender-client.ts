/**
 * Blender Addon HTTP client (stub for Ticket 10).
 *
 * The Blender Addon will expose a local HTTP server that the bridge
 * can notify about render events. Full implementation depends on
 * Ticket 10 (Blender Addon).
 *
 * Current responsibilities:
 *   - Health check (is Blender addon reachable?)
 *   - Notify Blender when a render is accepted or rejected
 */

import { getConfig } from "./config.js";
import { log } from "./logger.js";

function getBaseUrl(): string {
  return getConfig().BRIDGE_BLENDER_URL.replace(/\/+$/, "");
}

export async function notifyRenderAccepted(
  shotId: string,
  jobId: string,
): Promise<boolean> {
  const url = `${getBaseUrl()}/bridge/render-accepted`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shotId, jobId }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      log.warn("blender", "Render-accepted notification failed", {
        shotId,
        jobId,
        status: res.status,
      });
      return false;
    }
    log.info("blender", "Render-accepted notification sent", { shotId, jobId });
    return true;
  } catch (err) {
    log.warn("blender", "Blender addon not reachable", {
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function notifyRenderRejected(
  shotId: string,
  jobId: string,
): Promise<boolean> {
  const url = `${getBaseUrl()}/bridge/render-rejected`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shotId, jobId }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      log.warn("blender", "Render-rejected notification failed", {
        shotId,
        jobId,
        status: res.status,
      });
      return false;
    }
    log.info("blender", "Render-rejected notification sent", { shotId, jobId });
    return true;
  } catch (err) {
    log.warn("blender", "Blender addon not reachable", {
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}