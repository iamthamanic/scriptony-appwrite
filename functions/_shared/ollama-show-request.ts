/**
 * POST /api/show for a single Ollama model — reads model_info (and related fields) for context length.
 * Uses Node http/https (same constraints as ollama-tags-request).
 * Location: functions/_shared/ollama-show-request.ts
 */

import * as http from "node:http";
import * as https from "node:https";
import { Buffer } from "node:buffer";

const UA = "ScriptonyAppwrite/1.0";

/** Raw JSON from Ollama POST /api/show (fields vary by server version and model family). */
export type OllamaShowPayload = {
  model_info?: Record<string, unknown>;
  parameters?: string;
  details?: Record<string, unknown>;
  modelfile?: string;
} & Record<string, unknown>;

export type OllamaShowResult =
  | { ok: true; status: number; payload: OllamaShowPayload }
  | { ok: false; status: number; error: string };

function coercePositiveInt(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    return Math.floor(v);
  }
  if (typeof v === "string") {
    const n = Number(v.trim());
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  if (Array.isArray(v) && v.length > 0) return coercePositiveInt(v[0]);
  return undefined;
}

function keyLooksLikeContextLength(k: string): boolean {
  const x = k.toLowerCase();
  return (
    x.includes("context_length") ||
    (x.includes("context") && x.includes("length"))
  );
}

/**
 * Walk nested objects (model_info, details, or whole payload) and take the max plausible context length.
 */
function deepMaxContextLength(obj: unknown, depth = 0): number | undefined {
  if (depth > 14 || obj == null) return undefined;
  if (typeof obj !== "object") return undefined;

  if (Array.isArray(obj)) {
    let best = 0;
    for (const el of obj) {
      const v = deepMaxContextLength(el, depth + 1);
      if (v) best = Math.max(best, v);
    }
    return best > 0 ? best : undefined;
  }

  const rec = obj as Record<string, unknown>;
  let best = 0;
  for (const [k, v] of Object.entries(rec)) {
    if (keyLooksLikeContextLength(k)) {
      const n = coercePositiveInt(v);
      if (n && n >= 256) best = Math.max(best, n);
    } else if (typeof v === "object" && v !== null) {
      const sub = deepMaxContextLength(v, depth + 1);
      if (sub) best = Math.max(best, sub);
    }
  }
  return best > 0 ? best : undefined;
}

/** Ollama Modelfile / PARAMETER block: `PARAMETER num_ctx 32768` or `num_ctx 4096`. */
function parseNumCtxFromText(text: string | undefined): number | undefined {
  if (!text || typeof text !== "string") return undefined;
  let best = 0;
  const patterns: RegExp[] = [
    /\bnum_ctx\s+(\d{3,9})\b/gi,
    /\bNUM_CTX\s+(\d{3,9})\b/g,
    /PARAMETER\s+num_ctx\s+(\d{3,9})/gi,
    /"num_ctx"\s*:\s*(\d{3,9})/g,
    /num_ctx\s*=\s*(\d{3,9})/gi,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 256) best = Math.max(best, n);
    }
  }
  return best > 0 ? best : undefined;
}

/**
 * Best-effort context length from Ollama /api/show JSON (architecture-specific keys, parameters, modelfile).
 */
export function contextLengthFromShowPayload(
  payload: OllamaShowPayload,
): number | undefined {
  const fromModelInfo = deepMaxContextLength(payload.model_info);
  if (fromModelInfo) return fromModelInfo;

  const fromParams = parseNumCtxFromText(
    typeof payload.parameters === "string" ? payload.parameters : undefined,
  );
  if (fromParams) return fromParams;

  const fromDetails = deepMaxContextLength(payload.details);
  if (fromDetails) return fromDetails;

  const fromModelfile = parseNumCtxFromText(
    typeof payload.modelfile === "string" ? payload.modelfile : undefined,
  );
  if (fromModelfile) return fromModelfile;

  const fromWhole = deepMaxContextLength(payload);
  if (fromWhole) return fromWhole;

  return undefined;
}

function requestShow(
  baseUrl: string,
  modelName: string,
  headers: Record<string, string>,
): Promise<OllamaShowResult> {
  const urlStr = `${baseUrl.replace(/\/$/, "")}/api/show`;
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
  const body = JSON.stringify({ name: modelName });
  const merged: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Content-Length": String(Buffer.byteLength(body, "utf8")),
    "User-Agent": UA,
    ...headers,
  };

  return new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method: "POST",
        headers: merged,
        timeout: 25_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          const raw = Buffer.concat(chunks).toString("utf8");
          let payload: OllamaShowPayload = {};
          if (raw.trim()) {
            try {
              payload = JSON.parse(raw) as OllamaShowPayload;
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
      console.error("[ollama-show-request]", urlStr, err.message);
      resolve({ ok: false, status: 0, error: err.message || "Netzwerkfehler" });
    });
    req.write(body);
    req.end();
  });
}

/** Fetch model details including model_info (for context length). */
export async function fetchOllamaShow(
  baseUrl: string,
  modelName: string,
  headers: Record<string, string>,
): Promise<OllamaShowResult> {
  return requestShow(baseUrl, modelName, headers);
}
