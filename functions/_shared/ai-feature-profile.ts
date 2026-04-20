/**
 * Resolves per-feature LLM settings from ai_chat_settings + settings_json overrides.
 * Location: functions/_shared/ai-feature-profile.ts
 */

import type { ProviderSettings } from "./ai";
import { normalizeAssistantSystemPrompt } from "./default-assistant-system-prompt";
import process from "node:process";

export type AiFeatureId = "assistant" | "gym" | "stage";

/** Routable image surfaces (Cover, 2DStage) — settings_json.image.feature_profiles */
export type ImageFeatureId = "cover" | "stage2d";

export type ImageProviderId = "ollama" | "openrouter";

export interface ImageFeatureProfileOverride {
  provider?: ImageProviderId;
  model?: string;
}

export {
  DEFAULT_ASSISTANT_SYSTEM_PROMPT,
  normalizeAssistantSystemPrompt,
} from "./default-assistant-system-prompt";

export type LlmProviderId = ProviderSettings["provider"];

export type AiBillingMode = "byok" | "hosted";

export type OllamaConnectionMode = "local" | "cloud";

/** Ollama: Lokal (Basis-URL) vs. Ollama Cloud (nur API-Key, Host fest). */
export interface OllamaSettingsBlock {
  mode?: OllamaConnectionMode;
}

