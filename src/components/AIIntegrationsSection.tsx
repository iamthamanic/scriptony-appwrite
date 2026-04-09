import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Bot,
  BrainCircuit,
  Dumbbell,
  Eye,
  EyeOff,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Mic,
  RefreshCw,
  Sparkles,
  Video,
  Volume2,
} from "lucide-react";
import { toast } from "sonner@2.0.3";

import { apiDelete, apiGet, apiPost, apiPut, unwrapApiResult } from "../lib/api-client";
import { hasFunctionConfigured } from "../lib/env";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { FeatureModelPicker, type DiscoveredModelInfo } from "./ai/FeatureModelPicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { filterProvidersForFeature, isOllamaFamilyProviderId } from "../lib/ai-provider-allowlist";

type CapabilityKey = "text" | "embeddings" | "image" | "audio_stt" | "audio_tts" | "video";

type FeatureKey =
  | "assistant_chat"
  | "assistant_embeddings"
  | "creative_gym"
  | "image_generation"
  | "audio_stt"
  | "audio_tts"
  | "video_generation";

interface ProviderCapabilities {
  text?: boolean;
  embeddings?: boolean;
  image?: boolean;
  audio_stt?: boolean;
  audio_tts?: boolean;
  video?: boolean;
}

interface AIProvider {
  id: string;
  name: string;
  requiresApiKey?: boolean;
  has_key?: boolean;
  capabilities: ProviderCapabilities;
}

interface FeatureConfig {
  provider: string;
  model: string;
  voice?: string;
}

interface AIServiceSettingsResponse {
  /** Keys: `feature::provider` */
  feature_provider_keys?: Record<string, boolean>;
  /** Legacy: provider id -> has key (any feature) */
  api_keys?: Record<string, boolean>;
  features: Record<FeatureKey, FeatureConfig>;
  providers: AIProvider[];
}

interface AssistantSettings {
  openai_api_key?: string | null;
  anthropic_api_key?: string | null;
  google_api_key?: string | null;
  openrouter_api_key?: string | null;
  deepseek_api_key?: string | null;
  active_provider: string;
  active_model: string;
  temperature: number;
  max_tokens: number;
  use_rag: boolean;
  provider_keys_configured?: Record<string, boolean>;
}

const FEATURE_META: Record<
  FeatureKey,
  {
    label: string;
    description: string;
    capability: CapabilityKey;
    icon: LucideIcon;
  }
> = {
  assistant_chat: {
    label: "Assistant Chat",
    description: "Interaktiver Scriptony-Chat fuer Projekte, Welten und RAG.",
    capability: "text",
    icon: Bot,
  },
  assistant_embeddings: {
    label: "Assistant Embeddings",
    description: "Vektor-Embeddings fuer Suche, RAG und semantische Aehnlichkeit.",
    capability: "embeddings",
    icon: BrainCircuit,
  },
  creative_gym: {
    label: "Creative Gym",
    description: "Textmodelle fuer Uebungen, Feedback und kreative Herausforderungen.",
    capability: "text",
    icon: Sparkles,
  },
  image_generation: {
    label: "Image Generation",
    description:
      "Bildgenerierung fuer Konzepte und Visuals. OpenAI/Gemini lassen sich zusaetzlich ueber euer Nanobanana-Routing anbinden (Backend).",
    capability: "image",
    icon: ImageIcon,
  },
  audio_stt: {
    label: "Speech-to-Text",
    description: "Transkription von Audio in Text.",
    capability: "audio_stt",
    icon: Mic,
  },
  audio_tts: {
    label: "Text-to-Speech",
    description: "Sprachsynthese und Voice-Ausgabe.",
    capability: "audio_tts",
    icon: Volume2,
  },
  video_generation: {
    label: "Video Generation",
    description: "Videojobs fuer Prompts, Storyboards und Clips.",
    capability: "video",
    icon: Video,
  },
};

type IntegrationTabId = "assistant" | "video" | "image" | "audio" | "gym";

const INTEGRATION_TABS: {
  id: IntegrationTabId;
  label: string;
  featureKeys: FeatureKey[];
  tabIcon: LucideIcon;
}[] = [
  {
    id: "assistant",
    label: "Assistant",
    featureKeys: ["assistant_chat", "assistant_embeddings"],
    tabIcon: Bot,
  },
  { id: "video", label: "Video", featureKeys: ["video_generation"], tabIcon: Video },
  { id: "image", label: "Bild", featureKeys: ["image_generation"], tabIcon: ImageIcon },
  {
    id: "audio",
    label: "Audio",
    featureKeys: ["audio_stt", "audio_tts"],
    tabIcon: Volume2,
  },
  { id: "gym", label: "Gym", featureKeys: ["creative_gym"], tabIcon: Dumbbell },
];

