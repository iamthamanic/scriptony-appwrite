/**
 * Live model discovery: fetch provider model lists (with API key / base URL) and
 * filter by Scriptony feature. Used by scriptony-ai POST /providers/:id/models/discover.
 */

import type { ModelInfo } from "./config/models";
import { getModelInfo, getModelsForProviderFeature } from "./config/models";

/** Feature keys stored in feature_config (must match DEFAULT_FEATURE_CONFIG). */
export const DISCOVERABLE_FEATURE_KEYS = [
  "assistant_chat",
  "assistant_embeddings",
  "creative_gym",
  "image_generation",
  "audio_stt",
  "audio_tts",
  "video_generation",
] as const;

export type DiscoverableFeatureKey = (typeof DISCOVERABLE_FEATURE_KEYS)[number];

/** Maps UI/feature_config keys to registry `ModelInfo.features` strings. */
export function featureKeyToRegistryFeature(featureKey: string): string {
  const map: Record<string, string> = {
    assistant_chat: "text",
    assistant_embeddings: "embeddings",
    creative_gym: "text",
    image_generation: "image",
    audio_stt: "audio_stt",
    audio_tts: "audio_tts",
    video_generation: "video",
  };
  const out = map[featureKey];
  if (!out) throw new Error(`Unknown feature: ${featureKey}`);
  return out;
}

export function isDiscoverableFeatureKey(key: string): key is DiscoverableFeatureKey {
  return (DISCOVERABLE_FEATURE_KEYS as readonly string[]).includes(key);
}

function registryMatchesProvider(regProvider: string, providerId: string): boolean {
  if (regProvider === providerId) return true;
  const ollamaIds = new Set(["ollama", "ollama_local", "ollama_cloud"]);
  return ollamaIds.has(providerId) && regProvider === "ollama";
}

/** Merge registry metadata (context window, features) into discovered rows. */
export function enrichWithRegistry(
  models: ModelInfo[],
  providerId: string,
  registryFeature: string
): ModelInfo[] {
  return models.map((m) => {
    const reg = getModelInfo(m.id);
    if (reg && registryMatchesProvider(reg.provider, providerId)) {
      return {
        ...m,
        name: m.name || reg.name,
        features: reg.features.includes(registryFeature)
          ? reg.features
          : [...new Set([...reg.features, registryFeature])],
        contextWindow: m.contextWindow ?? reg.contextWindow,
        maxOutputTokens: m.maxOutputTokens ?? reg.maxOutputTokens,
        pricing: m.pricing ?? reg.pricing,
      };
    }
    return {
      ...m,
      features: m.features?.length ? m.features : [registryFeature],
    };
  });
}

