/**
 * Fetches model lists from provider APIs (server-side); falls back to static registry on failure.
 * Location: functions/scriptony-assistant/ai/fetch-dynamic-models.ts
 */

import { OLLAMA_CLOUD_ORIGIN } from "../../_shared/ai-feature-profile";
import { fetchOllamaTags } from "../../_shared/ollama-tags-request";
import { getProviderModels } from "./settings";

const OPENAI_CHAT = (id: string): boolean => {
  const x = id.toLowerCase();
  if (x.includes("embedding")) return false;
  if (x.includes("whisper")) return false;
  if (x.includes("tts")) return false;
  if (x.includes("dall-e") || x.includes("dalle")) return false;
  if (x.includes("moderation")) return false;
  if (x.includes("realtime")) return false;
  if (x.startsWith("gpt-")) return true;
  if (/^o\d/.test(x)) return true;
  if (x.startsWith("chatgpt-")) return true;
  if (x.startsWith("babbage") || x.startsWith("davinci") || x.startsWith("curie")) return true;
  return false;
};

function dedupeById(
  primary: Array<{ id: string; name: string; context_window: number }>,
  extra: Array<{ id: string; name: string; context_window: number }>
): Array<{ id: string; name: string; context_window: number }> {
  const seen = new Set(primary.map((e) => e.id));
  const out = [...primary];
  for (const e of extra) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  return out;
}

export async function listRemoteModels(
  provider: string,
  opts: { apiKey?: string; ollamaBaseUrl?: string; ollamaMode?: "local" | "cloud" }
): Promise<{ models: Array<{ id: string; name: string; context_window: number }>; source: "remote" | "registry" }> {
  const fallback = getProviderModels(provider);
  const apiKey = opts.apiKey?.trim() || "";

  try {
    if (provider === "openai") {
      if (!apiKey) return { models: fallback, source: "registry" };
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const payload = (await res.json().catch(() => ({}))) as { data?: Array<{ id?: string }> };
      if (!res.ok) return { models: fallback, source: "registry" };
      const rows = (payload.data ?? [])
        .map((m) => m.id)
        .filter((id): id is string => typeof id === "string" && OPENAI_CHAT(id))
        .sort()
        .map((id) => ({ id, name: id, context_window: 128000 }));
      return { models: rows.length ? dedupeById(rows, fallback) : fallback, source: rows.length ? "remote" : "registry" };
    }

    if (provider === "anthropic") {
      if (!apiKey) return { models: fallback, source: "registry" };
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
      const payload = (await res.json().catch(() => ({}))) as {
        data?: Array<{ id?: string; display_name?: string }>;
      };
      if (!res.ok) return { models: fallback, source: "registry" };
      const rows = (payload.data ?? [])
        .map((m) => ({
          id: String(m.id || ""),
          name: String(m.display_name || m.id || ""),
          context_window: 200000,
        }))
        .filter((m) => m.id);
      return { models: rows.length ? dedupeById(rows, fallback) : fallback, source: rows.length ? "remote" : "registry" };
    }

    if (provider === "google") {
      if (!apiKey) return { models: fallback, source: "registry" };
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      const payload = (await res.json().catch(() => ({}))) as {
        models?: Array<{ name?: string; displayName?: string; supportedGenerationMethods?: string[] }>;
      };
      if (!res.ok) return { models: fallback, source: "registry" };
      const rows = (payload.models ?? [])
        .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m) => {
          const full = String(m.name || "");
          const id = full.includes("/") ? full.split("/").pop() || full : full;
          return {
            id,
            name: String(m.displayName || id),
            context_window: 1048576,
          };
        })
        .filter((m) => m.id);
      return { models: rows.length ? dedupeById(rows, fallback) : fallback, source: rows.length ? "remote" : "registry" };
    }

    if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/models");
      const payload = (await res.json().catch(() => ({}))) as {
        data?: Array<{ id?: string; name?: string; context_length?: number }>;
      };
      if (!res.ok) return { models: fallback, source: "registry" };
      const rows = (payload.data ?? [])
        .map((m) => ({
          id: String(m.id || ""),
          name: String(m.name || m.id || ""),
          context_window: typeof m.context_length === "number" ? m.context_length : 128000,
        }))
        .filter((m) => m.id);
      return { models: rows.length ? dedupeById(rows, fallback) : fallback, source: rows.length ? "remote" : "registry" };
    }

    if (provider === "deepseek") {
      if (!apiKey) return { models: fallback, source: "registry" };
      let res = await fetch("https://api.deepseek.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        res = await fetch("https://api.deepseek.com/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      }
      const payload = (await res.json().catch(() => ({}))) as { data?: Array<{ id?: string }> };
      if (!res.ok) return { models: fallback, source: "registry" };
      const rows = (payload.data ?? [])
        .map((m) => String(m.id || ""))
        .filter(Boolean)
        .map((id) => ({ id, name: id, context_window: 64000 }));
      return { models: rows.length ? dedupeById(rows, fallback) : fallback, source: rows.length ? "remote" : "registry" };
    }

    if (provider === "ollama") {
      const cloud = opts.ollamaMode === "cloud";
      const base = (
        cloud ? OLLAMA_CLOUD_ORIGIN : (opts.ollamaBaseUrl || "").trim().replace(/\/$/, "")
      ).replace(/\/$/, "");
      if (!base) return { models: fallback, source: "registry" };
      const headers: Record<string, string> = {};
      if (cloud) {
        if (!apiKey) return { models: fallback, source: "registry" };
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else if (apiKey && apiKey !== "__ollama_local__") {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      const tags = await fetchOllamaTags(base, headers);
      if (!tags.ok) return { models: fallback, source: "registry" };
      const payload = tags.payload;
      const rows = (payload.models ?? [])
        .map((m) => String(m.name || ""))
        .filter(Boolean)
        .map((id) => ({ id, name: id, context_window: 8192 }));
      return { models: rows.length ? dedupeById(rows, fallback) : fallback, source: rows.length ? "remote" : "registry" };
    }
  } catch {
    /* use fallback */
  }

  return { models: fallback, source: "registry" };
}