function parseDiscoveredModels(raw: unknown): DiscoveredModelInfo[] {
  if (!Array.isArray(raw)) return [];
  const models: DiscoveredModelInfo[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || !("id" in entry)) continue;
      const id = String((entry as { id: unknown }).id);
      const name =
        "name" in entry && typeof (entry as { name?: unknown }).name === "string"
          ? (entry as { name: string }).name
          : id;
      const provider =
        "provider" in entry && typeof (entry as { provider?: unknown }).provider === "string"
          ? (entry as { provider: string }).provider
          : "";
      const features = Array.isArray((entry as { features?: unknown }).features)
        ? ((entry as { features: string[] }).features)
        : [];
      const cw = (entry as { contextWindow?: unknown }).contextWindow;
      models.push({
        id,
        name,
        provider,
        features,
        contextWindow: typeof cw === "number" ? cw : undefined,
      });
  }
  return models;
}

function featureProviderCacheKey(featureKey: FeatureKey, providerId: string): string {
  return `${featureKey}:${providerId}`;
}

export function AIIntegrationsSection() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistantSettings, setAssistantSettings] = useState<AssistantSettings | null>(null);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [featureDrafts, setFeatureDrafts] = useState<Record<FeatureKey, FeatureConfig> | null>(null);
  const [savedFeatures, setSavedFeatures] = useState<Record<FeatureKey, FeatureConfig> | null>(null);
  const [modelsByFeatureProvider, setModelsByFeatureProvider] = useState<Record<string, DiscoveredModelInfo[]>>(
    {}
  );
  const [discoveringFeatureKey, setDiscoveringFeatureKey] = useState<FeatureKey | null>(null);
  const [ollamaBaseUrls, setOllamaBaseUrls] = useState<Record<string, string>>({
    ollama: "http://127.0.0.1:11434",
    ollama_local: "http://127.0.0.1:11434",
    ollama_cloud: "https://ollama.com",
  });
  const [showKeyForSlot, setShowKeyForSlot] = useState<Record<string, boolean>>({});
  /** Drafts keyed by `feature::provider` */
  const [providerKeyDrafts, setProviderKeyDrafts] = useState<Record<string, string>>({});
  const [savingKeySlot, setSavingKeySlot] = useState<string | null>(null);
  const [featureProviderKeyIndex, setFeatureProviderKeyIndex] = useState<Record<string, boolean>>({});
  const [savingFeatureKey, setSavingFeatureKey] = useState<FeatureKey | null>(null);
  const [advancedAiError, setAdvancedAiError] = useState<string | null>(null);
  const [savingAssistantPrefs, setSavingAssistantPrefs] = useState(false);
  /** Local slider values while dragging (synced from server after save). */
  const [assistantTempSlide, setAssistantTempSlide] = useState<number | null>(null);
  const [assistantMaxSlide, setAssistantMaxSlide] = useState<number | null>(null);

  /** scriptony-ai: gateway routes `/ai/*`, `/settings`, `/providers`, `/api-keys`, `/features` (see api-gateway). */
  const scriptonyAiAvailable = hasFunctionConfigured("scriptony-ai");

  const patchAssistantSettings = async (updates: {
    use_rag?: boolean;
    temperature?: number;
    max_tokens?: number;
  }) => {
    if (!scriptonyAiAvailable) return;
    setSavingAssistantPrefs(true);
    try {
      const data = unwrapApiResult(
        await apiPut<{
          settings: AssistantSettings;
          provider_keys_configured?: Record<string, boolean>;
        }>("/ai/settings", updates)
      );
      if (data.settings) {
        setAssistantSettings({
          ...data.settings,
          provider_keys_configured: data.provider_keys_configured,
        });
      }
      toast.success("Chat-Einstellungen gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSavingAssistantPrefs(false);
    }
  };

  useEffect(() => {
    setAssistantTempSlide(null);
  }, [assistantSettings?.temperature]);

  useEffect(() => {
    setAssistantMaxSlide(null);
  }, [assistantSettings?.max_tokens]);

  const discoverModelsForFeature = async (
    featureKey: FeatureKey,
    providerId: string
  ): Promise<DiscoveredModelInfo[]> => {
    const cacheKey = featureProviderCacheKey(featureKey, providerId);
    setDiscoveringFeatureKey(featureKey);
    try {
      const body: Record<string, string> = { feature: featureKey };
      if (isOllamaFamilyProviderId(providerId)) {
        body.base_url =
          ollamaBaseUrls[providerId]?.trim() ||
          (providerId === "ollama_cloud" ? "https://ollama.com" : "http://127.0.0.1:11434");
      }
      const slot = featureProviderCacheKey(featureKey, providerId);
      const draftKey = providerKeyDrafts[slot];
      if (draftKey && draftKey !== "configured" && draftKey.trim()) {
        body.api_key = draftKey.trim();
      }

      const payload = unwrapApiResult(
        await apiPost<{ models?: unknown; error?: string }>(`/providers/${providerId}/models/discover`, body)
      );

      const models = parseDiscoveredModels(payload?.models);
      setModelsByFeatureProvider((prev) => ({ ...prev, [cacheKey]: models }));
      return models;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Modelle konnten nicht geladen werden.";
      toast.error(message);
      return [];
    } finally {
      setDiscoveringFeatureKey(null);
    }
  };

  const loadData = async (showRefreshState = false) => {
    if (!scriptonyAiAvailable) {
      setError(
        "scriptony-ai ist nicht konfiguriert. Setze VITE_BACKEND_FUNCTION_DOMAIN_MAP (scriptony-ai) oder VITE_APPWRITE_FUNCTIONS_BASE_URL."
      );
      setLoading(false);
      return;
    }

    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      setAdvancedAiError(null);

      try {
        const assistantResult = await apiGet<{
          settings?: AssistantSettings;
          provider_keys_configured?: Record<string, boolean>;
        }>("/ai/settings");
        const assistantData = unwrapApiResult(assistantResult);
        const merged: AssistantSettings | null = assistantData?.settings
          ? {
              ...assistantData.settings,
              provider_keys_configured: assistantData.provider_keys_configured,
            }
          : null;
        setAssistantSettings(merged);
      } catch {
        setAssistantSettings(null);
      }

      try {
        const settingsPayload = unwrapApiResult(
          await apiGet<AIServiceSettingsResponse>("/settings")
        );
        setProviders(settingsPayload.providers || []);
        setSavedFeatures(settingsPayload.features);
        setFeatureDrafts(settingsPayload.features);

        const fp = settingsPayload.feature_provider_keys || {};
        setFeatureProviderKeyIndex(fp);
        const keyedSlots = Object.entries(fp).reduce<Record<string, string>>(
          (acc, [slot, hasKey]) => {
            if (hasKey) {
              acc[slot] = "configured";
            }
            return acc;
          },
          {}
        );
        setProviderKeyDrafts((prev) => ({ ...keyedSlots, ...prev }));
        setAdvancedAiError(null);
      } catch (advancedError) {
        const message =
          advancedError instanceof Error
            ? advancedError.message
            : "Provider- und Feature-Listen konnten nicht geladen werden.";
        setAdvancedAiError(message);
        setProviders([]);
        setSavedFeatures(null);
        setFeatureDrafts(null);
        setFeatureProviderKeyIndex({});
      }
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "AI-Integrationen konnten nicht geladen werden.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData(false);
  }, []);

  const providerById = useMemo(
    () =>
      providers.reduce<Record<string, AIProvider>>((acc, provider) => {
        acc[provider.id] = provider;
        return acc;
      }, {}),
    [providers]
  );

  const handleFeatureProviderChange = (feature: FeatureKey, providerId: string) => {
    setFeatureDrafts((prev) => {
      if (!prev) return prev;
      const current = prev[feature];
      const sameProvider = current.provider === providerId;
      return {
        ...prev,
        [feature]: {
          ...current,
          provider: providerId,
          model: sameProvider ? current.model : "",
        },
      };
    });
  };

  const handleFeatureSave = async (feature: FeatureKey) => {
    if (!featureDrafts) return;
    const draft = featureDrafts[feature];
    setSavingFeatureKey(feature);

    try {
      unwrapApiResult(
        await apiPut(`/features/${feature}`, {
          provider: draft.provider,
          model: draft.model,
          ...(draft.voice ? { voice: draft.voice } : {}),
        })
      );

      setSavedFeatures((prev) => (prev ? { ...prev, [feature]: draft } : prev));
      toast.success(`${FEATURE_META[feature].label} gespeichert.`);
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Feature-Konfiguration konnte nicht gespeichert werden.";
      toast.error(message);
    } finally {
      setSavingFeatureKey(null);
    }
  };

  const handleStoreFeatureProviderKey = async (featureKey: FeatureKey, providerId: string) => {
    const slot = featureProviderCacheKey(featureKey, providerId);
    const apiKey = providerKeyDrafts[slot]?.trim();
    if (!isOllamaFamilyProviderId(providerId) && !apiKey) {
      toast.error("Bitte zuerst einen API Key eingeben.");
      return;
    }

    setSavingKeySlot(slot);
    try {
      const validationPayload = unwrapApiResult(
        await apiPost<{ valid?: boolean; error?: string }>(`/providers/${providerId}/validate`, {
          api_key: apiKey || "",
        })
      );
      if (validationPayload?.valid === false) {
        throw new Error(
          validationPayload?.error || `${providerById[providerId]?.name || providerId} konnte nicht validiert werden.`
        );
      }

      if (!isOllamaFamilyProviderId(providerId)) {
        unwrapApiResult(
          await apiPost("/api-keys", { feature: featureKey, provider: providerId, api_key: apiKey })
        );
      }

      toast.success(
        isOllamaFamilyProviderId(providerId)
          ? `${providerById[providerId]?.name || providerId}: Verbindung geprüft.`
          : `${providerById[providerId]?.name || providerId}: Zugang gespeichert.`
      );
      setProviderKeyDrafts((prev) => ({ ...prev, [slot]: "configured" }));
      await loadData(true);
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "API Key konnte nicht gespeichert werden.";
      toast.error(message);
    } finally {
      setSavingKeySlot(null);
    }
  };

  const handleDeleteFeatureProviderKey = async (featureKey: FeatureKey, providerId: string) => {
    const slot = featureProviderCacheKey(featureKey, providerId);
    setSavingKeySlot(slot);
    try {
      unwrapApiResult(
        await apiDelete(
          `/api-keys/${encodeURIComponent(featureKey)}/${encodeURIComponent(providerId)}`
        )
      );

      toast.success(`${providerById[providerId]?.name || providerId} API Key fuer dieses Feature entfernt.`);
      setProviderKeyDrafts((prev) => ({ ...prev, [slot]: "" }));
      await loadData(true);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "API Key konnte nicht geloescht werden.";
      toast.error(message);
    } finally {
      setSavingKeySlot(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          AI-Integrationen werden geladen...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!scriptonyAiAvailable && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Backend nicht konfiguriert</AlertTitle>
          <AlertDescription>
            Setze <code>VITE_BACKEND_FUNCTION_DOMAIN_MAP</code> oder <code>VITE_APPWRITE_FUNCTIONS_BASE_URL</code>,
            damit diese Seite Daten laden kann.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>AI-Integrationen konnten nicht geladen werden</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {advancedAiError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Provider- und Feature-Daten konnten nicht geladen werden</AlertTitle>
          <AlertDescription>{advancedAiError}</AlertDescription>
        </Alert>
      )}

      {scriptonyAiAvailable && featureDrafts && (
        <Card>
          <CardHeader className="p-4">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="size-4" />
                  AI Integrationen
                </CardTitle>
                <CardDescription className="text-xs">
                  Weise jedem AI-Feature einen Provider und ein Modell zu.
                </CardDescription>
              </div>
              <div className="flex shrink-0 justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => void loadData(true)}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Aktualisieren
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Tabs defaultValue="assistant" className="w-full">
              <TabsList className="mb-1 flex h-auto w-full flex-wrap justify-start gap-1">
                {INTEGRATION_TABS.map((tab) => {
                  const TabIcon = tab.tabIcon;
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
                      <TabIcon className="size-3.5 shrink-0" />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {INTEGRATION_TABS.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-4 space-y-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    {tab.featureKeys.map((featureKey) => {
                      const meta = FEATURE_META[featureKey];
                      const draft = featureDrafts[featureKey];
                      const saved = savedFeatures?.[featureKey];
                      const modelCacheKey = featureProviderCacheKey(featureKey, draft.provider);
                      const models = modelsByFeatureProvider[modelCacheKey] || [];
                      const supportedProviders = filterProvidersForFeature(
                        featureKey,
                        providers.filter((provider) => provider.capabilities[meta.capability])
                      );
                      const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);
                      const Icon = meta.icon;
                      const fpSlot = featureProviderCacheKey(featureKey, draft.provider);
                      const hasKeyForSlot =
                        Boolean(featureProviderKeyIndex[fpSlot]) ||
                        providerById[draft.provider]?.requiresApiKey === false;
                      const requiresKeyForProvider = providerById[draft.provider]?.requiresApiKey !== false;

                      return (
                        <div key={featureKey} className="rounded-lg border bg-muted/20 p-4 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                                <Icon className="size-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{meta.label}</p>
                                <p className="text-xs text-muted-foreground">{meta.description}</p>
                              </div>
                            </div>
                            <Badge variant={hasKeyForSlot ? "default" : "outline"}>{draft.provider}</Badge>
                          </div>

                          <div className="space-y-3">
                            <div className="max-w-md space-y-2">
                              <Label>Provider</Label>
                              <Select value={draft.provider} onValueChange={(value) => handleFeatureProviderChange(featureKey, value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Provider waehlen" />
                                </SelectTrigger>
                                <SelectContent>
                                  {supportedProviders.map((provider) => (
                                    <SelectItem key={provider.id} value={provider.id}>
                                      {provider.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Modell</Label>
                              {isOllamaFamilyProviderId(draft.provider) && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Ollama Base URL</Label>
                                  <Input
                                    value={ollamaBaseUrls[draft.provider] ?? ""}
                                    onChange={(e) =>
                                      setOllamaBaseUrls((prev) => ({
                                        ...prev,
                                        [draft.provider]: e.target.value,
                                      }))
                                    }
                                    placeholder={
                                      draft.provider === "ollama_cloud"
                                        ? "https://ollama.com"
                                        : "http://127.0.0.1:11434"
                                    }
                                    className="max-w-md font-mono text-xs"
                                  />
                                </div>
                              )}
                              <FeatureModelPicker
                                models={models}
                                value={draft.model}
                                onValueChange={(modelId) =>
                                  setFeatureDrafts((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          [featureKey]: {
                                            ...prev[featureKey],
                                            model: modelId,
                                          },
                                        }
                                      : prev
                                  )
                                }
                                onLoadModels={() => {
                                  void discoverModelsForFeature(featureKey, draft.provider);
                                }}
                                loading={discoveringFeatureKey === featureKey}
                                showDiscoverButton={false}
                              />
                            </div>
                          </div>

                          {requiresKeyForProvider && (
                            <div className="space-y-2 rounded-md border border-dashed bg-background/50 p-3">
                              <Label className="text-xs">API Key fuer dieses Feature ({draft.provider})</Label>
                              {!isOllamaFamilyProviderId(draft.provider) && (
                                <>
                                  <div className="relative flex items-center gap-1">
                                    <Input
                                      type={showKeyForSlot[fpSlot] ? "text" : "password"}
                                      placeholder={`${providerById[draft.provider]?.name || draft.provider} Key`}
                                      className="pr-10 font-mono text-xs"
                                      value={
                                        providerKeyDrafts[fpSlot] === "configured"
                                          ? ""
                                          : providerKeyDrafts[fpSlot] || ""
                                      }
                                      onChange={(e) =>
                                        setProviderKeyDrafts((prev) => ({
                                          ...prev,
                                          [fpSlot]: e.target.value,
                                        }))
                                      }
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-0 top-0 size-9 shrink-0"
                                      onClick={() =>
                                        setShowKeyForSlot((prev) => ({
                                          ...prev,
                                          [fpSlot]: !prev[fpSlot],
                                        }))
                                      }
                                      aria-label={showKeyForSlot[fpSlot] ? "Key verbergen" : "Key anzeigen"}
                                    >
                                      {showKeyForSlot[fpSlot] ? (
                                        <EyeOff className="size-4" />
                                      ) : (
                                        <Eye className="size-4" />
                                      )}
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="gap-1.5"
                                      disabled={discoveringFeatureKey === featureKey}
                                      onClick={() => void discoverModelsForFeature(featureKey, draft.provider)}
                                    >
                                      {discoveringFeatureKey === featureKey ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="size-4" />
                                      )}
                                      Modelle prüfen
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => void handleStoreFeatureProviderKey(featureKey, draft.provider)}
                                      disabled={savingKeySlot === fpSlot}
                                    >
                                      {savingKeySlot === fpSlot ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        "Key speichern"
                                      )}
                                    </Button>
                                    {featureProviderKeyIndex[fpSlot] && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          void handleDeleteFeatureProviderKey(featureKey, draft.provider)
                                        }
                                        disabled={savingKeySlot === fpSlot}
                                      >
                                        Entfernen
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setProviderKeyDrafts((prev) => ({
                                          ...prev,
                                          [fpSlot]: featureProviderKeyIndex[fpSlot] ? "configured" : "",
                                        }))
                                      }
                                    >
                                      Abbrechen
                                    </Button>
                                  </div>
                                </>
                              )}
                              {isOllamaFamilyProviderId(draft.provider) && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="gap-1.5"
                                    disabled={discoveringFeatureKey === featureKey}
                                    onClick={() => void discoverModelsForFeature(featureKey, draft.provider)}
                                  >
                                    {discoveringFeatureKey === featureKey ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="size-4" />
                                    )}
                                    Modelle prüfen
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void handleStoreFeatureProviderKey(featureKey, draft.provider)}
                                    disabled={savingKeySlot === fpSlot}
                                  >
                                    {savingKeySlot === fpSlot ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      "Verbindung pruefen"
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {featureKey === "assistant_chat" && (
                            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">RAG</p>
                                  <p className="text-xs text-muted-foreground">
                                    Nutzt eure eingebundenen Dokumente fuer den Chat-Kontext.
                                  </p>
                                </div>
                                <Switch
                                  checked={assistantSettings?.use_rag ?? false}
                                  onCheckedChange={(v) => void patchAssistantSettings({ use_rag: v })}
                                  disabled={savingAssistantPrefs || !scriptonyAiAvailable}
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor="assistant-temperature" className="text-sm">
                                    Temperatur:{" "}
                                    {(assistantTempSlide ?? assistantSettings?.temperature ?? 0.7).toFixed(2)}
                                  </Label>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label="Hilfe zu Temperatur"
                                      >
                                        <HelpCircle className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs text-balance">
                                      Steuert die Zufaelligkeit der Antworten: niedrig = konsistenter und naeher am
                                      Training, hoch = kreativer und variabler.
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <Slider
                                  id="assistant-temperature"
                                  min={0}
                                  max={2}
                                  step={0.1}
                                  value={[assistantTempSlide ?? assistantSettings?.temperature ?? 0.7]}
                                  onValueChange={([value]) => setAssistantTempSlide(value)}
                                  onValueCommit={([value]) => void patchAssistantSettings({ temperature: value })}
                                  disabled={savingAssistantPrefs || !scriptonyAiAvailable}
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor="assistant-max-tokens" className="text-sm">
                                    Max Tokens: {assistantMaxSlide ?? assistantSettings?.max_tokens ?? 2000}
                                  </Label>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label="Hilfe zu Max Tokens"
                                      >
                                        <HelpCircle className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs text-balance">
                                      Obergrenze fuer die Antwortlaenge. Ein Token entspricht etwa 3–4 Zeichen;
                                      zu niedrig bricht der Text ab, zu hoch verbraucht mehr Budget.
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <Slider
                                  id="assistant-max-tokens"
                                  min={500}
                                  max={4000}
                                  step={100}
                                  value={[assistantMaxSlide ?? assistantSettings?.max_tokens ?? 2000]}
                                  onValueChange={([value]) => setAssistantMaxSlide(value)}
                                  onValueCommit={([value]) => void patchAssistantSettings({ max_tokens: value })}
                                  disabled={savingAssistantPrefs || !scriptonyAiAvailable}
                                />
                              </div>
                            </div>
                          )}

                          {featureKey === "audio_tts" && (
                            <div className="space-y-2">
                              <Label>Voice ID</Label>
                              <Input
                                placeholder="Optional fuer TTS, z. B. ElevenLabs Voice ID"
                                value={draft.voice || ""}
                                onChange={(event) =>
                                  setFeatureDrafts((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          [featureKey]: {
                                            ...prev[featureKey],
                                            voice: event.target.value,
                                          },
                                        }
                                      : prev
                                  )
                                }
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground">
                              Capability: <strong>{meta.capability}</strong>
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleFeatureSave(featureKey)}
                              disabled={savingFeatureKey === featureKey || !isDirty}
                            >
                              {savingFeatureKey === featureKey ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                "Provider speichern"
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