function dedupeById(models: ModelInfo[]): ModelInfo[] {
  const seen = new Set<string>();
  const out: ModelInfo[] = [];
  for (const m of models) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Exported for tests: OpenAI `/v1/models` id list filtering. */
export function filterOpenAIModelIdsForFeature(ids: string[], registryFeature: string): string[] {
  const id = (s: string) => s.toLowerCase();
  return ids.filter((raw) => {
    const s = id(raw);
    if (s.includes("dall-e") || s.includes("dall_e")) return registryFeature === "image";
    if (s.includes("whisper")) return registryFeature === "audio_stt";
    if (s.startsWith("tts-") || s.includes("tts-hd")) return registryFeature === "audio_tts";
    if (s.includes("embedding") || s.includes("embed")) return registryFeature === "embeddings";
    if (registryFeature === "text") {
      if (s.includes("dall-e") || s.includes("whisper") || s.includes("tts-") || s.includes("embedding")) {
        return false;
      }
      return (
        s.includes("gpt-") ||
        s.includes("o1") ||
        s.includes("o3") ||
        s.includes("o4") ||
        s.includes("chatgpt") ||
        s.startsWith("ft:") ||
        s.includes("davinci") ||
        s.includes("babbage")
      );
    }
    return registryFeature === "video" && (s.includes("sora") || s.includes("video"));
  });
}

/** Exported for tests: Ollama model name classification. */
export function classifyOllamaModelForFeature(name: string, registryFeature: string): boolean {
  const n = name.toLowerCase();
  const registryMatch = getModelsForProviderFeature("ollama", registryFeature).some(
    (m: ModelInfo) => m.id === name || m.id === name.split(":")[0]
  );
  if (registryMatch) return true;

  const textHints =
    /llama|mistral|qwen|gemma|phi|codellama|vicuna|orca|neural-chat|deepseek|mixtral|solar|yi-|falcon|starling|dolphin/i;
  const embedHints = /embed|nomic-embed|mxbai|bge-|e5-|snowflake/i;
  const imageHints = /flux|sdxl|stable|sd-|diffusion|llava|dreamshaper|animagine|playground|kandinsky|realvis|juggernaut/i;
  const sttHints = /whisper|faster-whisper|parakeet/i;
  const ttsHints = /bark|piper|speech|tts|xtts|coqui/i;
  const videoHints = /video|svd|zeroscope|ltx|animate|hunyuan|i2v|t2v/i;

  const isObviousChat = textHints.test(n) && !embedHints.test(n) && !imageHints.test(n);

  switch (registryFeature) {
    case "text":
      return isObviousChat && !embedHints.test(n);
    case "embeddings":
      return embedHints.test(n) || n.includes("embed");
    case "image":
      return imageHints.test(n) && !isObviousChat;
    case "audio_stt":
      return sttHints.test(n);
    case "audio_tts":
      return ttsHints.test(n);
    case "video":
      return videoHints.test(n);
    default:
      return false;
  }
}

type OpenRouterRow = {
  id: string;
  name?: string;
  architecture?: { modality?: string; tokenizer?: string };
};

/** Exported for tests. */
export function filterOpenRouterRowsForFeature(rows: OpenRouterRow[], registryFeature: string): OpenRouterRow[] {
  const modalityMap: Record<string, string[]> = {
    text: ["text", "multimodal"],
    embeddings: ["text", "embeddings"],
    image: ["image", "multimodal"],
    video: ["video", "multimodal"],
    audio_stt: ["audio", "multimodal"],
    audio_tts: ["audio", "multimodal"],
  };
  const want = modalityMap[registryFeature] ?? ["text"];

  return rows.filter((row) => {
    const mod = (row.architecture?.modality ?? "").toLowerCase();
    if (mod) {
      if (registryFeature === "text") return mod === "text" || mod === "multimodal";
      if (registryFeature === "embeddings") return mod.includes("embed") || row.id.includes("embed");
      if (registryFeature === "image") return mod === "image" || mod === "multimodal";
      if (registryFeature === "video") return mod === "video" || row.id.includes("video");
      return want.some((w) => mod.includes(w));
    }
    // No modality: fall back to id/name heuristics
    const id = row.id.toLowerCase();
    if (registryFeature === "text") {
      return !id.includes("dall-e") && !id.includes("flux") && !id.includes("stable-diffusion");
    }
    if (registryFeature === "image") {
      return id.includes("dall-e") || id.includes("flux") || id.includes("stable") || id.includes("midjourney");
    }
    if (registryFeature === "video") {
      return id.includes("video") || id.includes("runway") || id.includes("luma") || id.includes("kling");
    }
    return true;
  });
}

async function fetchOpenAIModels(apiKey: string, baseUrl = "https://api.openai.com/v1"): Promise<ModelInfo[]> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`OpenAI models: ${response.status} ${t}`);
  }
  const data = await response.json();
  const ids = (data.data ?? []).map((m: { id: string }) => m.id);
  return ids.map((id: string) => ({
    id,
    name: id,
    provider: "openai",
    features: [],
  }));
}

async function fetchOllamaTagNames(baseUrl: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/tags`;
  const response = await fetch(url);
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Ollama tags: ${response.status} ${t}`);
  }
  const data = await response.json();
  return (data.models ?? []).map((m: { name: string }) => m.name);
}

async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterRow[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`OpenRouter models: ${response.status} ${t}`);
  }
  const data = await response.json();
  return data.data ?? [];
}