/** Per BYOK provider: default model/temp/max when saving keys in the UI. */
export interface ProviderProfilePrefs {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface AiFeatureProfileOverride {
  provider?: ProviderSettings["provider"];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  /** Appended to the base system prompt for this feature */
  system_prompt_extra?: string;
}

export interface AiSettingsJsonV1 {
  schema_version?: number;
  ai_mode?: AiBillingMode;
  /** Default for generated copy; UI language can override in clients */
  output_language?: "ui" | "de" | "en" | "custom";
  custom_locale?: string;
  /** Defaults per provider (key form in UI), applied before row-level active_model/temperature. */
  provider_profiles?: Partial<Record<LlmProviderId, ProviderProfilePrefs>>;
  feature_profiles?: Partial<Record<AiFeatureId, AiFeatureProfileOverride>>;
  /**
   * Wenn gesetzt: nur diese Features nutzen BYOK/Hosted-LLM.
   * Wenn nicht gesetzt: alle Features (assistant, gym, stage) sind aktiv (Abwärtskompatibilität).
   */
  enabled_features?: AiFeatureId[];
  ollama?: OllamaSettingsBlock | null;
  image?: {
    provider?: "ollama" | "openrouter";
    model?: string;
    api_key?: string;
    ollama_api_key?: string;
    openrouter_api_key?: string;
    enabled_features?: Array<"cover" | "stage2d">;
    /** Per feature: which image provider + optional model pin (like LLM feature_profiles). */
    feature_profiles?: Partial<
      Record<ImageFeatureId, ImageFeatureProfileOverride | null>
    >;
    /** Last-selected model per image provider card (persisted independently). */
    provider_models?: Partial<Record<ImageProviderId, string>>;
    ollama?: { mode?: "cloud" } | null;
  } | null;
}

/** Öffentlicher Host für Ollama Cloud (OpenAI-kompatibel unter /v1/chat/completions). */
export const OLLAMA_CLOUD_ORIGIN = (
  process.env.SCRIPTONY_OLLAMA_CLOUD_ORIGIN || "https://ollama.com"
).replace(/\/$/, "");

export function inferOllamaMode(
  row: Record<string, unknown>,
  json: AiSettingsJsonV1,
): OllamaConnectionMode {
  const m = json.ollama?.mode;
  if (m === "cloud" || m === "local") return m;
  const base = typeof row.ollama_base_url === "string"
    ? row.ollama_base_url.trim()
    : "";
  const key = typeof row.ollama_api_key === "string"
    ? row.ollama_api_key.trim()
    : "";
  if (base) return "local";
  if (key) return "cloud";
  return "local";
}

function parseJsonSafe(raw: unknown): AiSettingsJsonV1 {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as AiSettingsJsonV1;
  }
  if (typeof raw === "string") {
    try {
      const o = JSON.parse(raw) as unknown;
      return typeof o === "object" && o !== null && !Array.isArray(o)
        ? (o as AiSettingsJsonV1)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function parseSettingsJsonField(raw: unknown): AiSettingsJsonV1 {
  return parseJsonSafe(raw);
}

function hostedApiKeyForProvider(
  provider: ProviderSettings["provider"],
): string | null {
  const envMap: Record<ProviderSettings["provider"], string | undefined> = {
    openai: process.env.SCRIPTONY_HOSTED_OPENAI_API_KEY,
    anthropic: process.env.SCRIPTONY_HOSTED_ANTHROPIC_API_KEY,
    google: process.env.SCRIPTONY_HOSTED_GOOGLE_API_KEY,
    openrouter: process.env.SCRIPTONY_HOSTED_OPENROUTER_API_KEY,
    deepseek: process.env.SCRIPTONY_HOSTED_DEEPSEEK_API_KEY,
    ollama: undefined,
  };
  const v = envMap[provider]?.trim();
  return v || null;
}

const OLLAMA_LOCAL = "__ollama_local__";

function byokKeyForProvider(
  row: Record<string, unknown>,
  provider: ProviderSettings["provider"],
): string | null {
  if (provider === "ollama") {
    const json = parseSettingsJsonField(row?.settings_json);
    const om = inferOllamaMode(row, json);
    if (om === "cloud") {
      const key = typeof row.ollama_api_key === "string"
        ? row.ollama_api_key.trim()
        : "";
      return key || null;
    }
    const base = typeof row.ollama_base_url === "string"
      ? row.ollama_base_url.trim()
      : "";
    if (!base) return null;
    const key = typeof row.ollama_api_key === "string"
      ? row.ollama_api_key.trim()
      : "";
    return key || OLLAMA_LOCAL;
  }
  const keyName = `${provider}_api_key` as const;
  const v = row[keyName];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export type ResolveAiFeatureResult =
  | { ok: true; settings: ProviderSettings; json: AiSettingsJsonV1 }
  | { ok: false; error: string; json: AiSettingsJsonV1 };

/**
 * Merges global ai_chat_settings row with settings_json.feature_profiles[featureId].
 */
export function resolveAiFeatureProfile(
  row: Record<string, unknown> | null | undefined,
  featureId: AiFeatureId,
): ResolveAiFeatureResult {
  const json = parseSettingsJsonField(row?.settings_json);
  const enabled = json.enabled_features;
  if (
    enabled !== undefined &&
    Array.isArray(enabled) &&
    !enabled.includes(featureId)
  ) {
    return {
      ok: false,
      error:
        "Diese KI-Funktion ist unter Einstellungen → Integrationen für dein LLM deaktiviert.",
      json,
    };
  }
  const mode: AiBillingMode = json.ai_mode === "hosted" ? "hosted" : "byok";

  const baseProvider = (row?.active_provider as ProviderSettings["provider"]) ||
    "openai";
  const baseModel =
    (typeof row?.active_model === "string" && row.active_model) ||
    "gpt-4o-mini";
  const baseSystem = normalizeAssistantSystemPrompt(
    typeof row?.system_prompt === "string" ? row.system_prompt : null,
  );
  const baseTemp =
    typeof row?.temperature === "number" && !Number.isNaN(row.temperature)
      ? row.temperature
      : 0.7;
  const baseMax =
    typeof row?.max_tokens === "number" && !Number.isNaN(row.max_tokens)
      ? row.max_tokens
      : 2000;

  const ov = json.feature_profiles?.[featureId] ?? {};
  const provider = ov.provider ?? baseProvider;
  const pp = json.provider_profiles?.[provider] ?? {};
  const model = ov.model ?? pp.model ?? baseModel;
  const temperature = typeof ov.temperature === "number"
    ? ov.temperature
    : typeof pp.temperature === "number"
    ? pp.temperature
    : baseTemp;
  const maxTokens = typeof ov.max_tokens === "number"
    ? ov.max_tokens
    : typeof pp.max_tokens === "number"
    ? pp.max_tokens
    : baseMax;

  let systemPrompt = baseSystem;
  if (
    typeof ov.system_prompt_extra === "string" &&
    ov.system_prompt_extra.trim()
  ) {
    systemPrompt = `${baseSystem}\n\n${ov.system_prompt_extra.trim()}`;
  }

  let apiKey: string | null = null;
  if (mode === "hosted") {
    apiKey = hostedApiKeyForProvider(provider);
    if (!apiKey) {
      return {
        ok: false,
        error:
          "Hosted-KI ist nicht konfiguriert (SCRIPTONY_HOSTED_*_API_KEY). Nutze BYOK oder kontaktiere den Support.",
        json,
      };
    }
  } else {
    apiKey = byokKeyForProvider(row ?? {}, provider);
    if (!apiKey) {
      if (provider === "ollama") {
        const om = inferOllamaMode(row ?? {}, json);
        return {
          ok: false,
          error: om === "cloud"
            ? "Ollama Cloud: Bitte API-Key (ollama.com/settings/keys) in den KI-Einstellungen hinterlegen."
            : "Ollama (lokal): Bitte Basis-URL (z. B. http://localhost:11434) in den KI-Einstellungen setzen.",
          json,
        };
      }
      return {
        ok: false,
        error:
          "Kein API-Key für den aktiven Provider. Hinterlege einen Key unter Einstellungen → Integrationen.",
        json,
      };
    }
  }

  let ollamaBaseUrl: string | undefined;
  let ollamaMode: OllamaConnectionMode | undefined;
  if (provider === "ollama") {
    ollamaMode = inferOllamaMode(row ?? {}, json);
    ollamaBaseUrl = ollamaMode === "cloud"
      ? OLLAMA_CLOUD_ORIGIN
      : typeof row?.ollama_base_url === "string"
      ? row.ollama_base_url.trim()
      : undefined;
  }

  return {
    ok: true,
    json,
    settings: {
      provider,
      model,
      apiKey,
      systemPrompt,
      temperature,
      maxTokens,
      ...(ollamaBaseUrl ? { ollamaBaseUrl } : {}),
      ...(ollamaMode ? { ollamaMode } : {}),
    },
  };
}

function getImageBlock(
  json: AiSettingsJsonV1,
): NonNullable<AiSettingsJsonV1["image"]> | undefined {
  const im = json.image;
  return im && typeof im === "object" ? im : undefined;
}

/** Global image feature flags; missing enabled_features => both cover and stage2d on (legacy). */
export function getImageFeatureFlags(
  json: AiSettingsJsonV1 | undefined,
): Record<ImageFeatureId, boolean> {
  const ef = json?.image?.enabled_features;
  if (ef === undefined) {
    return { cover: true, stage2d: true };
  }
  return {
    cover: ef.includes("cover"),
    stage2d: ef.includes("stage2d"),
  };
}

export function getRoutedImageProviderForFeature(
  json: AiSettingsJsonV1 | undefined,
  fid: ImageFeatureId,
): ImageProviderId | undefined {
  const p = json?.image?.feature_profiles?.[fid]?.provider;
  if (p === "openrouter" || p === "ollama") return p;
  return undefined;
}

/**
 * Explicit feature_profiles routing, else legacy: single image.provider when feature is globally enabled.
 */
export function getEffectiveImageProviderForFeature(
  json: AiSettingsJsonV1 | undefined,
  fid: ImageFeatureId,
): ImageProviderId | undefined {
  const explicit = getRoutedImageProviderForFeature(json, fid);
  if (explicit) return explicit;
  const flags = getImageFeatureFlags(json);
  if (!flags[fid]) return undefined;
  const fallback = json?.image?.provider === "openrouter"
    ? "openrouter"
    : "ollama";
  return fallback;
}

export function getEffectiveImageModelForFeature(
  json: AiSettingsJsonV1 | undefined,
  fid: ImageFeatureId,
): string {
  const img = getImageBlock(json);
  if (!img) return "";
  const routedPid = getEffectiveImageProviderForFeature(json, fid);
  const fpModel = img.feature_profiles?.[fid]?.model?.trim();
  if (fpModel) return fpModel;
  if (routedPid && typeof img.provider_models?.[routedPid] === "string") {
    const m = img.provider_models[routedPid]!.trim();
    if (m) return m;
  }
  const legacy = typeof img.model === "string" ? img.model.trim() : "";
  return legacy || "";
}

export type ResolveCoverImageRouteResult =
  | {
    ok: true;
    provider: ImageProviderId;
    model: string;
  }
  | { ok: false; error: string };

/** Resolves provider + model + enabled state for POST /ai/image/generate-cover */
export function resolveCoverImageRoute(
  json: AiSettingsJsonV1 | undefined,
  bodyModel?: string,
): ResolveCoverImageRouteResult {
  const flags = getImageFeatureFlags(json);
  if (!flags.cover) {
    return {
      ok: false,
      error:
        "Cover-Bildgenerierung ist unter Einstellungen → Integrationen (Image) deaktiviert.",
    };
  }
  const provider = getEffectiveImageProviderForFeature(json, "cover");
  if (!provider) {
    return {
      ok: false,
      error:
        "Kein Image-Provider für Cover zugewiesen. Bitte unter Image einen Anbieter konfigurieren und Cover zuweisen.",
    };
  }
  const model = (bodyModel && bodyModel.trim()) ||
    getEffectiveImageModelForFeature(json, "cover") ||
    "gpt-image-1";
  return { ok: true, provider, model };
}

export function mergeSettingsJson(
  existingRaw: unknown,
  patch: Partial<AiSettingsJsonV1>,
): AiSettingsJsonV1 {
  const cur = parseSettingsJsonField(existingRaw);
  let feature_profiles = cur.feature_profiles;
  if (patch.feature_profiles) {
    feature_profiles = { ...cur.feature_profiles };
    for (
      const [key, val] of Object.entries(patch.feature_profiles) as [
        AiFeatureId,
        AiFeatureProfileOverride | null | undefined,
      ][]
    ) {
      if (val === null) {
        delete feature_profiles[key as AiFeatureId];
        continue;
      }
      if (!val) continue;
      feature_profiles[key] = {
        ...(cur.feature_profiles?.[key] ?? {}),
        ...val,
      };
    }
  }
  let provider_profiles = cur.provider_profiles;
  if (patch.provider_profiles) {
    provider_profiles = { ...cur.provider_profiles };
    for (
      const [key, val] of Object.entries(patch.provider_profiles) as [
        LlmProviderId,
        ProviderProfilePrefs | null | undefined,
      ][]
    ) {
      if (val === null) {
        delete provider_profiles[key as LlmProviderId];
        continue;
      }
      if (!val) continue;
      provider_profiles[key] = {
        ...(cur.provider_profiles?.[key] ?? {}),
        ...val,
      };
    }
  }
  let ollama = cur.ollama;
  if (Object.prototype.hasOwnProperty.call(patch, "ollama")) {
    if (patch.ollama === null) {
      ollama = undefined;
    } else if (patch.ollama && typeof patch.ollama === "object") {
      ollama = { ...(cur.ollama ?? {}), ...patch.ollama };
    }
  }
  let image = cur.image;
  if (Object.prototype.hasOwnProperty.call(patch, "image")) {
    if (patch.image === null) {
      image = undefined;
    } else if (patch.image && typeof patch.image === "object") {
      image = { ...(cur.image ?? {}), ...patch.image };
      if (patch.image.feature_profiles) {
        const curFp = { ...(cur.image?.feature_profiles ?? {}) };
        for (
          const [key, val] of Object.entries(
            patch.image.feature_profiles,
          ) as [
            ImageFeatureId,
            ImageFeatureProfileOverride | null | undefined,
          ][]
        ) {
          if (val === null) {
            delete curFp[key];
            continue;
          }
          if (!val) continue;
          curFp[key] = {
            ...(cur.image?.feature_profiles?.[key] ?? {}),
            ...val,
          };
        }
        image.feature_profiles = Object.keys(curFp).length > 0
          ? curFp
          : undefined;
      }
      if (patch.image.provider_models) {
        image.provider_models = {
          ...(cur.image?.provider_models ?? {}),
          ...patch.image.provider_models,
        };
      }
      if (Object.prototype.hasOwnProperty.call(patch.image, "ollama")) {
        if (patch.image.ollama === null) {
          delete image.ollama;
        } else if (
          patch.image.ollama &&
          typeof patch.image.ollama === "object"
        ) {
          image.ollama = {
            ...(cur.image?.ollama ?? {}),
            ...patch.image.ollama,
          };
        }
      }
    }
  }

  const {
    feature_profiles: _fp,
    provider_profiles: _pp,
    ollama: _ollamaPatch,
    image: _imagePatch,
    ...patchRest
  } = patch;
  const out: AiSettingsJsonV1 = {
    ...cur,
    ...patchRest,
    schema_version: 1,
    feature_profiles,
    provider_profiles,
  };
  if (Object.prototype.hasOwnProperty.call(patch, "ollama")) {
    if (patch.ollama === null) {
      delete out.ollama;
    } else {
      out.ollama = ollama;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "image")) {
    if (patch.image === null) {
      delete out.image;
    } else {
      out.image = image;
    }
  }
  return out;
}
