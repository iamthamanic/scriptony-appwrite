/**
 * ComfyUI HTTP + WebSocket client for the Local Bridge.
 *
 * Connects to a local ComfyUI instance (default http://127.0.0.1:8188).
 *
 * API surface:
 *   POST /prompt         — submit a workflow for execution
 *   GET  /history/:id   — get execution status
 *   GET  /view           — retrieve an output image
 *   WS   /ws            — real-time execution progress and completion
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
  const res = await fetch(url);

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
  const params = new URLSearchParams({
    filename,
    subfolder,
    type,
  });
  const url = `${getBaseUrl()}/view?${params.toString()}`;

  const res = await fetch(url);
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

/**
 * Connect to ComfyUI WebSocket for execution progress.
 *
 * Emits progress updates and completion events.
 * Automatically reconnects on disconnect.
 */
export function connectWebSocket(
  onProgress: ProgressCallback,
  onCompletion: CompletionCallback,
): void {
  const baseUrl = getBaseUrl();
  const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";

  log.info("comfyui-ws", "Connecting to ComfyUI WebSocket", { wsUrl });

  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    log.info("comfyui-ws", "Connected");
  });

  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data as string) as Record<string, unknown>;
      const type = data.type as string | undefined;

      if (type === "execution_start" || type === "execution_cached") {
        // Progress preamble — ignore
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
          // Execution completed for this prompt
          const promptId = String(data.prompt_id ?? "");
          if (promptId) {
            log.info("comfyui-ws", "Execution completed", { promptId });
            // Fetch outputs from history
            getHistory(promptId).then((entry) => {
              if (entry) {
                onCompletion(promptId, entry.outputs ?? {});
              }
            }).catch((err) => {
              log.error("comfyui-ws", "Failed to fetch history after completion", err);
            });
          }
        }
        return;
      }

      if (type === "execution_error") {
        const promptId = String(data.prompt_id ?? "");
        log.error("comfyui-ws", "Execution error", { promptId, data });
        return;
      }
    } catch {
      // Non-JSON message — ignore
    }
  });

  ws.addEventListener("close", () => {
    log.warn("comfyui-ws", "WebSocket closed, reconnecting in 5s");
    _reconnectTimer = setTimeout(
      () => connectWebSocket(onProgress, onCompletion),
      5_000,
    );
  });

  ws.addEventListener("error", (event) => {
    log.error("comfyui-ws", "WebSocket error", event);
  });

  _ws = ws;
}

/**
 * Disconnect the ComfyUI WebSocket.
 */
export function disconnectWebSocket(): void {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  if (_ws) {
    _ws.close();
    _ws = null;
  }
}