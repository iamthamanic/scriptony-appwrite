/**
 * Reusable AI settings: collapsible per-provider cards, feature routing toggles.
 * Model lists (table + searchable combobox) only after saved credentials and successful „Verbindung testen“ (POST /ai/validate-key).
 * Location: src/components/ai/AISettingsForm.tsx
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Loader2,
  AlertCircle,
  Trash2,
  ChevronDown,
  Search,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { apiGet, apiPost, apiPut } from "../../lib/api-client";
import {
  LLMModelBrowsePanel,
  type ModelWithContextRow,
} from "./LLMModelBrowsePanel";
import { SearchableModelSelect } from "./SearchableModelSelect";
import {
  BACKEND_FUNCTIONS,
  buildFunctionRouteUrl,
} from "../../lib/api-gateway";
import { isBackendConfigured } from "../../lib/env";
import {
  LLM_PROVIDER_IDS,
  type LlmProviderId,
  defaultModelForProvider,
} from "../../lib/llm-provider-registry";
import {
  AI_ROUTABLE_FEATURES,
  getEffectiveProviderForFeature,
  getRoutedProviderForFeature,
  type AiFeatureId,
} from "../../lib/ai-feature-routing";
import { notifyAiSettingsConsumers } from "../../lib/ai-settings-updated";
import { useAiProviderFeatureToggles } from "../../hooks/useAiProviderFeatureToggles";
import { useAiImageProviderFeatureToggles } from "../../hooks/useAiImageProviderFeatureToggles";
import {
  getEffectiveImageProviderForFeature,
  getRoutedImageProviderForFeature,
  type ImageFeatureId,
  type ImageProviderId,
} from "../../lib/ai-image-feature-routing";
import { ProviderFeatureToggleBadges } from "./ProviderFeatureToggleBadges";
import { ImageFeatureToggleBadges } from "./ImageFeatureToggleBadges";
import { ProviderSecretInput } from "./ProviderSecretInput";
import { cn } from "../ui/utils";

interface AiFeatureProfileOverride {
  provider?: LlmProviderId;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface ProviderProfilePrefs {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

type OllamaUiMode = "local" | "cloud";

interface AiSettingsJsonParsed {
  enabled_features?: AiFeatureId[];
  feature_profiles?: Partial<Record<AiFeatureId, AiFeatureProfileOverride>>;
  provider_profiles?: Partial<Record<LlmProviderId, ProviderProfilePrefs>>;
  ollama?: { mode?: OllamaUiMode } | null;
  image?: {
    provider?: "ollama" | "openrouter";
    model?: string;
    enabled_features?: Array<"cover" | "stage2d">;
    feature_profiles?: Partial<
      Record<
        "cover" | "stage2d",
        { provider?: "ollama" | "openrouter"; model?: string } | null
      >
    >;
    provider_models?: Partial<Record<"ollama" | "openrouter", string>>;
    ollama?: { mode?: "cloud" } | null;
  } | null;
}

interface AISettings {
  id: string;
  openai_api_key?: string;
  anthropic_api_key?: string;
  google_api_key?: string;
  openrouter_api_key?: string;
  deepseek_api_key?: string;
  ollama_base_url?: string | null;
  ollama_api_key?: string | null;
  ollama_image_api_key?: string | null;
  active_provider: LlmProviderId;
  active_model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  use_rag: boolean;
  settings_json?: string | null;
  settings_json_parsed?: AiSettingsJsonParsed;
}

const PROVIDER_KEY_FIELD: Record<LlmProviderId, keyof AISettings | null> = {
  openai: "openai_api_key",
  anthropic: "anthropic_api_key",
  google: "google_api_key",
  openrouter: "openrouter_api_key",
  deepseek: "deepseek_api_key",
  ollama: null,
};

const FEATURE_DEFAULT = "__default__" as const;

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  google: "Google (Gemini)",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  ollama: "Ollama",
};

type ValidateKeySuccess = {
  valid?: boolean;
  models_with_context?: ModelWithContextRow[];
  models_with_capabilities?: Array<
    ModelWithContextRow & {
      model_id?: string;
      display_name?: string;
      provider?: string;
      image_gen?: "true" | "false" | "unknown";
      vision?: "true" | "false" | "unknown";
      tools?: "true" | "false" | "unknown";
      thinking?: "true" | "false" | "unknown";
      video_gen?: "true" | "false" | "unknown";
      context_window?: number | null;
    }
  >;
  source?: string;
  error?: string;
};

function formatCheckedAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 45) return "gerade eben";
  const min = Math.floor(sec / 60);
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 36) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag(en)`;
}

function capabilityBadgeClass(v?: "true" | "false" | "unknown"): string {
  if (v === "true")
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (v === "false") return "border-rose-500/40 bg-rose-500/15 text-rose-300";
  return "border-border/70 bg-muted/30 text-muted-foreground";
}

/** Scriptony Akzent — gleiche Farbe wie Tabs / Rest der App */
const PROVIDER_BADGE_CLASS =
  "border-transparent bg-[#6E59A5] text-white [a&]:hover:bg-[#6E59A5]/90";

function getParsed(s: AISettings): AiSettingsJsonParsed {
  return (s.settings_json_parsed ?? {}) as AiSettingsJsonParsed;
}

function getProviderPrefs(
  parsed: AiSettingsJsonParsed,
  pid: LlmProviderId,
): ProviderProfilePrefs {
  return parsed.provider_profiles?.[pid] ?? {};
}

function inferOllamaUiMode(s: AISettings): OllamaUiMode {
  const base = (s.ollama_base_url && String(s.ollama_base_url).trim()) || "";
  const key = (s.ollama_api_key && String(s.ollama_api_key).trim()) || "";
  const m = getParsed(s).ollama?.mode;
  /** Zuerst Zugangsdaten, dann JSON-Modus — verhindert „cloud“ in settings_json ohne Key bei gesetzter lokaler URL (Badge blieb unkonfiguriert). */
  if (base && !key) return "local";
  if (key && !base) return "cloud";
  if (base && key) return m === "cloud" || m === "local" ? m : "local";
  if (m === "cloud" || m === "local") return m;
  return "local";
}

function initialProviderForm(
  s: AISettings,
): Record<LlmProviderId, { model: string; temp: number; max: number }> {
  const p = getParsed(s);
  const o = {} as Record<
    LlmProviderId,
    { model: string; temp: number; max: number }
  >;
  for (const pid of LLM_PROVIDER_IDS) {
    const pp = getProviderPrefs(p, pid);
    o[pid] = {
      model: pp.model || defaultModelForProvider(pid),
      temp: typeof pp.temperature === "number" ? pp.temperature : s.temperature,
      max: typeof pp.max_tokens === "number" ? pp.max_tokens : s.max_tokens,
    };
  }
  return o;
}

/** Fingerprint of server-backed fields only — avoids refetch resetting drafts / connection test when nothing changed. */
function stableSettingsHydrationSignature(s: AISettings): string {
  const p = getParsed(s);
  return JSON.stringify({
    id: s.id,
    active_provider: s.active_provider,
    active_model: s.active_model,
    temperature: s.temperature,
    max_tokens: s.max_tokens,
    provider_profiles: p.provider_profiles,
    feature_profiles: p.feature_profiles,
    enabled_features: p.enabled_features,
    ollama_json: p.ollama,
    image_enabled: p.image?.enabled_features,
    image_feature_profiles: p.image?.feature_profiles,
    image_provider_models: p.image?.provider_models,
    ollama_base: (s.ollama_base_url && String(s.ollama_base_url).trim()) || "",
    has_openai: Boolean(s.openai_api_key && String(s.openai_api_key).trim()),
    has_anthropic: Boolean(
      s.anthropic_api_key && String(s.anthropic_api_key).trim(),
    ),
    has_google: Boolean(s.google_api_key && String(s.google_api_key).trim()),
    has_openrouter: Boolean(
      s.openrouter_api_key && String(s.openrouter_api_key).trim(),
    ),
    has_deepseek: Boolean(
      s.deepseek_api_key && String(s.deepseek_api_key).trim(),
    ),
    has_ollama_key: Boolean(
      s.ollama_api_key && String(s.ollama_api_key).trim(),
    ),
    settings_json_raw:
      typeof s.settings_json === "string" ? s.settings_json : null,
  });
}

/**
 * feature_profiles.*.model wins over provider_profiles in the Assistant — after changing the
 * provider's model we must update any feature rows pinned to that provider.
 */
function buildFeatureProfileModelSync(
  settings: AISettings,
  pid: LlmProviderId,
  model: string,
):
  | { feature_profiles: Partial<Record<AiFeatureId, { model: string }>> }
  | undefined {
  const parsed = getParsed(settings);
  const m = model.trim();
  if (!m) return undefined;
  const fp: Partial<Record<AiFeatureId, { model: string }>> = {};
  for (const { id: fid } of AI_ROUTABLE_FEATURES) {
    if (
      getEffectiveProviderForFeature(parsed, fid, settings.active_provider) ===
      pid
    ) {
      fp[fid] = { model: m };
    }
  }
  return Object.keys(fp).length > 0 ? { feature_profiles: fp } : undefined;
}

export interface AISettingsFormProps {
  /** When true, load settings on mount (e.g. Settings page). */
  embedded?: boolean;
  /** When not embedded, load when dialog opens. */
  active?: boolean;
  onUpdate?: () => void;
  /** Dialog only: footer “Schließen”. */
  onRequestClose?: () => void;
}

