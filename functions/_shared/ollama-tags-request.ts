/**
 * Fetches Ollama GET /api/tags using Node http/https (no dependency on global fetch).
 * Appwrite function runtimes may use Node without fetch; this avoids silent failures there.
 * Location: functions/_shared/ollama-tags-request.ts
 */

import * as http from "node:http";
import * as https from "node:https";
import { Buffer } from "node:buffer";

const UA = "ScriptonyAppwrite/1.0";

export type OllamaTagsPayload = { models?: Array<{ name?: string }> };

export type OllamaTagsResult =
  | { ok: true; status: number; payload: OllamaTagsPayload }
  | { ok: false; status: number; error: string };

function requestTags(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<OllamaTagsResult> {
  const urlStr = `${baseUrl.replace(/\/$/, "")}/api/tags`;
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return Promise.resolve({
      ok: false,
      status: 0,
      error: `Ungültige URL: ${urlStr}`,
    });
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
          let payload: OllamaTagsPayload = {};
          if (raw.trim()) {
            try {
              payload = JSON.parse(raw) as OllamaTagsPayload;
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
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 0, error: "Zeitüberschreitung (25s)" });
    });
    req.on("error", (err: Error) => {
      console.error("[ollama-tags-request]", urlStr, err.message);
      resolve({ ok: false, status: 0, error: err.message || "Netzwerkfehler" });
    });
    req.end();
  });
}

/** Connectivity + model list for Ollama (local http or cloud https). */
export async function fetchOllamaTags(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<OllamaTagsResult> {
  return requestTags(baseUrl, headers);
}
