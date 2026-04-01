/**
 * Unified model capability rows for Assistant + Image model browsers.
 * Uses official provider metadata and heuristics (no live image probe).
 * Location: functions/_shared/model-capabilities.ts
 */

import { OLLAMA_CLOUD_ORIGIN } from "./ai-feature-profile";
import { fetchOllamaTags } from "./ollama-tags-request";
import { fetchOllamaV1Models } from "./ollama-v1-models-request";
import { contextLengthFromShowPayload, fetchOllamaShow } from "./ollama-show-request";
import type { OllamaShowPayload } from "./ollama-show-request";

export type CapabilityState = "true" | "false" | "unknown";

export type UnifiedModelRow = {
  model_id: string;
  display_name: string;
  provider: string;
  context_window: number | null;
  image_gen: CapabilityState;
  vision: CapabilityState;
  tools: CapabilityState;
  thinking: CapabilityState;
  video_gen: CapabilityState;
  source: "provider-metadata" | "live-probe" | "mixed";
  verified_at?: string;
};

export type UnifiedFetchOpts = {
  provider: string;
  apiKey?: string;
  ollamaMode?: "local" | "cloud";
  ollamaBaseUrl?: string;
};

const UNKNOWN: CapabilityState = "unknown";
const TRUE: CapabilityState = "true";
const FALSE: CapabilityState = "false";

function dedupe(rows: UnifiedModelRow[]): UnifiedModelRow[] {
  const seen = new Set<string>();
  const out: UnifiedModelRow[] = [];
  for (const r of rows) {
    if (!r.model_id || seen.has(r.model_id)) continue;
    seen.add(r.model_id);
    out.push(r);
  }
  return out;
}

function baseRow(provider: string, id: string, displayName?: string): UnifiedModelRow {
  return {
    model_id: id,
    display_name: displayName || id,
    provider,
    context_window: null,
    image_gen: UNKNOWN,
    vision: UNKNOWN,
    tools: UNKNOWN,
    thinking: UNKNOWN,
    video_gen: UNKNOWN,
    source: "provider-metadata",
  };
}

function isLikelyImageModel(id: string): boolean {
  const x = id.toLowerCase();
  return (
    x.startsWith("x/") ||
    x.includes("image") ||
    x.includes("flux") ||
    x.includes("z-image") ||
    x.includes("sdxl") ||
    x.includes("stable-diffusion") ||
    x.includes("dall")
  );
}

function isLikelyVisionModel(id: string): boolean {
  const x = id.toLowerCase();
  return x.includes("vision") || x.includes("vl") || x.includes("omni") || x.includes("multimodal");
}

function isLikelyToolsModel(id: string): boolean {
  const x = id.toLowerCase();
  return x.includes("tool") || x.includes("function") || x.includes("agent");
}

function isLikelyThinkingModel(id: string): boolean {
  const x = id.toLowerCase();
  return x.includes("reason") || x.includes("think") || x.includes("r1") || /^o\d/.test(x);
}

function isLikelyVideoModel(id: string): boolean {
  const x = id.toLowerCase();
  return x.includes("video") || x.includes("wan") || x.includes("ltx") || x.includes("sora") || x.includes("veo");
}

function boolToCap(v: boolean): CapabilityState {
  return v ? TRUE : FALSE;
}

function mergeCapability(current: CapabilityState, inferred: CapabilityState): CapabilityState {
  if (current === TRUE || current === FALSE) return current;
  return inferred;
}

function textFromUnknown(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value).toLowerCase();
  if (Array.isArray(value)) return value.map((v) => textFromUnknown(v)).join(" ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value).toLowerCase();
    } catch {
      return "";
    }
  }
  return "";
}

function inferFromText(id: string, text: string): {
  image_gen: CapabilityState;
  vision: CapabilityState;
  tools: CapabilityState;
  thinking: CapabilityState;
  video_gen: CapabilityState;
} {
  const x = `${id.toLowerCase()} ${text}`.trim();
  const has = (...needles: string[]) => needles.some((n) => x.includes(n));

  return {
    image_gen: boolToCap(
      has("image generation", "text-to-image", "flux", "sdxl", "stable diffusion", "dall-e", "dall", "z-image") ||
        isLikelyImageModel(id)
    ),
    vision: boolToCap(has("vision", "multimodal", "image input", "image understanding", "vl", "omni") || isLikelyVisionModel(id)),
    tools: boolToCap(
      has("function calling", "tool use", "tool-calling", "tools", "function_calling", "agent") || isLikelyToolsModel(id)
    ),
    thinking: boolToCap(has("reasoning", "chain-of-thought", "thinking", "reasoner") || isLikelyThinkingModel(id)),
    video_gen: boolToCap(has("video generation", "text-to-video", "video model", "wan", "ltx", "sora", "veo") || isLikelyVideoModel(id)),
  };
}

function applyInferred(row: UnifiedModelRow, inferred: ReturnType<typeof inferFromText>): void {
  row.image_gen = mergeCapability(row.image_gen, inferred.image_gen);
  row.vision = mergeCapability(row.vision, inferred.vision);
  row.tools = mergeCapability(row.tools, inferred.tools);
  row.thinking = mergeCapability(row.thinking, inferred.thinking);
  row.video_gen = mergeCapability(row.video_gen, inferred.video_gen);
}

function inferFromOllamaShowPayload(id: string, payload: OllamaShowPayload): ReturnType<typeof inferFromText> {
  const text = [
    textFromUnknown(payload.model_info),
    textFromUnknown(payload.details),
    textFromUnknown(payload.parameters),
    textFromUnknown(payload.modelfile),
  ]
    .filter(Boolean)
    .join(" ");
  return inferFromText(id, text);
}

