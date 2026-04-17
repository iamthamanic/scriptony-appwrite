/**
 * ComfyUI HTTP + WebSocket client for the Local Bridge.
 *
 * Connects to a local ComfyUI instance (default http://127.0.0.1:8188).
 *
 * Hardening:
 *   - Request timeouts on all HTTP calls (30s)
 *   - WS reconnect with exponential backoff
 *   - WS shutdown flag prevents reconnect during intentional disconnect
 *   - Binary frame check in WS message handler
 *   - Null history fallback (call onCompletion with empty outputs)
 */

import { getConfig } from "./config.js";
import { log } from "./logger.js";
import type {
  ComfyUIPromptResult,
  ComfyUIHistoryEntry,
  ComfyUIExecutionProgress,
} from "./types.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 30_000;

function getBaseUrl(): string {
  return getConfig().BRIDGE_COMFYUI_URL.replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// Submit a workflow
// ---------------------------------------------------------------------------

export async function submitPrompt(
  workflow: Record<string, unknown>,
  clientId: string,
): Promise<ComfyUIPromptResult> {
  const url = `${getBaseUrl()}/prompt`;
  const body = JSON.stringify({ prompt: workflow, client_id: clientId });

  log.info("comfyui", "Submitting prompt", { clientId });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `ComfyUI /prompt returned ${res.status}: ${text.slice(0, 500)}`,
    );
  }

  const result = (await res.json()) as ComfyUIPromptResult;
  log.info("comfyui", "Prompt submitted", {
    promptId: result.promptId,
    number: result.number,
  });
  return result;
}

// ---------------------------------------------------------------------------
// Get execution history / status
// ---------------------------------------------------------------------------

export async function getHistory(
  promptId: string,
): Promise<ComfyUIHistoryEntry | null> {
  const url = `${getBaseUrl()}/history/${promptId}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`ComfyUI /history/${promptId} returned ${res.status}`);
  }

  const data = (await res.json()) as Record<string, ComfyUIHistoryEntry>;
  return data[promptId] ?? null;
}

// ---------------------------------------------------------------------------
// Retrieve an output image
// ---------------------------------------------------------------------------

export async function getImage(
  filename: string,
  subfolder: string,
  type: string,
): Promise<Buffer> {
  // Sanitize inputs — reject path traversal
  for (const param of [filename, subfolder, type]) {
    if (param.includes("..") || param.includes("\0")) {
      throw new Error(`Invalid ComfyUI image parameter: path traversal detected`);
    }
  }

  const params = new URLSearchParams({ filename, subfolder, type });
  const url = `${getBaseUrl()}/view?${params.toString()}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(
      `ComfyUI /view returned ${res.status} for ${filename}`,
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// Upload an input image to ComfyUI
// ---------------------------------------------------------------------------

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const url = `${getBaseUrl()}/upload/image`;

  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("image", blob, filename);
  formData.append("overwrite", "true");

  log.info("comfyui", "Uploading image to ComfyUI", { filename });

  const res = await fetch(url, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `ComfyUI /upload/image returned ${res.status}: ${text.slice(0, 500)}`,
    );
  }

  const result = (await res.json()) as { name: string; subfolder: string; type: string };
  log.info("comfyui", "Image uploaded", { name: result.name, subfolder: result.subfolder });
  return result.name;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/system_stats`, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// WebSocket progress listener
// ---------------------------------------------------------------------------

export type ProgressCallback = (progress: ComfyUIExecutionProgress) => void;
export type CompletionCallback = (promptId: string, outputs: Record<string, unknown>) => void;

let _ws: WebSocket | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _reconnectAttempts = 0;
let _shuttingDown = false;

const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS = 60_000;

/**
 * Connect to ComfyUI WebSocket for execution progress.
 *
 * Emits progress updates and completion events.
 * Reconnects with exponential backoff on disconnect.
 */
export function connectWebSocket(
  onProgress: ProgressCallback,
  onCompletion: CompletionCallback,
): void {
  const baseUrl = getBaseUrl();
  const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";

  log.info("comfyui-ws", "Connecting to ComfyUI WebSocket", { wsUrl });

  // Clean up old WS if present
  if (_ws) {
    _ws.removeAllListeners?.();
    try { _ws.close(); } catch { /* ignore */ }
    _ws = null;
  }

  _shuttingDown = false;

  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    log.info("comfyui-ws", "Connected");
    _reconnectAttempts = 0;
  });

  ws.addEventListener("message", (event) => {
    // Ignore binary frames
    if (typeof event.data !== "string") return;

    try {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      const type = data.type as string | undefined;

      if (type === "execution_start" || type === "execution_cached") {
        return;
      }

      if (type === "progress") {
        onProgress({
          nodeId: String(data.node_id ?? data.node ?? ""),
          value: Number(data.value ?? 0),
          max: Number(data.max ?? 1),
        });
        return;
      }

      if (type === "executing") {
        const nodeId = String(data.node ?? data.node_id ?? "");
        if (nodeId === "") {
          const promptId = String(data.prompt_id ?? "");
          if (promptId) {
            log.info("comfyui-ws", "Execution completed", { promptId });
            getHistory(promptId).then((entry) => {
              // Call onCompletion even if entry is null (with empty outputs)
              // so the WS promise resolves and doesn't hang
              onCompletion(promptId, entry?.outputs ?? {});
            }).catch((err) => {
              log.error("comfyui-ws", "Failed to fetch history after completion", {
                promptId, err: err instanceof Error ? err.message : String(err),
              });
              // Still call onCompletion with empty outputs to unblock the job
              onCompletion(promptId, {});
            });
          }
        }
        return;
      }

      if (type === "execution_error") {
        const promptId = String(data.prompt_id ?? "");
        const msg = String(data.exception_message ?? data.message ?? "unknown");
        log.error("comfyui-ws", "Execution error", { promptId, error: msg });
        return;
      }
    } catch {
      // Malformed JSON — ignore
    }
  });

  ws.addEventListener("close", () => {
    if (_shuttingDown) {
      log.info("comfyui-ws", "WebSocket closed (intentional shutdown)");
      return;
    }

    _reconnectAttempts++;
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, _reconnectAttempts - 1),
      RECONNECT_MAX_MS,
    );

    log.warn("comfyui-ws", `WebSocket closed, reconnecting in ${delay}ms (attempt ${_reconnectAttempts})`);

    _reconnectTimer = setTimeout(
      () => {
        if (_shuttingDown) return;
        connectWebSocket(onProgress, onCompletion);
      },
      delay,
    );
  });

  ws.addEventListener("error", (event) => {
    log.error("comfyui-ws", "WebSocket error", { type: typeof event });
  });

  _ws = ws;
}

/**
 * Disconnect the ComfyUI WebSocket and prevent reconnection.
 */
export function disconnectWebSocket(): void {
  _shuttingDown = true;

  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  if (_ws) {
    _ws.removeAllListeners?.();
    _ws.close();
    _ws = null;
  }

  _reconnectAttempts = 0;
}