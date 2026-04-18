/**
 * Appwrite Realtime subscriber for the Local Bridge.
 *
 * Subscribes to the `renderJobs` collection via WebSocket.
 * Filters for status changes to "executing" and emits events
 * to the orchestrator.
 *
 * Uses ReconnectManager for exponential backoff reconnection.
 */

import { Client } from "node-appwrite";
import { getConfig } from "./config.js";
import { log, formatError } from "./logger.js";
import { ReconnectManager } from "./backoff.js";
import type { RealtimeEvent } from "./types.js";

export type RealtimeEventHandler = (event: RealtimeEvent) => void;

let _client: Client | null = null;
let _unsubscribe: (() => void) | null = null;
const _reconnect = new ReconnectManager({ baseDelayMs: 5_000, maxDelayMs: 60_000, context: "realtime" });
let _connected = false;

function createRealtimeClient(): Client {
  const config = getConfig();
  return new Client()
    .setEndpoint(config.BRIDGE_APPWRITE_ENDPOINT)
    .setProject(config.BRIDGE_APPWRITE_PROJECT_ID)
    .setKey(config.BRIDGE_APPWRITE_API_KEY);
}

/**
 * Subscribe to renderJobs collection changes.
 */
export function subscribeRenderJobs(
  handler: RealtimeEventHandler,
): void {
  const config = getConfig();
  const channel = `databases.${config.BRIDGE_APPWRITE_DATABASE_ID}.collections.renderJobs.documents`;

  // Reset shutdown state for fresh subscription
  _reconnect.shutdown(); // clear any prior state
  const reconnect = new ReconnectManager({ baseDelayMs: 5_000, maxDelayMs: 60_000, context: "realtime" });

  _client = createRealtimeClient();

  log.info("realtime", "Subscribing to renderJobs channel", { channel });

  try {
    // @ts-expect-error node-appwrite v22: subscribe exists at runtime but not in types
    _unsubscribe = _client.subscribe(channel, (event: RealtimeEvent) => {
      if (!_connected) {
        _connected = true;
        reconnect.reset();
        log.info("realtime", "Connection confirmed");
      }

      const isRelevant =
        event.events?.some(
          (e) => e.includes(".create") || e.includes(".update"),
        ) ?? false;

      if (!isRelevant) return;

      const payload = event.payload ?? {};
      const status = typeof payload.status === "string" ? payload.status : "";

      if (status === "executing") {
        log.info("realtime", "Render job status=executing detected", {
          jobId: payload.$id ?? payload.id,
          shotId: payload.shotId,
        });
        handler(event);
      }
    });

    log.info("realtime", "Subscription active");
  } catch (err) {
    log.error("realtime", "Subscription failed, scheduling reconnect", {
      err: formatError(err),
    });
    reconnect.schedule(() => subscribeRenderJobs(handler));
  }
}

/**
 * Unsubscribe from Realtime and clean up.
 */
export function unsubscribeRenderJobs(): void {
  _reconnect.shutdown();
  _connected = false;

  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
    log.info("realtime", "Unsubscribed from renderJobs");
  }
}

/**
 * Is the Realtime connection currently active?
 */
export function isRealtimeConnected(): boolean {
  return _connected;
}

/**
 * Get the number of reconnection attempts (for monitoring).
 */
export function getReconnectAttempts(): number {
  return _reconnect.attempts;
}