function inferFromOpenrouterModel(model: {
  id?: string;
  name?: string;
  context_length?: number;
  architecture?: Record<string, unknown>;
  top_provider?: Record<string, unknown>;
}): ReturnType<typeof inferFromText> {
  const text = [
    textFromUnknown(model.name),
    textFromUnknown(model.architecture),
    textFromUnknown(model.top_provider),
  ]
    .filter(Boolean)
    .join(" ");
  return inferFromText(String(model.id || ""), text);
}

function toLegacy(rows: UnifiedModelRow[]): Array<{ id: string; name: string; context_window: number }> {
  return rows.map((r) => ({
    id: r.model_id,
    name: r.display_name || r.model_id,
    context_window: typeof r.context_window === "number" && r.context_window > 0 ? r.context_window : 8192,
  }));
}

async function fetchOllamaUnified(opts: UnifiedFetchOpts): Promise<UnifiedModelRow[]> {
  const cloud = opts.ollamaMode !== "local";
  const base = (cloud ? OLLAMA_CLOUD_ORIGIN : opts.ollamaBaseUrl || "").trim().replace(/\/$/, "");
  if (!base) return [];
  const headers: Record<string, string> = {};
  const apiKey = opts.apiKey?.trim() || "";
  if (cloud && apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (!cloud && apiKey && apiKey !== "__ollama_local__") headers.Authorization = `Bearer ${apiKey}`;

  const rows: UnifiedModelRow[] = [];
  const tags = await fetchOllamaTags(base, headers);
  if (tags.ok) {
    for (const m of tags.payload.models ?? []) {
      const id = String(m.name || "").trim();
      if (!id) continue;
      const row = baseRow("ollama", id);
      row.image_gen = isLikelyImageModel(id) ? UNKNOWN : FALSE;
      row.vision = isLikelyVisionModel(id) ? UNKNOWN : FALSE;
      row.tools = isLikelyToolsModel(id) ? UNKNOWN : FALSE;
      row.thinking = isLikelyThinkingModel(id) ? UNKNOWN : FALSE;
      row.video_gen = FALSE;
      row.context_window = 8192;
      rows.push(row);
    }
  }
  if (cloud && apiKey) {
    const v1 = await fetchOllamaV1Models(base, headers);
    if (v1.ok) {
      for (const m of v1.payload.data ?? []) {
        const id = String(m.id || "").trim();
        if (!id) continue;
        rows.push(baseRow("ollama", id));
      }
    }
  }

  const deduped = dedupe(rows);
  for (const row of deduped) {
    applyInferred(row, inferFromText(row.model_id, ""));
  }
  // Resolve context window from /api/show when available.
  for (const row of deduped) {
    const show = await fetchOllamaShow(base, row.model_id, headers);
    if (show.ok) {
      const ctx = contextLengthFromShowPayload(show.payload);
      if (typeof ctx === "number" && ctx > 0) row.context_window = ctx;
      applyInferred(row, inferFromOllamaShowPayload(row.model_id, show.payload));
    }
  }
  return deduped;
}

async function fetchOpenrouterUnified(opts: UnifiedFetchOpts): Promise<UnifiedModelRow[]> {
  const apiKey = opts.apiKey?.trim() || "";
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) return [];
  const payload = (await res.json().catch(() => ({}))) as {
    data?: Array<{
      id?: string;
      name?: string;
      context_length?: number;
      architecture?: Record<string, unknown>;
      top_provider?: Record<string, unknown>;
    }>;
  };
  const rows: UnifiedModelRow[] = [];
  for (const m of payload.data ?? []) {
    const id = String(m.id || "").trim();
    if (!id) continue;
    const row = baseRow("openrouter", id, String(m.name || id));
    row.context_window = typeof m.context_length === "number" ? m.context_length : null;
    applyInferred(row, inferFromOpenrouterModel(m));
    rows.push(row);
  }

  return rows;
}

async function fetchGenericUnified(provider: string, apiKey: string): Promise<UnifiedModelRow[]> {
  if (!apiKey && (provider === "openai" || provider === "anthropic" || provider === "google" || provider === "deepseek")) {
    return [];
  }
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return [];
    const payload = (await res.json().catch(() => ({}))) as { data?: Array<{ id?: string }> };
    return dedupe(
      (payload.data ?? [])
        .map((m) => String(m.id || "").trim())
        .filter(Boolean)
        .map((id) => {
          const r = baseRow("openai", id);
          r.context_window = 128000;
          r.image_gen = id.includes("image") || id.includes("dall") ? TRUE : FALSE;
          r.vision = id.includes("vision") || id.includes("gpt-4o") ? TRUE : UNKNOWN;
          r.tools = TRUE;
          r.thinking = /^o\d/.test(id) ? TRUE : UNKNOWN;
          r.video_gen = FALSE;
          return r;
        })
    );
  }
  return [];
}

export async function fetchUnifiedModels(
  opts: UnifiedFetchOpts
): Promise<{ models: UnifiedModelRow[]; source: "remote" | "registry" }> {
  const provider = (opts.provider || "").trim().toLowerCase();
  const apiKey = opts.apiKey?.trim() || "";
  try {
    let rows: UnifiedModelRow[] = [];
    if (provider === "ollama") {
      rows = await fetchOllamaUnified(opts);
    } else if (provider === "openrouter") {
      rows = await fetchOpenrouterUnified(opts);
    } else {
      rows = await fetchGenericUnified(provider, apiKey);
    }

    const finalRows = dedupe(rows);
    return { models: finalRows, source: finalRows.length ? "remote" : "registry" };
  } catch {
    return { models: [], source: "registry" };
  }
}

export function toLegacyModelRows(
  rows: UnifiedModelRow[]
): Array<{ id: string; name: string; context_window: number }> {
  return toLegacy(rows);
}

