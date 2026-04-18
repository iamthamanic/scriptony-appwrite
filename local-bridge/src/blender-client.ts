/**
 * Blender Addon HTTP client (stub for Ticket 10).
 *
 * The Blender Addon will expose a local HTTP server that the bridge
 * can notify about render events. Full implementation depends on
 * Ticket 10 (Blender Addon).
 */

import { getConfig } from "./config.js";
import { log, formatError } from "./logger.js";

function getBaseUrl(): string {
  return getConfig().BRIDGE_BLENDER_URL.replace(/\/+$/, "");
}

/**
 * Send a notification to the Blender addon.
 *
 * DRY: single function replaces near-identical notifyRenderAccepted
 * and notifyRenderRejected.
 */
async function notifyBlender(
  endpoint: string,
  shotId: string,
  jobId: string,
): Promise<boolean> {
  const url = `${getBaseUrl()}/bridge/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shotId, jobId }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      log.warn("blender", `Notification to /${endpoint} failed`, {
        shotId, jobId, status: res.status,
      });
      return false;
    }
    log.info("blender", `Notification sent to /${endpoint}`, { shotId, jobId });
    return true;
  } catch (err) {
    log.warn("blender", "Blender addon not reachable", {
      err: formatError(err),
    });
    return false;
  }
}

export const notifyRenderAccepted = (shotId: string, jobId: string) =>
  notifyBlender("render-accepted", shotId, jobId);

export const notifyRenderRejected = (shotId: string, jobId: string) =>
  notifyBlender("render-rejected", shotId, jobId);

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