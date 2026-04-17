/**
 * Appwrite Realtime subscriber for the Local Bridge.
 *
 * Subscribes to the `renderJobs` collection via WebSocket.
 * Filters for status changes to "executing" and emits events
 * to the orchestrator.
 *
 * Includes exponential backoff reconnection and connection
 * status tracking for the health endpoint.
 */

import { Client } from "node-appwrite";
import { getConfig } from "./config.js";
import { log } from "./logger.js";
import type { RealtimeEvent } from "./types.js";

export type RealtimeEventHandler = (event: RealtimeEvent) => void;

const RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 60_000;

let _client: Client | null = null;
let _unsubscribe: (() => void) | null = null;
let _reconnectAttempts = 0;
let _shuttingDown = false;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
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
 *
 * The channel pattern for Appwrite Realtime is:
 *   `databases.<databaseId>.collections.<collectionId>.documents`
 *
 * The bridge only reacts to documents where status becomes "executing".
 */
export function subscribeRenderJobs(
  handler: RealtimeEventHandler,
): void {
  const config = getConfig();
  const channel = `databases.${config.BRIDGE_APPWRITE_DATABASE_ID}.collections.renderJobs.documents`;

  _shuttingDown = false;
  _client = createRealtimeClient();

  log.info("realtime", "Subscribing to renderJobs channel", { channel });

  try {
    // @ts-expect-error node-appwrite v22: subscribe exists at runtime but not in types
    _unsubscribe = _client.subscribe(channel, (event: RealtimeEvent) => {
      // Mark as connected on first event
      if (!_connected) {
        _connected = true;
        _reconnectAttempts = 0;
        log.info("realtime", "Connection confirmed");
      }

      // Filter: only react to create/update events where status is "executing"
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
      err: err instanceof Error ? err.message : String(err),
    });
    scheduleReconnect(handler);
  }
}

/**
 * Schedule a reconnection attempt with exponential backoff.
 */
function scheduleReconnect(handler: RealtimeEventHandler): void {
  if (_shuttingDown) return;

  _reconnectAttempts++;
  const delay = Math.min(
    RECONNECT_DELAY_MS * Math.pow(2, _reconnectAttempts - 1),
    MAX_RECONNECT_DELAY_MS,
  );

  log.warn("realtime", `Reconnecting in ${delay}ms (attempt ${_reconnectAttempts})`);

  _reconnectTimer = setTimeout(() => {
    if (_shuttingDown) return;
    log.info("realtime", "Reconnecting...");
    subscribeRenderJobs(handler);
  }, delay);
}

/**
 * Unsubscribe from Realtime and clean up.
 */
export function unsubscribeRenderJobs(): void {
  _shuttingDown = true;
  _connected = false;

  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }

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
 * Reset reconnection counter (called on successful connection).
 */
export function resetReconnectAttempts(): void {
  _reconnectAttempts = 0;
}

/**
 * Get the number of reconnection attempts (for monitoring).
 */
export function getReconnectAttempts(): number {
  return _reconnectAttempts;
}