async function fetchGoogleModels(apiKey: string): Promise<ModelInfo[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Google models: ${response.status} ${t}`);
  }
  const data = await response.json();
  const models = data.models ?? [];
  return models.map((m: { name: string; displayName?: string }) => {
    const short = m.name.replace(/^models\//, "");
    return {
      id: short,
      name: m.displayName ?? short,
      provider: "google",
      features: [],
    };
  });
}

async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Anthropic models: ${response.status} ${text}`);
  }
  let data: { data?: Array<{ id: string; display_name?: string }> };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Anthropic models: invalid response ${text.slice(0, 240)}`);
  }
  const list = data.data ?? [];
  return list.map((m: { id: string; display_name?: string }) => ({
    id: m.id,
    name: m.display_name ?? m.id,
    provider: "anthropic",
    features: [] as string[],
  }));
}

async function fetchDeepSeekModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch("https://api.deepseek.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`DeepSeek models: ${response.status} ${t}`);
  }
  const data = await response.json();
  const ids = (data.data ?? []).map((m: { id: string }) => m.id);
  return ids.map((id: string) => ({
    id,
    name: id,
    provider: "deepseek",
    features: [] as string[],
  }));
}

async function fetchElevenLabsModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch("https://api.elevenlabs.io/v1/models", {
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`ElevenLabs models: ${response.status} ${t}`);
  }
  const data = await response.json();
  const list = Array.isArray(data) ? data : [];
  return list.map((m: { model_id: string; name?: string }) => ({
    id: m.model_id,
    name: m.name ?? m.model_id,
    provider: "elevenlabs",
    features: ["audio_tts"] as string[],
  }));
}

export interface DiscoverModelsOptions {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Fetch live models from the provider API (no static registry fallback).
 * On HTTP/logic failure, throws — the caller should surface the error to the user.
 * Returns the full model list the provider exposes for the key (not heuristic-filtered).
 */
export async function discoverModels(
  providerId: string,
  featureKey: string,
  opts: DiscoverModelsOptions = {}
): Promise<ModelInfo[]> {
  if (!isDiscoverableFeatureKey(featureKey)) {
    throw new Error(`Invalid feature: ${featureKey}`);
  }
  const registryFeature = featureKeyToRegistryFeature(featureKey);

  let raw: ModelInfo[] = [];

  switch (providerId) {
    case "openai": {
      if (!opts.apiKey) throw new Error("API key required for OpenAI");
      raw = await fetchOpenAIModels(opts.apiKey);
      break;
    }
    case "ollama":
    case "ollama_local":
    case "ollama_cloud": {
      const defaultBase =
        providerId === "ollama_cloud"
          ? "https://ollama.com"
          : "http://127.0.0.1:11434";
      const base = opts.baseUrl?.trim() || defaultBase;
      const names = await fetchOllamaTagNames(base);
      raw = names.map((name) => ({
        id: name,
        name,
        provider: providerId,
        features: [] as string[],
      }));
      break;
    }
    case "openrouter": {
      if (!opts.apiKey) throw new Error("API key required for OpenRouter");
      const rows = await fetchOpenRouterModels(opts.apiKey);
      raw = rows.map((r) => ({
        id: r.id,
        name: r.name ?? r.id,
        provider: "openrouter",
        features: [] as string[],
      }));
      break;
    }
    case "google": {
      if (!opts.apiKey) throw new Error("API key required for Google");
      raw = await fetchGoogleModels(opts.apiKey);
      break;
    }
    case "anthropic": {
      if (!opts.apiKey) throw new Error("API key required for Anthropic");
      if (registryFeature !== "text") {
        throw new Error(
          "Live-Modellliste für Anthropic ist nur für Chat/Text verfügbar."
        );
      }
      raw = await fetchAnthropicModels(opts.apiKey);
      break;
    }
    case "deepseek": {
      if (!opts.apiKey) throw new Error("API key required for DeepSeek");
      if (registryFeature !== "text" && registryFeature !== "embeddings") {
        throw new Error(
          "DeepSeek liefert über die API nur Text-/Embedding-Modelle; diese Funktion passt nicht."
        );
      }
      raw = await fetchDeepSeekModels(opts.apiKey);
      break;
    }
    case "elevenlabs": {
      if (!opts.apiKey) throw new Error("API key required for ElevenLabs");
      if (registryFeature !== "audio_tts") {
        throw new Error(
          "ElevenLabs liefert nur Sprachmodelle; diese Funktion passt nicht."
        );
      }
      raw = await fetchElevenLabsModels(opts.apiKey);
      break;
    }
    case "huggingface": {
      throw new Error(
        "Keine Live-Modellliste für Hugging Face — bitte Modell-ID manuell setzen oder anderen Anbieter wählen."
      );
    }
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }

  return dedupeById(enrichWithRegistry(raw, providerId, registryFeature));
}