export function AISettingsForm({
  embedded = false,
  active = true,
  onUpdate,
  onRequestClose,
}: AISettingsFormProps) {
  const afterSettingsPersist = useCallback(() => {
    onUpdate?.();
    notifyAiSettingsConsumers();
  }, [onUpdate]);

  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settingsCache, setSettingsCache] = useState<AISettings | null>(null);
  /** Draft API key input per provider (never committed until Speichern). */
  const [keyDrafts, setKeyDrafts] = useState<
    Partial<Record<LlmProviderId, string>>
  >({});
  const [providerForm, setProviderForm] = useState<
    Record<LlmProviderId, { model: string; temp: number; max: number }>
  >(() => {
    const init = {} as Record<
      LlmProviderId,
      { model: string; temp: number; max: number }
    >;
    for (const pid of LLM_PROVIDER_IDS) {
      init[pid] = { model: defaultModelForProvider(pid), temp: 0.7, max: 2000 };
    }
    return init;
  });
  const [ollamaBaseDraft, setOllamaBaseDraft] = useState("");
  const [ollamaModeDraft, setOllamaModeDraft] = useState<OllamaUiMode>("local");
  const [providerListQuery, setProviderListQuery] = useState("");
  const [validateByProvider, setValidateByProvider] = useState<
    Partial<
      Record<
        LlmProviderId,
        {
          ok: boolean;
          models: ModelWithContextRow[];
          source?: string;
          error?: string;
          at: number;
        } | null
      >
    >
  >({});
  const [validatingPid, setValidatingPid] = useState<LlmProviderId | null>(
    null,
  );
  /** Aktiver Image-Provider in settings_json (für Cover-Generate); nach Speichern pro Karte gesetzt. */
  const [imageProviderDraft, setImageProviderDraft] = useState<
    "ollama" | "openrouter"
  >("ollama");
  const [imageOllamaKeyDraft, setImageOllamaKeyDraft] = useState("");
  const [imageOpenrouterKeyDraft, setImageOpenrouterKeyDraft] = useState("");
  type ImageConnState = { ok: boolean; at: number; error?: string } | null;
  const [imageValidationOllama, setImageValidationOllama] =
    useState<ImageConnState>(null);
  const [imageValidationOpenrouter, setImageValidationOpenrouter] =
    useState<ImageConnState>(null);
  const [validatingImageProvider, setValidatingImageProvider] = useState<
    "ollama" | "openrouter" | null
  >(null);
  const [imageModelDraftOllama, setImageModelDraftOllama] =
    useState("gpt-image-1");
  const [imageModelDraftOpenrouter, setImageModelDraftOpenrouter] =
    useState("gpt-image-1");
  const [imageModelsOllama, setImageModelsOllama] = useState<
    ModelWithContextRow[]
  >([]);
  const [imageModelsOpenrouter, setImageModelsOpenrouter] = useState<
    ModelWithContextRow[]
  >([]);
  const [storedOllamaImageApiKey, setStoredOllamaImageApiKey] = useState("");
  const [storedOpenrouterImageApiKey, setStoredOpenrouterImageApiKey] =
    useState("");
  const settingsHydrationSigRef = useRef<string | null>(null);

  const { featureFlags, isAssignedToProvider } =
    useAiProviderFeatureToggles(settings);
  const {
    featureFlags: imageFeatureFlags,
    isOnForProvider: isImageFeatureOnForProvider,
  } = useAiImageProviderFeatureToggles(settings);

  useEffect(() => {
    if (embedded) {
      void loadSettings();
      return;
    }
    if (active) {
      void loadSettings();
    }
  }, [embedded, active]);

  useEffect(() => {
    if (!settings) {
      settingsHydrationSigRef.current = null;
      return;
    }
    const sig = stableSettingsHydrationSignature(settings);
    if (settingsHydrationSigRef.current === sig) return;
    settingsHydrationSigRef.current = sig;
    setProviderForm(initialProviderForm(settings));
    setOllamaBaseDraft(
      (settings.ollama_base_url && String(settings.ollama_base_url).trim()) ||
        "",
    );
    setOllamaModeDraft(inferOllamaUiMode(settings));
    const parsed = getParsed(settings);
    const pm = parsed.image?.provider_models;
    const mo = typeof pm?.ollama === "string" ? pm.ollama.trim() : "";
    const mr = typeof pm?.openrouter === "string" ? pm.openrouter.trim() : "";
    const legacyModel =
      (parsed.image?.model && String(parsed.image.model).trim()) || "";
    const ip =
      parsed.image?.provider === "openrouter" ? "openrouter" : "ollama";
    if (mo) setImageModelDraftOllama(mo);
    else if (legacyModel && ip === "ollama")
      setImageModelDraftOllama(legacyModel);
    if (mr) setImageModelDraftOpenrouter(mr);
    else if (legacyModel && ip === "openrouter")
      setImageModelDraftOpenrouter(legacyModel);
  }, [settings]);

  const loadSettings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // ✅ Use cached settings if available (optimistic UI)
      if (settingsCache) {
        console.log("✅ Using cached settings for instant UI");
        setSettings(settingsCache);
        void loadImageSettings();
        setLoading(false);
        loadSettingsInBackground();
        return;
      }

      // First load: fetch settings
      const result = await apiGet<{ settings?: AISettings }>("/ai/settings");
      if ("error" in result && result.error) {
        setLoadError(
          result.error.message || "Backend konnte nicht erreicht werden.",
        );
        setSettings(null);
        toast.error(
          result.error.message ||
            "KI-Einstellungen konnten nicht geladen werden.",
        );
        return;
      }
      const row = result.data?.settings;
      if (!row) {
        setLoadError(
          "Unerwartete Server-Antwort (kein settings-Objekt). Prüfe, ob scriptony-assistant deployt ist.",
        );
        setSettings(null);
        return;
      }
      setSettings(row);
      setSettingsCache(row);
      await loadImageSettings();
    } catch (error: unknown) {
      console.error("Failed to load settings:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Fehler beim Laden der Einstellungen";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadSettingsInBackground = async () => {
    try {
      console.log("🔄 Refreshing settings in background...");
      const result = await apiGet<{ settings?: AISettings }>("/ai/settings");
      if ("error" in result && result.error) return;
      if (result.data?.settings) {
        setSettings(result.data.settings);
        setSettingsCache(result.data.settings);
      }
      await loadImageSettings();
    } catch (error) {
      console.error("Background refresh failed:", error);
    }
  };

  const loadImageSettings = async () => {
    try {
      const result = await apiGet<{
        settings?: {
          image_provider?: "ollama" | "openrouter";
          ollama_image_api_key?: string | null;
          openrouter_image_api_key?: string | null;
          settings_json?: string | null;
        };
      }>("/ai/image/settings");
      if ("error" in result && result.error) return;
      const row = result.data?.settings;
      const provider =
        row?.image_provider === "openrouter" ? "openrouter" : "ollama";
      setImageProviderDraft(provider);
      setStoredOllamaImageApiKey(row?.ollama_image_api_key?.trim() || "");
      setStoredOpenrouterImageApiKey(
        row?.openrouter_image_api_key?.trim() || "",
      );
      if (typeof row?.settings_json === "string" && row.settings_json.trim()) {
        try {
          const parsedFull = JSON.parse(
            row.settings_json,
          ) as AiSettingsJsonParsed;
          const imageCfg = parsedFull.image;
          if (
            imageCfg?.provider === "openrouter" ||
            imageCfg?.provider === "ollama"
          ) {
            setImageProviderDraft(imageCfg.provider);
          }
          const pm = imageCfg?.provider_models;
          const mo = typeof pm?.ollama === "string" ? pm.ollama.trim() : "";
          const mr =
            typeof pm?.openrouter === "string" ? pm.openrouter.trim() : "";
          const legacyModel =
            typeof imageCfg?.model === "string" ? imageCfg.model.trim() : "";
          const ip =
            imageCfg?.provider === "openrouter" ? "openrouter" : "ollama";
          if (mo) setImageModelDraftOllama(mo);
          else if (legacyModel && ip === "ollama")
            setImageModelDraftOllama(legacyModel);
          if (mr) setImageModelDraftOpenrouter(mr);
          else if (legacyModel && ip === "openrouter")
            setImageModelDraftOpenrouter(legacyModel);
          setSettings((prev) =>
            prev
              ? {
                  ...prev,
                  settings_json: row.settings_json ?? prev.settings_json,
                  settings_json_parsed: parsedFull,
                }
              : prev,
          );
          setSettingsCache((prev) =>
            prev
              ? {
                  ...prev,
                  settings_json: row.settings_json ?? prev.settings_json,
                  settings_json_parsed: parsedFull,
                }
              : prev,
          );
        } catch {
          /* ignore invalid JSON */
        }
      }
    } catch (error) {
      console.error("Failed to load image settings:", error);
    }
  };

  const getProviderKey = (provider: string, s: AISettings) => {
    if (provider === "openai") return s.openai_api_key;
    if (provider === "anthropic") return s.anthropic_api_key;
    if (provider === "google") return s.google_api_key;
    if (provider === "openrouter") return s.openrouter_api_key;
    if (provider === "deepseek") return s.deepseek_api_key;
    if (provider === "ollama") {
      const mode = inferOllamaUiMode(s);
      if (mode === "cloud") {
        const k = (s.ollama_api_key && String(s.ollama_api_key).trim()) || "";
        return k ? "ollama-cloud" : "";
      }
      const b = (s.ollama_base_url && String(s.ollama_base_url).trim()) || "";
      return b ? `ollama:${b}` : "";
    }
    return "";
  };

  const providersWithKeys = (s: AISettings): LlmProviderId[] =>
    LLM_PROVIDER_IDS.filter((pid) => Boolean(getProviderKey(pid, s)));

  const STAGE_MODEL_SUGGESTIONS_LOCAL: { id: string; name: string }[] = [
    { id: "stage-2d-placeholder", name: "2D-Generierung (Platzhalter)" },
    { id: "stage-3d-placeholder", name: "3D-Generierung (Platzhalter)" },
  ];

  const storedApiKey = (pid: LlmProviderId, s: AISettings): string => {
    const f = PROVIDER_KEY_FIELD[pid];
    if (!f) return "";
    const v = s[f];
    return typeof v === "string" ? v.trim() : "";
  };

  const storedOllamaApiSecret = (s: AISettings) =>
    (s.ollama_api_key && String(s.ollama_api_key).trim()) || "";

  /** Test darf mit Entwurf laufen — nicht nur nach Speichern (sonst wirkt der Button tot). */
  const canRunConnectionTest = (pid: LlmProviderId): boolean => {
    if (!settings) return false;
    if (pid === "ollama") {
      if (ollamaModeDraft === "cloud") {
        const k =
          (keyDrafts.ollama ?? "").trim() ||
          (settings.ollama_api_key && String(settings.ollama_api_key).trim()) ||
          "";
        return Boolean(k);
      }
      const base = (
        ollamaBaseDraft.trim() ||
        (settings.ollama_base_url && String(settings.ollama_base_url).trim()) ||
        ""
      ).replace(/\/$/, "");
      return Boolean(base);
    }
    const draft = (keyDrafts[pid] ?? "").trim();
    return Boolean(draft || storedApiKey(pid, settings));
  };

  const runConnectionValidation = async (pid: LlmProviderId) => {
    if (!settings) return;
    setValidatingPid(pid);
    const fail = (msg: string) => {
      setValidateByProvider((prev) => ({
        ...prev,
        [pid]: { ok: false, models: [], error: msg, at: Date.now() },
      }));
      toast.error(msg);
    };
    try {
      if (pid === "ollama") {
        const mode = ollamaModeDraft;
        const body: Record<string, string> = {
          provider: "ollama",
          ollama_mode: mode,
        };
        if (mode === "cloud") {
          const k =
            (keyDrafts.ollama ?? "").trim() ||
            (settings.ollama_api_key &&
              String(settings.ollama_api_key).trim()) ||
            "";
          if (!k) {
            fail("Ollama Cloud: API-Key eingeben oder gespeichert haben.");
            return;
          }
          body.api_key = k;
        } else {
          const base = (
            ollamaBaseDraft.trim() ||
            (settings.ollama_base_url &&
              String(settings.ollama_base_url).trim()) ||
            ""
          ).replace(/\/$/, "");
          if (!base) {
            fail("Ollama lokal: Basis-URL eingeben oder gespeichert haben.");
            return;
          }
          body.base_url = base;
          const k =
            (keyDrafts.ollama ?? "").trim() ||
            (settings.ollama_api_key &&
              String(settings.ollama_api_key).trim()) ||
            "";
          if (k) body.api_key = k;
        }
        const result = await apiPost<ValidateKeySuccess>(
          "/ai/validate-key",
          body,
        );
        if ("error" in result && result.error) {
          fail(result.error.message || "Test fehlgeschlagen");
          return;
        }
        const data = result.data;
        if (data && data.valid === false) {
          fail(
            typeof data.error === "string" ? data.error : "Verbindung ungültig",
          );
          return;
        }
        const rows = Array.isArray(data?.models_with_capabilities)
          ? data.models_with_capabilities.map((m) => ({
              id: m.id || m.model_id || "",
              name: m.name || m.display_name || m.id || m.model_id || "",
              context_window:
                typeof m.context_window === "number" ? m.context_window : 0,
              provider: m.provider,
              image_gen: m.image_gen,
              vision: m.vision,
              tools: m.tools,
              thinking: m.thinking,
              video_gen: m.video_gen,
            }))
          : Array.isArray(data?.models_with_context)
            ? data.models_with_context
            : [];
        setValidateByProvider((prev) => ({
          ...prev,
          [pid]: {
            ok: true,
            models: rows,
            source: data?.source,
            at: Date.now(),
          },
        }));
        toast.success(
          rows.length
            ? `Ollama: ${rows.length} Modelle (${data?.source === "remote" ? "API" : "Fallback-Liste"})`
            : "Ollama: Verbindung ok",
        );
        return;
      }

      const key = (keyDrafts[pid] ?? "").trim() || storedApiKey(pid, settings);
      if (!key) {
        fail("API-Key eingeben oder gespeichert haben.");
        return;
      }
      const result = await apiPost<ValidateKeySuccess>("/ai/validate-key", {
        provider: pid,
        api_key: key,
      });
      if ("error" in result && result.error) {
        fail(result.error.message || "Test fehlgeschlagen");
        return;
      }
      const data = result.data;
      if (data && data.valid === false) {
        fail(typeof data.error === "string" ? data.error : "API-Key ungültig");
        return;
      }
      const rows = Array.isArray(data?.models_with_capabilities)
        ? data.models_with_capabilities.map((m) => ({
            id: m.id || m.model_id || "",
            name: m.name || m.display_name || m.id || m.model_id || "",
            context_window:
              typeof m.context_window === "number" ? m.context_window : 0,
            provider: m.provider,
            image_gen: m.image_gen,
            vision: m.vision,
            tools: m.tools,
            thinking: m.thinking,
            video_gen: m.video_gen,
          }))
        : Array.isArray(data?.models_with_context)
          ? data.models_with_context
          : [];
      setValidateByProvider((prev) => ({
        ...prev,
        [pid]: { ok: true, models: rows, source: data?.source, at: Date.now() },
      }));
      toast.success(
        rows.length
          ? `${PROVIDER_NAMES[pid]}: ${rows.length} Modelle (${data?.source === "remote" ? "API" : "Fallback-Liste"})`
          : `${PROVIDER_NAMES[pid]}: Key ok`,
      );
    } finally {
      setValidatingPid(null);
    }
  };

  const getImageApiKeyForProvider = (pid: ImageProviderId): string =>
    (pid === "openrouter"
      ? imageOpenrouterKeyDraft
      : imageOllamaKeyDraft
    ).trim() ||
    (pid === "openrouter"
      ? storedOpenrouterImageApiKey
      : storedOllamaImageApiKey);

  const toggleImageFeatureForProvider = async (
    pid: ImageProviderId,
    fid: ImageFeatureId,
    turnOn: boolean,
  ) => {
    if (!settings) return;
    const parsed = getParsed(settings);
    if (turnOn) {
      const key = getImageApiKeyForProvider(pid);
      if (!key) {
        toast.error(
          "Zuerst Image API-Key für diesen Anbieter eintragen oder speichern.",
        );
        return;
      }
      const validation =
        pid === "openrouter"
          ? imageValidationOpenrouter
          : imageValidationOllama;
      const models =
        pid === "openrouter" ? imageModelsOpenrouter : imageModelsOllama;
      const modelDraft =
        pid === "openrouter"
          ? imageModelDraftOpenrouter
          : imageModelDraftOllama;
      if (!validation?.ok) {
        toast.error(
          "Bitte zuerst „Verbindung testen“ für diesen Image-Anbieter.",
        );
        return;
      }
      if (
        models.length === 0 ||
        !modelDraft ||
        !models.some((m) => m.id === modelDraft)
      ) {
        toast.error(
          "Bitte gültiges Image-Modell wählen (nach Verbindungstest).",
        );
        return;
      }
      const curEf = parsed.image?.enabled_features;
      const nextEf: ImageFeatureId[] =
        curEf === undefined
          ? ["cover", "stage2d"]
          : curEf.includes(fid)
            ? [...curEf]
            : [...curEf, fid];
      setSaving(true);
      try {
        const result = await apiPut("/ai/image/settings", {
          settings_json: {
            image: {
              feature_profiles: {
                [fid]: { provider: pid, model: modelDraft.trim() },
              },
              enabled_features: nextEf,
            },
          },
        });
        if ("error" in result && result.error) {
          toast.error(
            result.error.message || "Routing speichern fehlgeschlagen",
          );
          return;
        }
        await loadImageSettings();
        afterSettingsPersist();
        toast.success(
          `${fid === "cover" ? "Cover" : "2DStage"} nutzt jetzt ${pid === "ollama" ? "Ollama" : "OpenRouter"}.`,
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const routed = getRoutedImageProviderForFeature(parsed, fid);
    const eff = getEffectiveImageProviderForFeature(parsed, fid);
    if (routed === pid) {
      setSaving(true);
      try {
        const result = await apiPut("/ai/image/settings", {
          settings_json: {
            image: {
              feature_profiles: { [fid]: null },
            },
          },
        });
        if ("error" in result && result.error) {
          toast.error(
            result.error.message || "Routing speichern fehlgeschlagen",
          );
          return;
        }
        await loadImageSettings();
        afterSettingsPersist();
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!routed && eff === pid) {
      const curEf = parsed.image?.enabled_features;
      const base: ImageFeatureId[] =
        curEf === undefined ? ["cover", "stage2d"] : [...curEf];
      const nextEf = base.filter((x) => x !== fid);
      setSaving(true);
      try {
        const result = await apiPut("/ai/image/settings", {
          settings_json: {
            image: {
              enabled_features: nextEf.length > 0 ? nextEf : [],
            },
          },
        });
        if ("error" in result && result.error) {
          toast.error(result.error.message || "Speichern fehlgeschlagen");
          return;
        }
        await loadImageSettings();
        afterSettingsPersist();
      } finally {
        setSaving(false);
      }
    }
  };

  const toggleFeatureForProvider = async (
    pid: LlmProviderId,
    fid: AiFeatureId,
    turnOn: boolean,
  ) => {
    if (!settings) return;
    if (!getProviderKey(pid, settings)) {
      toast.error(
        "Zuerst Anbieter konfigurieren (API-Key bzw. Ollama lokal oder Cloud).",
      );
      return;
    }
    const pf = providerForm[pid] ?? {
      model: defaultModelForProvider(pid),
      temp: settings.temperature,
      max: settings.max_tokens,
    };
    if (turnOn) {
      await saveFeatureRouting(fid, pid, pf.model);
    } else {
      const cur = getRoutedProviderForFeature(getParsed(settings), fid);
      if (cur === pid) await saveFeatureRouting(fid, FEATURE_DEFAULT, "");
    }
  };

  const saveOllamaConnection = async (prefs: {
    model: string;
    temperature: number;
    max_tokens: number;
  }) => {
    if (!settings) return;
    setSaving(true);
    try {
      const profileBlock = {
        provider_profiles: {
          ollama: {
            model: prefs.model,
            temperature: prefs.temperature,
            max_tokens: prefs.max_tokens,
          },
        },
      };

      if (ollamaModeDraft === "cloud") {
        const keyCombined =
          (keyDrafts.ollama ?? "").trim() ||
          (settings.ollama_api_key && String(settings.ollama_api_key).trim()) ||
          "";
        if (!keyCombined) {
          toast.error("Ollama Cloud: API-Key eintragen (ollama.com → Keys).");
          setSaving(false);
          return;
        }
        const fpSync = buildFeatureProfileModelSync(
          settings,
          "ollama",
          prefs.model,
        );
        const result = await apiPut("/ai/settings", {
          ollama_base_url: "",
          ollama_api_key: keyCombined,
          active_provider: "ollama",
          active_model: prefs.model,
          temperature: prefs.temperature,
          max_tokens: prefs.max_tokens,
          settings_json: {
            ollama: { mode: "cloud" },
            ...profileBlock,
            ...(fpSync ?? {}),
          },
        });
        if ("error" in result && result.error) {
          toast.error(result.error.message || "Speichern fehlgeschlagen");
          return;
        }
        if (result.data?.settings) {
          setSettings(result.data.settings);
          setSettingsCache(result.data.settings);
          setKeyDrafts((d) => ({ ...d, ollama: "" }));
          afterSettingsPersist();
          toast.success("Ollama Cloud gespeichert");
        }
        return;
      }

      const base = ollamaBaseDraft.trim().replace(/\/$/, "");
      if (!base) {
        toast.error(
          "Ollama-Basis-URL eintragen (z. B. http://localhost:11434)",
        );
        setSaving(false);
        return;
      }
      const keyPart = (keyDrafts.ollama ?? "").trim();
      const fpSync = buildFeatureProfileModelSync(
        settings,
        "ollama",
        prefs.model,
      );
      const result = await apiPut("/ai/settings", {
        ollama_base_url: base,
        ollama_api_key: keyPart || null,
        active_provider: "ollama",
        active_model: prefs.model,
        temperature: prefs.temperature,
        max_tokens: prefs.max_tokens,
        settings_json: {
          ollama: { mode: "local" },
          ...profileBlock,
          ...(fpSync ?? {}),
        },
      });
      if ("error" in result && result.error) {
        toast.error(result.error.message || "Speichern fehlgeschlagen");
        return;
      }
      if (result.data?.settings) {
        setSettings(result.data.settings);
        setSettingsCache(result.data.settings);
        setKeyDrafts((d) => ({ ...d, ollama: "" }));
        afterSettingsPersist();
        toast.success("Ollama-Verbindung gespeichert");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  /** Save new or replacement API key + per-provider model prefs; sets global active provider to this one. */
  const saveProviderKeyAndPrefs = async (
    pid: LlmProviderId,
    apiKey: string,
    prefs: { model: string; temperature: number; max_tokens: number },
  ) => {
    if (pid === "ollama") {
      await saveOllamaConnection(prefs);
      return;
    }
    if (!settings || !apiKey.trim()) {
      toast.error("Bitte API-Key eintragen");
      return;
    }
    setSaving(true);
    try {
      const keyField = `${pid}_api_key`;
      const fpSync = buildFeatureProfileModelSync(settings, pid, prefs.model);
      const result = await apiPut("/ai/settings", {
        [keyField]: apiKey.trim(),
        active_provider: pid,
        active_model: prefs.model,
        temperature: prefs.temperature,
        max_tokens: prefs.max_tokens,
        settings_json: {
          provider_profiles: {
            [pid]: {
              model: prefs.model,
              temperature: prefs.temperature,
              max_tokens: prefs.max_tokens,
            },
          },
          ...(fpSync ?? {}),
        },
      });
      if ("error" in result && result.error) {
        toast.error(result.error.message || "Speichern fehlgeschlagen");
        return;
      }
      if (result.data?.settings) {
        setSettings(result.data.settings);
        setSettingsCache(result.data.settings);
        setKeyDrafts((d) => ({ ...d, [pid]: "" }));
        afterSettingsPersist();
        toast.success(`${PROVIDER_NAMES[pid]}: Key und Modell gespeichert`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  /** Update only model/temp/max for a provider that already has a key. */
  const saveProviderPrefsOnly = async (
    pid: LlmProviderId,
    prefs: { model: string; temperature: number; max_tokens: number },
  ) => {
    if (!settings) return;
    if (!getProviderKey(pid, settings)) return;
    setSaving(true);
    try {
      const fpSync = buildFeatureProfileModelSync(settings, pid, prefs.model);
      const body: Record<string, unknown> = {
        settings_json: {
          provider_profiles: {
            [pid]: {
              model: prefs.model,
              temperature: prefs.temperature,
              max_tokens: prefs.max_tokens,
            },
          },
          ...(fpSync ?? {}),
        },
      };
      if (settings.active_provider === pid) {
        body.active_model = prefs.model;
        body.temperature = prefs.temperature;
        body.max_tokens = prefs.max_tokens;
      }
      const result = await apiPut("/ai/settings", body);
      if ("error" in result && result.error) {
        toast.error(result.error.message || "Speichern fehlgeschlagen");
        return;
      }
      if (result.data?.settings) {
        setSettings(result.data.settings);
        setSettingsCache(result.data.settings);
        afterSettingsPersist();
        toast.success(`${PROVIDER_NAMES[pid]}: Modell aktualisiert`);
      }
    } finally {
      setSaving(false);
    }
  };

  const switchActiveProvider = async (pid: LlmProviderId) => {
    if (!settings) return;
    const apiKey = getProviderKey(pid, settings);
    if (!apiKey) {
      toast.error(
        pid === "ollama"
          ? "Ollama: zuerst lokale URL oder Cloud-Key speichern"
          : "Kein API-Key für diesen Anbieter",
      );
      return;
    }
    const parsed = getParsed(settings);
    const prefs = getProviderPrefs(parsed, pid);
    const model = prefs.model || defaultModelForProvider(pid);
    const temp =
      typeof prefs.temperature === "number"
        ? prefs.temperature
        : settings.temperature;
    const maxT =
      typeof prefs.max_tokens === "number"
        ? prefs.max_tokens
        : settings.max_tokens;
    setSaving(true);
    try {
      const result = await apiPut("/ai/settings", {
        active_provider: pid,
        active_model: model,
        temperature: temp,
        max_tokens: maxT,
      });
      if ("error" in result && result.error) {
        toast.error(result.error.message || "Fehler");
        return;
      }
      if (result.data?.settings) {
        setSettings(result.data.settings);
        setSettingsCache(result.data.settings);
        afterSettingsPersist();
        toast.success(`Standard-Anbieter: ${PROVIDER_NAMES[pid]}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const removeApiKey = async (provider: string) => {
    if (
      !confirm(
        `Möchtest du die Zugangsdaten für ${PROVIDER_NAMES[provider]} wirklich entfernen?`,
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      if (provider === "ollama") {
        await apiPut("/ai/settings", {
          ollama_base_url: "",
          ollama_api_key: "",
          settings_json: { provider_profiles: { ollama: null }, ollama: null },
        });
      } else {
        const keyField = `${provider}_api_key`;
        await apiPut("/ai/settings", {
          [keyField]: null,
          settings_json: {
            provider_profiles: { [provider as LlmProviderId]: null },
          },
        });
      }
      setValidateByProvider((prev) => {
        const next = { ...prev };
        delete next[provider as LlmProviderId];
        return next;
      });
      await loadSettings();
      toast.success("Entfernt");
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Entfernen");
    } finally {
      setSaving(false);
    }
  };

  const saveFeatureRouting = async (
    fid: AiFeatureId,
    providerChoice: string,
    modelId: string,
  ) => {
    if (!settings) return;
    setSaving(true);
    try {
      if (providerChoice === FEATURE_DEFAULT) {
        const result = await apiPut("/ai/settings", {
          settings_json: { feature_profiles: { [fid]: null } },
        });
        if ("error" in result && result.error) {
          toast.error(result.error.message || "Speichern fehlgeschlagen");
          return;
        }
        if (result.data?.settings) {
          setSettings(result.data.settings);
          setSettingsCache(result.data.settings);
          afterSettingsPersist();
          toast.success("Bereich nutzt wieder das globale Standard-Modell");
        }
        return;
      }
      const pid = providerChoice as LlmProviderId;
      if (!getProviderKey(pid, settings)) {
        toast.error("Für diesen Anbieter ist kein API-Key hinterlegt");
        return;
      }
      const m = modelId.trim() || defaultModelForProvider(pid);
      const result = await apiPut("/ai/settings", {
        settings_json: {
          feature_profiles: {
            [fid]: { provider: pid, model: m },
          },
        },
      });
      if ("error" in result && result.error) {
        toast.error(result.error.message || "Speichern fehlgeschlagen");
        return;
      }
      if (result.data?.settings) {
        setSettings(result.data.settings);
        setSettingsCache(result.data.settings);
        afterSettingsPersist();
        toast.success("Zuweisung gespeichert");
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredProviderIds = useMemo(() => {
    const qq = providerListQuery.trim().toLowerCase();
    const base = !qq
      ? [...LLM_PROVIDER_IDS]
      : LLM_PROVIDER_IDS.filter(
          (pid) =>
            pid.toLowerCase().includes(qq) ||
            PROVIDER_NAMES[pid].toLowerCase().includes(qq),
        );
    if (!settings) return base;

    const orderIndex = (pid: LlmProviderId) => LLM_PROVIDER_IDS.indexOf(pid);
    return [...base].sort((a, b) => {
      const ca = Boolean(getProviderKey(a, settings));
      const cb = Boolean(getProviderKey(b, settings));
      if (ca !== cb) return ca ? -1 : 1;
      return orderIndex(a) - orderIndex(b);
    });
  }, [providerListQuery, settings]);

  const runImageConnectionValidation = async (
    provider: "ollama" | "openrouter",
  ) => {
    const key =
      (provider === "openrouter"
        ? imageOpenrouterKeyDraft
        : imageOllamaKeyDraft
      ).trim() ||
      (provider === "openrouter"
        ? storedOpenrouterImageApiKey
        : storedOllamaImageApiKey);
    if (!key) {
      toast.error(
        provider === "openrouter"
          ? "OpenRouter Image API-Key eingeben oder gespeichert haben."
          : "Ollama Image API-Key eingeben oder gespeichert haben.",
      );
      return;
    }
    setValidatingImageProvider(provider);
    const setValidation =
      provider === "openrouter"
        ? setImageValidationOpenrouter
        : setImageValidationOllama;
    try {
      const result = await apiPost<{
        valid?: boolean;
        error?: string;
        models_with_context?: ModelWithContextRow[];
        models_with_capabilities?: Array<
          ModelWithContextRow & {
            model_id?: string;
            display_name?: string;
            image_gen?: "true" | "false" | "unknown";
            vision?: "true" | "false" | "unknown";
            tools?: "true" | "false" | "unknown";
            thinking?: "true" | "false" | "unknown";
            video_gen?: "true" | "false" | "unknown";
            provider?: string;
            context_window?: number | null;
          }
        >;
      }>("/ai/image/validate-key", { provider, api_key: key });
      if ("error" in result && result.error) {
        setValidation({
          ok: false,
          at: Date.now(),
          error: result.error.message || "Test fehlgeschlagen",
        });
        toast.error(result.error.message || "Image-Key Test fehlgeschlagen");
        return;
      }
      if (result.data?.valid === false) {
        const msg = result.data.error || "Image-Key ungültig";
        setValidation({ ok: false, at: Date.now(), error: msg });
        toast.error(msg);
        return;
      }
      const withCaps = Array.isArray(result.data?.models_with_capabilities)
        ? result.data.models_with_capabilities
        : [];
      const rows = withCaps.length
        ? withCaps.map((m) => ({
            id: m.id || m.model_id || "",
            name: m.name || m.display_name || m.id || m.model_id || "",
            context_window:
              typeof m.context_window === "number" ? m.context_window : 0,
            provider: m.provider,
            image_gen: m.image_gen,
            vision: m.vision,
            tools: m.tools,
            thinking: m.thinking,
            video_gen: m.video_gen,
          }))
        : Array.isArray(result.data?.models_with_context)
          ? result.data.models_with_context
          : [];
      if (provider === "openrouter") {
        setImageModelsOpenrouter(rows);
        if (rows.length > 0) {
          setImageModelDraftOpenrouter((prev) =>
            rows.some((m) => m.id === prev) ? prev : rows[0].id,
          );
        } else {
          setImageModelDraftOpenrouter("");
        }
      } else {
        setImageModelsOllama(rows);
        if (rows.length > 0) {
          setImageModelDraftOllama((prev) =>
            rows.some((m) => m.id === prev) ? prev : rows[0].id,
          );
        } else {
          setImageModelDraftOllama("");
        }
      }
      setValidation({ ok: true, at: Date.now() });
      toast.success(
        rows.length
          ? `Image-Key ok · ${rows.length} Modelle geladen`
          : "Image Key ist gültig.",
      );
    } finally {
      setValidatingImageProvider(null);
    }
  };

  const saveImageSettings = async (provider: ImageProviderId) => {
    if (!settings) return;
    const key =
      (provider === "openrouter"
        ? imageOpenrouterKeyDraft
        : imageOllamaKeyDraft
      ).trim() ||
      (provider === "openrouter"
        ? storedOpenrouterImageApiKey
        : storedOllamaImageApiKey);
    if (!key) {
      toast.error(
        provider === "openrouter"
          ? "Bitte OpenRouter Image API-Key eintragen."
          : "Bitte Ollama Image API-Key eintragen.",
      );
      return;
    }
    const validation =
      provider === "openrouter"
        ? imageValidationOpenrouter
        : imageValidationOllama;
    const models =
      provider === "openrouter" ? imageModelsOpenrouter : imageModelsOllama;
    const modelDraft =
      provider === "openrouter"
        ? imageModelDraftOpenrouter
        : imageModelDraftOllama;
    if (!validation?.ok) {
      toast.error(
        "Bitte zuerst „Verbindung testen“ für diesen Anbieter ausführen.",
      );
      return;
    }
    if (models.length === 0) {
      toast.error(
        "Keine Image-Modelle geladen. Bitte Verbindung erneut testen.",
      );
      return;
    }
    if (!models.some((m) => m.id === modelDraft)) {
      toast.error(
        "Modell nicht in der Liste. Bitte „Verbindung testen“ und Modell wählen.",
      );
      return;
    }
    setSaving(true);
    try {
      const parsedIm = getParsed(settings);
      const prevEf = parsedIm.image?.enabled_features;
      const enabled_features: Array<"cover" | "stage2d"> =
        prevEf === undefined ? ["cover", "stage2d"] : [...prevEf];
      const provider_models = {
        ...(parsedIm.image?.provider_models ?? {}),
        [provider]: modelDraft.trim() || "gpt-image-1",
      };
      const result = await apiPut<{
        settings?: {
          ollama_image_api_key?: string | null;
          openrouter_image_api_key?: string | null;
        };
      }>("/ai/image/settings", {
        image_provider: provider,
        ...(provider === "openrouter"
          ? { openrouter_image_api_key: key }
          : { ollama_image_api_key: key }),
        settings_json: {
          image: {
            provider,
            model: modelDraft.trim() || "gpt-image-1",
            enabled_features,
            provider_models,
            ...(provider === "ollama" ? { ollama: { mode: "cloud" } } : {}),
          },
        },
      });
      if ("error" in result && result.error) {
        toast.error(
          result.error.message ||
            "Image-Einstellungen konnten nicht gespeichert werden",
        );
        return;
      }
      if (result.data?.settings) {
        const verify = await apiGet<{
          settings?: {
            ollama_image_api_key?: string | null;
            openrouter_image_api_key?: string | null;
          };
        }>("/ai/image/settings");
        if ("error" in verify && verify.error) {
          toast.error(
            verify.error.message ||
              "Image-Key gespeichert, aber Verifikation fehlgeschlagen.",
          );
          return;
        }
        const verifiedSettings = verify.data?.settings;
        const persistedKey =
          verifiedSettings &&
          (provider === "openrouter"
            ? typeof verifiedSettings.openrouter_image_api_key === "string"
            : typeof verifiedSettings.ollama_image_api_key === "string")
            ? String(
                provider === "openrouter"
                  ? verifiedSettings.openrouter_image_api_key
                  : verifiedSettings.ollama_image_api_key,
              ).trim()
            : "";
        if (!persistedKey) {
          toast.error(
            "API-Key wurde nicht persistiert. Bitte Image Function neu deployen und erneut speichern.",
          );
          return;
        }
        setImageProviderDraft(provider);
        if (provider === "openrouter") {
          setStoredOpenrouterImageApiKey(persistedKey);
          setImageOpenrouterKeyDraft("");
        } else {
          setStoredOllamaImageApiKey(persistedKey);
          setImageOllamaKeyDraft("");
        }
        await loadImageSettings();
        afterSettingsPersist();
        toast.success(
          provider === "openrouter"
            ? "OpenRouter Image gespeichert"
            : "Ollama Image gespeichert",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-border bg-muted/20 py-12">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs">KI-Einstellungen werden geladen…</span>
        </div>
      </div>
    );
  }

  if (loadError && !settings) {
    let assistantHealthUrl: string | null;
    let assistantSettingsUrl: string | null;
    try {
      assistantHealthUrl = buildFunctionRouteUrl(
        BACKEND_FUNCTIONS.ASSISTANT,
        "/health",
      );
      assistantSettingsUrl = buildFunctionRouteUrl(
        BACKEND_FUNCTIONS.ASSISTANT,
        "/ai/settings",
      );
    } catch {
      assistantHealthUrl = null;
      assistantSettingsUrl = null;
    }
    const backendOk = isBackendConfigured();
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-3">
          <p className="font-medium">{loadError}</p>
          {!backendOk ? (
            <p className="text-xs opacity-90">
              Backend nicht konfiguriert: setze in{" "}
              <code className="rounded bg-muted px-1 py-0.5">.env.local</code>{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                VITE_APPWRITE_FUNCTIONS_BASE_URL
              </code>{" "}
              (oder{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                VITE_BACKEND_API_BASE_URL
              </code>
              ) und/oder{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                VITE_BACKEND_FUNCTION_DOMAIN_MAP
              </code>{" "}
              — siehe{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                .env.local.example
              </code>
              .
            </p>
          ) : null}
          {backendOk && !assistantHealthUrl ? (
            <p className="text-xs opacity-90">
              Für{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                scriptony-assistant
              </code>{" "}
              fehlt die Basis-URL: ergänze den Key in{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                VITE_BACKEND_FUNCTION_DOMAIN_MAP
              </code>{" "}
              oder ein Gateway, das{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                …/scriptony-assistant/*
              </code>{" "}
              ausliefert.
            </p>
          ) : null}
          {assistantHealthUrl ? (
            <div className="text-xs space-y-1 rounded-md border border-destructive/30 bg-background/80 p-2 font-mono">
              <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                Aufgelöste URLs (Vite)
              </p>
              <p className="break-all">
                <span className="text-muted-foreground">Health: </span>
                {assistantHealthUrl}
              </p>
              {assistantSettingsUrl ? (
                <p className="break-all">
                  <span className="text-muted-foreground">Settings: </span>
                  {assistantSettingsUrl}
                </p>
              ) : null}
              <p className="text-[0.65rem] text-muted-foreground pt-1 font-sans leading-relaxed">
                <strong className="text-foreground/90">Kurzcheck:</strong>{" "}
                Health-URL sollte JSON mit{" "}
                <code className="rounded bg-muted px-0.5">
                  scriptony-assistant
                </code>{" "}
                liefern. HTML/404 → Function nicht deployt oder falsche Domain.{" "}
                <strong>„Failed to fetch“</strong> oft: (1) CORS auf
                Fehlerseiten, (2) <strong>Mixed Content</strong> — die App läuft
                auf <strong>https://</strong>, die Function nur auf{" "}
                <strong>http://</strong> → Browser blockiert; dann HTTPS für die
                Function-Domain oder die App lokal nur unter http testen.
              </p>
            </div>
          ) : null}
          <p className="text-xs opacity-90">
            Prüfung:{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              npm run verify:test-env
            </code>{" "}
            (prüft u. a.{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              scriptony-assistant/health
            </code>
            , wenn die URL ermittelbar ist).
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/40"
            onClick={() => void loadSettings()}
          >
            Erneut laden
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!settings) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Keine Einstellungen geladen.</AlertDescription>
      </Alert>
    );
  }

  const imageModelOptionsOllama = imageModelsOllama.map((m) => ({
    id: m.id,
    name: m.name || m.id,
    image_gen: m.image_gen,
    vision: m.vision,
    tools: m.tools,
    thinking: m.thinking,
    video_gen: m.video_gen,
  }));
  const imageModelOptionsOpenrouter = imageModelsOpenrouter.map((m) => ({
    id: m.id,
    name: m.name || m.id,
    image_gen: m.image_gen,
    vision: m.vision,
    tools: m.tools,
    thinking: m.thinking,
    video_gen: m.video_gen,
  }));

  return (
    <div className={embedded ? "space-y-4" : "flex min-h-0 flex-1 flex-col"}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mt-0 flex-1 space-y-8 overflow-y-auto">
          <section className="flex flex-col gap-3">
            <div className="px-1">
              <div
                className={cn(
                  "relative h-9 w-full max-w-md rounded-md border-2 border-border bg-input-background",
                  "transition-[color,box-shadow] dark:bg-input/30",
                  "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ring/50",
                )}
              >
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id="ai-provider-search"
                  type="text"
                  data-slot="input"
                  autoComplete="off"
                  aria-label="Anbieter filtern"
                  title="Anbieter filtern"
                  className={cn(
                    "box-border h-full w-full min-w-0 rounded-md border-0 bg-transparent py-0 pl-11 pr-3 text-sm outline-none",
                    "selection:bg-primary selection:text-primary-foreground",
                  )}
                  placeholder=""
                  value={providerListQuery}
                  onChange={(e) => setProviderListQuery(e.target.value)}
                />
              </div>
            </div>
            {filteredProviderIds.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">
                Kein Anbieter passt zur Suche.
              </p>
            ) : null}
            {filteredProviderIds.map((pid) => {
              const saved = getProviderKey(pid, settings);
              const draft = keyDrafts[pid] ?? "";
              const pf = providerForm[pid] ?? {
                model: defaultModelForProvider(pid),
                temp: settings.temperature,
                max: settings.max_tokens,
              };
              const masked =
                saved &&
                (pid === "ollama"
                  ? inferOllamaUiMode(settings) === "cloud"
                    ? `Cloud · ***${String(settings.ollama_api_key).slice(-4)}`
                    : `${String(settings.ollama_base_url).slice(0, 28)}…`
                  : pid === "google"
                    ? `AIza***${saved.slice(-4)}`
                    : pid === "anthropic"
                      ? `sk-ant-***${saved.slice(-4)}`
                      : pid === "openrouter"
                        ? `sk-or-***${saved.slice(-4)}`
                        : `sk-***${saved.slice(-4)}`);
              const modelsListUnlocked = validateByProvider[pid]?.ok === true;
              let modelChoices = modelsListUnlocked
                ? (validateByProvider[pid]?.models ?? []).map((m) => ({
                    id: m.id,
                    name: m.name || m.id,
                  }))
                : [];
              if (modelsListUnlocked) {
                modelChoices = [
                  ...modelChoices,
                  ...STAGE_MODEL_SUGGESTIONS_LOCAL,
                ];
              }
              if (
                modelsListUnlocked &&
                pf.model &&
                !modelChoices.some((m) => m.id === pf.model)
              ) {
                modelChoices = [
                  ...modelChoices,
                  { id: pf.model, name: `${pf.model} (aktuell)` },
                ];
              }
              /** Grün + Puls, sobald Zugangsdaten gespeichert sind (Key/URL/Ollama). */
              const showLiveBadge = saved;
              return (
                <details
                  key={pid}
                  className="group rounded-lg border border-border bg-card/60 open:bg-card/80"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-0 px-3 py-3 [&::-webkit-details-marker]:hidden">
                    <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-x-5">
                      <div className="flex min-w-0 max-w-full shrink-0 items-center gap-3">
                        {saved ? (
                          <span
                            style={{
                              backgroundColor: "#059669",
                              color: "#ffffff",
                              borderColor: "transparent",
                            }}
                            className={cn(
                              "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium leading-none",
                              "shadow-sm",
                              showLiveBadge &&
                                "animate-[pulse_1.1s_ease-in-out_infinite] shadow-[0_0_0_2px_rgba(16,185,129,0.22)]",
                            )}
                          >
                            {PROVIDER_NAMES[pid]}
                          </span>
                        ) : (
                          <Badge
                            variant="default"
                            className={cn(
                              PROVIDER_BADGE_CLASS,
                              "text-xs font-medium",
                            )}
                          >
                            {PROVIDER_NAMES[pid]}
                          </Badge>
                        )}
                        {saved ? (
                          <span className="max-w-[200px] truncate text-xs font-mono leading-none text-muted-foreground sm:max-w-[280px]">
                            {masked}
                          </span>
                        ) : (
                          <span className="text-xs leading-none text-muted-foreground">
                            nicht konfiguriert
                          </span>
                        )}
                      </div>
                      <ProviderFeatureToggleBadges
                        providerId={pid}
                        featureFlags={featureFlags}
                        isOnForProvider={(hid) =>
                          isAssignedToProvider(pid, hid)
                        }
                        disabled={saving}
                        onToggle={(hid, v) => {
                          void toggleFeatureForProvider(pid, hid, v);
                        }}
                        className="w-full max-w-full border-l-0 pl-0 md:w-auto md:shrink-0 md:border-l md:border-border/60 md:pl-4"
                      />
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-1 border-l border-border/60 pl-3">
                      {saved && settings.active_provider !== pid ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          disabled={saving}
                          onClick={(ev) => {
                            ev.preventDefault();
                            void switchActiveProvider(pid);
                          }}
                        >
                          Als Standard
                        </Button>
                      ) : null}
                      {saved ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={saving}
                          onClick={(ev) => {
                            ev.preventDefault();
                            void removeApiKey(pid);
                          }}
                          aria-label={`${PROVIDER_NAMES[pid]} entfernen`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <ChevronDown
                        aria-hidden
                        className="pointer-events-none h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                      />
                    </div>
                  </summary>
                  <div className="space-y-3 border-t border-border/60 px-3 pb-4 pt-3">
                    {pid === "ollama" ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Verbindung</Label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                ollamaModeDraft === "local"
                                  ? "default"
                                  : "outline"
                              }
                              disabled={saving}
                              onClick={(e) => {
                                e.preventDefault();
                                setOllamaModeDraft("local");
                              }}
                            >
                              Lokal
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                ollamaModeDraft === "cloud"
                                  ? "default"
                                  : "outline"
                              }
                              disabled={saving}
                              onClick={(e) => {
                                e.preventDefault();
                                setOllamaModeDraft("cloud");
                              }}
                            >
                              Cloud
                            </Button>
                          </div>
                          <p className="text-[0.7rem] leading-snug text-muted-foreground">
                            {ollamaModeDraft === "local"
                              ? "Eigener Ollama-Host (z. B. localhost:11434). Key nur nötig, wenn dein Server einen verlangt."
                              : "Ollama Cloud: Es gibt keine Basis-URL — der Host ist fest (ollama.com), die App speichert auch keinen. Du trägst nur den API-Key ein."}
                          </p>
                        </div>
                        {ollamaModeDraft === "local" ? (
                          <div className="space-y-2">
                            <Label
                              htmlFor={`ollama-base-${pid}`}
                              className="text-xs"
                            >
                              Basis-URL
                            </Label>
                            <Input
                              id={`ollama-base-${pid}`}
                              type="url"
                              autoComplete="off"
                              placeholder="http://localhost:11434"
                              value={ollamaBaseDraft}
                              onChange={(e) =>
                                setOllamaBaseDraft(e.target.value)
                              }
                            />
                            <Label htmlFor={`key-${pid}`} className="text-xs">
                              API-Key (optional)
                            </Label>
                            <ProviderSecretInput
                              id={`key-${pid}`}
                              draft={draft}
                              onDraftChange={(v) =>
                                setKeyDrafts((d) => ({ ...d, [pid]: v }))
                              }
                              storedSecret={storedOllamaApiSecret(settings)}
                              disabled={saving}
                              placeholder={
                                saved
                                  ? "Neuen Key setzen oder leer lassen"
                                  : "Leer lassen, wenn kein Auth"
                              }
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor={`key-${pid}`} className="text-xs">
                              API-Key (Ollama Cloud)
                            </Label>
                            <p className="text-[0.65rem] leading-snug text-muted-foreground">
                              Keine Basis-URL nötig — Verbindungstest und Chat
                              nutzen serverseitig den festen Cloud-Host.
                            </p>
                            <ProviderSecretInput
                              id={`key-${pid}`}
                              draft={draft}
                              onDraftChange={(v) =>
                                setKeyDrafts((d) => ({ ...d, [pid]: v }))
                              }
                              storedSecret={storedOllamaApiSecret(settings)}
                              disabled={saving}
                              placeholder={
                                saved
                                  ? "Neuen Key setzen oder leer lassen"
                                  : "Key von ollama.com"
                              }
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor={`key-${pid}`} className="text-xs">
                          API-Key
                        </Label>
                        <ProviderSecretInput
                          id={`key-${pid}`}
                          draft={draft}
                          onDraftChange={(v) =>
                            setKeyDrafts((d) => ({ ...d, [pid]: v }))
                          }
                          storedSecret={storedApiKey(pid, settings)}
                          disabled={saving}
                          placeholder={
                            saved
                              ? "Neuen Key zum Ersetzen eintragen"
                              : "Key eintragen"
                          }
                        />
                      </div>
                    )}
                    <div className="flex flex-col items-start gap-1 border-t border-border/40 pt-3">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="shrink-0"
                        disabled={
                          saving ||
                          validatingPid === pid ||
                          !canRunConnectionTest(pid)
                        }
                        onClick={() => void runConnectionValidation(pid)}
                      >
                        {validatingPid === pid ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Test…
                          </>
                        ) : (
                          "Verbindung testen"
                        )}
                      </Button>
                      <p className="max-w-md text-[0.65rem] leading-snug text-muted-foreground">
                        Test nutzt den eingetragenen Key (oder den
                        gespeicherten). Modellauswahl und Tabelle erscheinen
                        nach erfolgreichem Test — dauerhaft übernehmen: bei
                        neuem Key „Verbindung speichern“ / „API-Key speichern“;
                        wenn der Key bereits gespeichert ist:{" "}
                        <span className="font-medium text-foreground/90">
                          „Nur Modell &amp; Parameter“
                        </span>
                        .
                      </p>
                    </div>
                    {validateByProvider[pid] ? (
                      validateByProvider[pid]!.ok ? (
                        <div className="space-y-2">
                          <Alert className="border-emerald-500/35 bg-emerald-500/[0.06] py-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <AlertDescription className="text-xs">
                              Verbindung in Ordnung —{" "}
                              {validateByProvider[pid]!.models.length} Modelle
                              {validateByProvider[pid]!.source === "remote"
                                ? " (live von der API)"
                                : " (Fallback-Liste)"}
                              .{" "}
                              <span className="text-muted-foreground">
                                Geprüft{" "}
                                {formatCheckedAgo(validateByProvider[pid]!.at)}.
                              </span>
                            </AlertDescription>
                          </Alert>
                          <LLMModelBrowsePanel
                            models={validateByProvider[pid]!.models}
                            selectedModelId={pf.model}
                            onSelectModel={(id) => {
                              setProviderForm((f) => ({
                                ...f,
                                [pid]: { ...(f[pid] ?? pf), model: id },
                              }));
                              const saveHint = saved
                                ? "Zum Speichern der Auswahl: „Nur Modell & Parameter“."
                                : pid === "ollama"
                                  ? "Zum Speichern: „Verbindung speichern“ (schreibt URL/Key und Modell mit)."
                                  : "Zum Speichern: „API-Key speichern“ (Key aus dem Feld + Modell).";
                              toast.message(`Modell: ${id}`, {
                                description: saveHint,
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <Alert variant="destructive" className="py-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {validateByProvider[pid]!.error ||
                              "Test fehlgeschlagen"}
                          </AlertDescription>
                        </Alert>
                      )
                    ) : null}
                    <div className="space-y-2">
                      <Label className="text-xs" htmlFor={`model-${pid}`}>
                        Modell
                      </Label>
                      <SearchableModelSelect
                        id={`model-${pid}`}
                        value={pf.model}
                        onValueChange={(v) =>
                          setProviderForm((f) => ({
                            ...f,
                            [pid]: { ...(f[pid] ?? pf), model: v },
                          }))
                        }
                        options={modelChoices}
                        locked={!modelsListUnlocked}
                        disabled={saving}
                        lockedHint="Zuerst Zugangsdaten speichern, dann „Verbindung testen“ — danach steht die durchsuchbare Modellliste bereit."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Temperatur: {pf.temp.toFixed(2)}
                      </Label>
                      <Slider
                        min={0}
                        max={2}
                        step={0.1}
                        value={[pf.temp]}
                        onValueChange={([v]) =>
                          setProviderForm((f) => ({
                            ...f,
                            [pid]: { ...(f[pid] ?? pf), temp: v },
                          }))
                        }
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max. Tokens: {pf.max}</Label>
                      <Slider
                        min={500}
                        max={4000}
                        step={100}
                        value={[pf.max]}
                        onValueChange={([v]) =>
                          setProviderForm((f) => ({
                            ...f,
                            [pid]: { ...(f[pid] ?? pf), max: v },
                          }))
                        }
                        disabled={saving}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pid === "ollama" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            saving ||
                            (ollamaModeDraft === "local"
                              ? !ollamaBaseDraft.trim()
                              : !(
                                  (keyDrafts.ollama ?? "").trim() ||
                                  (settings.ollama_api_key &&
                                    String(settings.ollama_api_key).trim())
                                ))
                          }
                          onClick={() =>
                            void saveOllamaConnection({
                              model: pf.model,
                              temperature: pf.temp,
                              max_tokens: pf.max,
                            })
                          }
                        >
                          Verbindung speichern
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={saving || !draft.trim()}
                          onClick={() =>
                            void saveProviderKeyAndPrefs(pid, draft, {
                              model: pf.model,
                              temperature: pf.temp,
                              max_tokens: pf.max,
                            })
                          }
                        >
                          API-Key speichern
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={saving || !saved}
                        onClick={() =>
                          void saveProviderPrefsOnly(pid, {
                            model: pf.model,
                            temperature: pf.temp,
                            max_tokens: pf.max,
                          })
                        }
                      >
                        Nur Modell &amp; Parameter
                      </Button>
                    </div>
                  </div>
                </details>
              );
            })}
          </section>

          <section className="flex flex-col gap-3">
            <div className="px-1">
              <h3 className="text-sm font-semibold">Image</h3>
              <p className="text-xs text-muted-foreground">
                Cover- und 2DStage-Bildgenerierung via Ollama Cloud oder
                OpenRouter (entweder/oder).
              </p>
            </div>

            <details className="group rounded-lg border border-border bg-card/60 open:bg-card/80">
              <summary className="flex cursor-pointer list-none items-center gap-0 px-3 py-3 [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-x-5">
                  <div className="flex min-w-0 max-w-full shrink-0 items-center gap-3">
                    {storedOllamaImageApiKey ? (
                      <span
                        style={{
                          backgroundColor: "#059669",
                          color: "#ffffff",
                          borderColor: "transparent",
                        }}
                        className={cn(
                          "inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium leading-none shadow-sm",
                          "animate-[pulse_1.1s_ease-in-out_infinite] shadow-[0_0_0_2px_rgba(16,185,129,0.22)]",
                        )}
                      >
                        Ollama (Cloud)
                      </span>
                    ) : (
                      <Badge
                        variant="default"
                        className={cn(
                          PROVIDER_BADGE_CLASS,
                          "text-xs font-medium",
                        )}
                      >
                        Ollama (Cloud)
                      </Badge>
                    )}
                    {storedOllamaImageApiKey ? (
                      <span className="max-w-[200px] truncate text-xs font-mono leading-none text-muted-foreground sm:max-w-[280px]">
                        image · Cloud · ***{storedOllamaImageApiKey.slice(-4)}
                      </span>
                    ) : (
                      <span className="text-xs leading-none text-muted-foreground">
                        nicht konfiguriert
                      </span>
                    )}
                  </div>
                  <ImageFeatureToggleBadges
                    providerId="ollama"
                    featureFlags={imageFeatureFlags}
                    isOnForProvider={(fid) =>
                      isImageFeatureOnForProvider("ollama", fid)
                    }
                    disabled={saving}
                    onToggle={(fid, v) =>
                      void toggleImageFeatureForProvider("ollama", fid, v)
                    }
                    className="w-full max-w-full border-l-0 pl-0 md:w-auto md:shrink-0 md:border-l md:border-border/60 md:pl-4"
                    ids={{
                      cover: "image-ollama-toggle-cover",
                      stage2d: "image-ollama-toggle-stage2d",
                    }}
                  />
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-1 border-l border-border/60 pl-3">
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  />
                </div>
              </summary>
              <div className="space-y-3 border-t border-border/60 px-3 pb-4 pt-3">
                <Label htmlFor="image-ollama-key" className="text-xs">
                  API-Key (Ollama Cloud, Images)
                </Label>
                <ProviderSecretInput
                  id="image-ollama-key"
                  draft={imageOllamaKeyDraft}
                  onDraftChange={setImageOllamaKeyDraft}
                  storedSecret={storedOllamaImageApiKey}
                  disabled={saving}
                  placeholder="Key von ollama.com"
                  alwaysShowToggle
                />
                <p className="text-[0.7rem] leading-snug text-muted-foreground">
                  {storedOllamaImageApiKey
                    ? `Key hinterlegt · ***${storedOllamaImageApiKey.slice(-4)}`
                    : "Noch kein Ollama-Image-Key gespeichert"}
                </p>

                <div className="space-y-2">
                  <Label
                    className="text-xs"
                    htmlFor="image-model-select-ollama"
                  >
                    Image-Modell (Ollama)
                  </Label>
                  <SearchableModelSelect
                    id="image-model-select-ollama"
                    value={imageModelDraftOllama}
                    onValueChange={setImageModelDraftOllama}
                    options={imageModelOptionsOllama}
                    locked={
                      !(
                        imageValidationOllama?.ok &&
                        imageModelsOllama.length > 0
                      )
                    }
                    disabled={saving}
                    lockedHint="Zuerst „Verbindung testen“ für Ollama — dann Modell wählbar."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving || validatingImageProvider === "ollama"}
                    onClick={() => void runImageConnectionValidation("ollama")}
                  >
                    {validatingImageProvider === "ollama"
                      ? "Test…"
                      : "Verbindung testen"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={() => void saveImageSettings("ollama")}
                  >
                    API-Key speichern
                  </Button>
                </div>

                {imageValidationOllama ? (
                  imageValidationOllama.ok ? (
                    <Alert className="border-emerald-500/35 bg-emerald-500/[0.06] py-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-xs">
                        Ollama Image-Key gültig. Geprüft{" "}
                        {formatCheckedAgo(imageValidationOllama.at)}.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {imageValidationOllama.error ||
                          "Ollama Image-Key Test fehlgeschlagen"}
                      </AlertDescription>
                    </Alert>
                  )
                ) : null}
              </div>
            </details>

            <details className="group rounded-lg border border-border bg-card/60 open:bg-card/80">
              <summary className="flex cursor-pointer list-none items-center gap-0 px-3 py-3 [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-x-5">
                  <div className="flex min-w-0 max-w-full shrink-0 items-center gap-3">
                    {storedOpenrouterImageApiKey ? (
                      <span
                        style={{
                          backgroundColor: "#059669",
                          color: "#ffffff",
                          borderColor: "transparent",
                        }}
                        className={cn(
                          "inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium leading-none shadow-sm",
                          "animate-[pulse_1.1s_ease-in-out_infinite] shadow-[0_0_0_2px_rgba(16,185,129,0.22)]",
                        )}
                      >
                        OpenRouter
                      </span>
                    ) : (
                      <Badge
                        variant="default"
                        className={cn(
                          PROVIDER_BADGE_CLASS,
                          "text-xs font-medium",
                        )}
                      >
                        OpenRouter
                      </Badge>
                    )}
                    {storedOpenrouterImageApiKey ? (
                      <span className="max-w-[200px] truncate text-xs font-mono leading-none text-muted-foreground sm:max-w-[280px]">
                        image · sk-or-***{storedOpenrouterImageApiKey.slice(-4)}
                      </span>
                    ) : (
                      <span className="text-xs leading-none text-muted-foreground">
                        nicht konfiguriert
                      </span>
                    )}
                  </div>
                  <ImageFeatureToggleBadges
                    providerId="openrouter"
                    featureFlags={imageFeatureFlags}
                    isOnForProvider={(fid) =>
                      isImageFeatureOnForProvider("openrouter", fid)
                    }
                    disabled={saving}
                    onToggle={(fid, v) =>
                      void toggleImageFeatureForProvider("openrouter", fid, v)
                    }
                    className="w-full max-w-full border-l-0 pl-0 md:w-auto md:shrink-0 md:border-l md:border-border/60 md:pl-4"
                    ids={{
                      cover: "image-openrouter-toggle-cover",
                      stage2d: "image-openrouter-toggle-stage2d",
                    }}
                  />
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-1 border-l border-border/60 pl-3">
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  />
                </div>
              </summary>
              <div className="space-y-3 border-t border-border/60 px-3 pb-4 pt-3">
                <Label htmlFor="image-openrouter-key" className="text-xs">
                  API-Key (OpenRouter, Images)
                </Label>
                <ProviderSecretInput
                  id="image-openrouter-key"
                  draft={imageOpenrouterKeyDraft}
                  onDraftChange={setImageOpenrouterKeyDraft}
                  storedSecret={storedOpenrouterImageApiKey}
                  disabled={saving}
                  placeholder="Key von openrouter.ai"
                  alwaysShowToggle
                />
                <p className="text-[0.7rem] leading-snug text-muted-foreground">
                  {storedOpenrouterImageApiKey
                    ? `Key hinterlegt · sk-or-***${storedOpenrouterImageApiKey.slice(-4)}`
                    : "Noch kein OpenRouter-Image-Key gespeichert"}
                </p>

                <div className="space-y-2">
                  <Label
                    className="text-xs"
                    htmlFor="image-model-select-openrouter"
                  >
                    Image-Modell (OpenRouter)
                  </Label>
                  <SearchableModelSelect
                    id="image-model-select-openrouter"
                    value={imageModelDraftOpenrouter}
                    onValueChange={setImageModelDraftOpenrouter}
                    options={imageModelOptionsOpenrouter}
                    locked={
                      !(
                        imageValidationOpenrouter?.ok &&
                        imageModelsOpenrouter.length > 0
                      )
                    }
                    disabled={saving}
                    lockedHint="Zuerst „Verbindung testen“ für OpenRouter — dann Modell wählbar."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      saving || validatingImageProvider === "openrouter"
                    }
                    onClick={() =>
                      void runImageConnectionValidation("openrouter")
                    }
                  >
                    {validatingImageProvider === "openrouter"
                      ? "Test…"
                      : "Verbindung testen"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={() => void saveImageSettings("openrouter")}
                  >
                    API-Key speichern
                  </Button>
                </div>

                {imageValidationOpenrouter ? (
                  imageValidationOpenrouter.ok ? (
                    <Alert className="border-emerald-500/35 bg-emerald-500/[0.06] py-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-xs">
                        OpenRouter Image-Key gültig. Geprüft{" "}
                        {formatCheckedAgo(imageValidationOpenrouter.at)}.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {imageValidationOpenrouter.error ||
                          "OpenRouter Image-Key Test fehlgeschlagen"}
                      </AlertDescription>
                    </Alert>
                  )
                ) : null}
              </div>
            </details>
          </section>
        </div>
      </div>

      {onRequestClose ? (
        <div className="mt-4 flex justify-end border-t pt-4">
          <Button
            type="button"
            onClick={() => onRequestClose()}
            variant="outline"
          >
            Schließen
          </Button>
        </div>
      ) : null}
    </div>
  );
}
