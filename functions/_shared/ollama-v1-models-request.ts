/**
 * Fetches Ollama OpenAI-compatible GET /v1/models (catalog; often broader than /api/tags).
 * Location: functions/_shared/ollama-v1-models-request.ts
 */

import * as http from "node:http";
import * as https from "node:https";

const UA = "ScriptonyAppwrite/1.0";

export type OllamaV1ModelsPayload = {
  object?: string;
  data?: Array<{ id?: string; object?: string }>;
};

export type OllamaV1ModelsResult =
  | { ok: true; status: number; payload: OllamaV1ModelsPayload }
  | { ok: false; status: number; error: string };

function requestV1Models(baseUrl: string, headers: Record<string, string>): Promise<OllamaV1ModelsResult> {
  const urlStr = `${baseUrl.replace(/\/$/, "")}/v1/models`;
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return Promise.resolve({ ok: false, status: 0, error: `Ungültige URL: ${urlStr}` });
  }

  const lib = u.protocol === "https:" ? https : http;
  const merged: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": UA,
    ...headers,
  };

  return new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method: "GET",
        headers: merged,
        timeout: 25_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          const raw = Buffer.concat(chunks).toString("utf8");
          let payload: OllamaV1ModelsPayload = {};
          if (raw.trim()) {
            try {
              payload = JSON.parse(raw) as OllamaV1ModelsPayload;
            } catch {
              payload = {};
            }
          }
          if (status >= 200 && status < 300) {
            resolve({ ok: true, status, payload });
          } else {
            resolve({
              ok: false,
              status,
              error: raw.slice(0, 200) || `HTTP ${status}`,
            });
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 0, error: "Zeitüberschreitung (25s)" });
    });
    req.on("error", (err: Error) => {
      console.error("[ollama-v1-models-request]", urlStr, err.message);
      resolve({ ok: false, status: 0, error: err.message || "Netzwerkfehler" });
    });
    req.end();
  });
}

export async function fetchOllamaV1Models(
  baseUrl: string,
  headers: Record<string, string>
): Promise<OllamaV1ModelsResult> {
  return requestV1Models(baseUrl, headers);
}
