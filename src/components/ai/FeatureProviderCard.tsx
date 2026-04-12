import { Check } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { Switch } from "../ui/switch";
import { Loader2, RefreshCw } from "lucide-react";
import { FeatureModelPicker, type DiscoveredModelInfo } from "./FeatureModelPicker";
import { useProviderSelection } from "../../hooks/useProviderSelection";
import {
  CANONICAL_OLLAMA_PROVIDER_ID,
  normalizeProviderIdForUi,
  providerIdForOllamaMode,
} from "../../lib/ai-provider-allowlist";
import type { LucideIcon } from "lucide-react";

export type FeatureKey =
  | "assistant_chat"
  | "assistant_embeddings"
  | "creative_gym"
  | "image_generation"
  | "audio_stt"
  | "audio_tts"
  | "video_generation";

export interface FeatureConfig {
  provider: string;
  model: string;
  voice?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  requiresApiKey?: boolean;
  capabilities: Record<string, boolean>;
}

type OllamaUiMode = "local" | "cloud";

interface FeatureMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  capability: string;
}

interface FeatureProviderCardProps {
  featureKey: FeatureKey;
  meta: FeatureMeta;
  draft: FeatureConfig;
  saved: FeatureConfig | undefined;
  ollamaModesByFeature: Record<FeatureKey, OllamaUiMode>;
  setOllamaModesByFeature: React.Dispatch<React.SetStateAction<Record<FeatureKey, OllamaUiMode>>>;
  featureDrafts: Record<FeatureKey, FeatureConfig> | null;
  setFeatureDrafts: React.Dispatch<React.SetStateAction<Record<FeatureKey, FeatureConfig> | null>>;
  savedFeatures: Record<FeatureKey, FeatureConfig> | null;
  setSavedFeatures: React.Dispatch<React.SetStateAction<Record<FeatureKey, FeatureConfig> | null>>;
  featureProviderKeyIndex: Record<string, boolean>;
  providers: AIProvider[];
  providerById: Record<string, AIProvider>;
  models: DiscoveredModelInfo[];
  discoveringFeatureKey: FeatureKey | null;
  modelsByFeatureProvider: Record<string, DiscoveredModelInfo[]>;
  setModelsByFeatureProvider: React.Dispatch<React.SetStateAction<Record<string, DiscoveredModelInfo[]>>>;
  ollamaBaseUrls: Record<string, string>;
  setOllamaBaseUrls: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  providerKeyDrafts: Record<string, string>;
  setProviderKeyDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  savedOllamaModesByFeature: Record<FeatureKey, OllamaUiMode>;
  setSavedOllamaModesByFeature: React.Dispatch<React.SetStateAction<Record<FeatureKey, OllamaUiMode>>>;
  savingFeatureKey: FeatureKey | null;
  setSavingFeatureKey: React.Dispatch<React.SetStateAction<FeatureKey | null>>;
  lastDiscoveryTime: Record<string, string>;
  setLastDiscoveryTime: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onDiscoverModels: (featureKey: FeatureKey, providerId: string) => Promise<DiscoveredModelInfo[]>;
  onLoadData: (showRefreshState?: boolean, options?: any) => Promise<void>;
  apiPost: any;
  unwrapApiResult: any;
  toast: any;
}

const DEFAULT_OLLAMA_LOCAL_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_CLOUD_URL = "https://ollama.com";
const CONFIGURED_KEY_SENTINEL = "configured";
const MASKED_API_KEY_VALUE = "••••••••••••";

const ACTIVE_BADGE_STYLE = {
  backgroundColor: "rgba(34, 197, 94, 0.18)",
  borderColor: "rgba(74, 222, 128, 0.45)",
  color: "#bbf7d0",
} as const;

const KEY_SAVED_BADGE_STYLE = {
  backgroundColor: "rgba(168, 85, 247, 0.18)",
  borderColor: "rgba(196, 181, 253, 0.45)",
  color: "#ddd6fe",
} as const;

const ACTIVE_CHECKBOX_STYLE = {
  borderColor: "rgba(74, 222, 128, 0.55)",
  backgroundColor: "rgba(34, 197, 94, 0.22)",
  color: "#bbf7d0",
} as const;

const INACTIVE_CHECKBOX_STYLE = {
  borderColor: "rgba(148, 163, 184, 0.35)",
  backgroundColor: "transparent",
  color: "rgba(148, 163, 184, 0.7)",
} as const;

function featureProviderCacheKey(featureKey: FeatureKey, providerId: string): string {
  return `${featureKey}:${providerId}`;
}

function providerDisplayName(providerById: Record<string, AIProvider>, providerId: string): string {
  if (normalizeProviderIdForUi(providerId) === CANONICAL_OLLAMA_PROVIDER_ID) return "Ollama";
  return providerById[providerId]?.name || providerId;
}

export function FeatureProviderCard({
  featureKey,
  meta,
  draft,
  saved,
  ollamaModesByFeature,
  setOllamaModesByFeature,
  featureDrafts,
  setFeatureDrafts,
  savedFeatures,
  setSavedFeatures,
  featureProviderKeyIndex,
  providers,
  providerById,
  models,
  discoveringFeatureKey,
  modelsByFeatureProvider,
  setModelsByFeatureProvider,
  ollamaBaseUrls,
  setOllamaBaseUrls,
  providerKeyDrafts,
  setProviderKeyDrafts,
  savedOllamaModesByFeature,
  setSavedOllamaModesByFeature,
  savingFeatureKey,
  setSavingFeatureKey,
  lastDiscoveryTime,
  setLastDiscoveryTime,
  onDiscoverModels,
  onLoadData,
  apiPost,
  unwrapApiResult,
  toast,
}: FeatureProviderCardProps) {
  const Icon = meta.icon;
  const ollamaMode = ollamaModesByFeature[featureKey] ?? "local";
  const effectiveProviderId = normalizeProviderIdForUi(draft.provider) === CANONICAL_OLLAMA_PROVIDER_ID
    ? providerIdForOllamaMode(ollamaMode)
    : draft.provider;
  const modelCacheKey = featureProviderCacheKey(featureKey, effectiveProviderId);
  const fpSlot = modelCacheKey;
  const selectedProviderLabel = providerDisplayName(providerById, draft.provider);
  const isOllamaSelected = normalizeProviderIdForUi(draft.provider) === CANONICAL_OLLAMA_PROVIDER_ID;
  const requiresKeyForProvider = isOllamaSelected
    ? ollamaMode === "cloud"
    : providerById[effectiveProviderId]?.requiresApiKey !== false;

  // Provider Selection Hook
  const providerSelection = useProviderSelection({
    featureKey,
    featureDrafts,
    setFeatureDrafts,
    featureProviderKeyIndex,
    providerById,
    ollamaModesByFeature,
  });

  const buildFeatureSnapshot = (
    featureKey: FeatureKey,
    config: FeatureConfig | undefined,
    ollamaModes: Record<FeatureKey, OllamaUiMode>
  ): string =>
    JSON.stringify({
      provider: config?.provider || "",
      model: config?.model || "",
      voice: config?.voice || "",
      ollamaMode:
        normalizeProviderIdForUi(config?.provider || "") === CANONICAL_OLLAMA_PROVIDER_ID
          ? ollamaModes[featureKey] ?? "local"
          : "",
    });

  const isDirty =
    buildFeatureSnapshot(featureKey, draft, ollamaModesByFeature) !==
    buildFeatureSnapshot(featureKey, saved, savedOllamaModesByFeature);

  const getOllamaBaseUrlForMode = (mode: OllamaUiMode): string => {
    if (mode === "cloud") return DEFAULT_OLLAMA_CLOUD_URL;
    return (
      ollamaBaseUrls.ollama_local?.trim() ||
      ollamaBaseUrls.ollama?.trim() ||
      DEFAULT_OLLAMA_LOCAL_URL
    );
  };

  const handleFeatureProviderChange = (feature: FeatureKey, providerId: string) => {
    setFeatureDrafts((prev) => {
      if (!prev) return prev;
      const current = prev[feature];
      const sameProvider =
        normalizeProviderIdForUi(current.provider) === normalizeProviderIdForUi(providerId);
      return {
        ...prev,
        [feature]: {
          ...current,
          provider: normalizeProviderIdForUi(providerId),
          model: sameProvider ? current.model : "",
        },
      };
    });
  };

  const handleFeatureSave = async (feature: FeatureKey) => {
    if (!featureDrafts) return;
    const draft = featureDrafts[feature];
    const effectiveProviderId = normalizeProviderIdForUi(draft.provider) === CANONICAL_OLLAMA_PROVIDER_ID
      ? providerIdForOllamaMode(ollamaModesByFeature[feature] ?? "local")
      : draft.provider;
    setSavingFeatureKey(feature);

    try {
      if (normalizeProviderIdForUi(draft.provider) === CANONICAL_OLLAMA_PROVIDER_ID) {
        const ollamaMode = ollamaModesByFeature[feature] ?? "local";
        unwrapApiResult(
          await apiPost("/settings", {
            settings_json: {
              ollama: { mode: ollamaMode },
            },
            ...(ollamaMode === "local"
              ? { ollama_base_url: getOllamaBaseUrlForMode("local") }
              : {}),
          })
        );
      }

      unwrapApiResult(
        await apiPost(`/features/${feature}`, {
          provider: effectiveProviderId,
          model: draft.model,
          ...(draft.voice ? { voice: draft.voice } : {}),
        })
      );

      setSavedFeatures((prev) => (prev ? { ...prev, [feature]: draft } : prev));
      setSavedOllamaModesByFeature((prev) => ({
        ...prev,
        [feature]: ollamaModesByFeature[feature] ?? "local",
      }));
      toast.success(`${meta.label} gespeichert.`);
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Speichern fehlgeschlagen.";
      toast.error(message);
    } finally {
      setSavingFeatureKey(null);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
      {/* Header */}
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{selectedProviderLabel}</Badge>
          {providerSelection.hasSavedKey && (
            <Badge variant="outline" style={KEY_SAVED_BADGE_STYLE}>
              Key Saved
            </Badge>
          )}
          {providerSelection.isActive && (
            <Badge variant="outline" style={ACTIVE_BADGE_STYLE}>
              Active
            </Badge>
          )}
        </div>
        <div className="mt-2">
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

      {/* Provider Select */}
      <div className="space-y-3">
        <div className="max-w-md space-y-2">
          <Label>Provider</Label>
          <Select
            value={draft.provider}
            onValueChange={(value) => handleFeatureProviderChange(featureKey, value)}
          >
            <SelectTrigger>
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate">{selectedProviderLabel}</span>
                {providerSelection.hasSavedKey && (
                  <Badge variant="outline" style={KEY_SAVED_BADGE_STYLE}>
                    Key Saved
                  </Badge>
                )}
                {providerSelection.isActive && (
                  <Badge variant="outline" style={ACTIVE_BADGE_STYLE}>
                    Active
                  </Badge>
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) => {
                const isProvActive = providerSelection.isProviderActive(provider.id);
                const hasProvKey = providerSelection.hasProviderSavedKey(provider.id);
                const canProvActivate = providerSelection.canProviderActivate(provider.id);
                
                return (
                  <SelectItem
                    key={provider.id}
                    value={provider.id}
                    textValue={providerDisplayName(providerById, provider.id)}
                  >
                    <div className="ml-auto flex items-center gap-2">
                      {hasProvKey ? (
                        <Badge variant="outline" style={KEY_SAVED_BADGE_STYLE}>
                          Key Saved
                        </Badge>
                      ) : null}
                      {isProvActive ? (
                        <Badge variant="outline" style={ACTIVE_BADGE_STYLE}>
                          Active
                        </Badge>
                      ) : null}
                      {canProvActivate ? (
                        <button
                          type="button"
                          onClick={providerSelection.activateSpecificProvider(provider.id)}
                          className="flex size-4 items-center justify-center rounded-[4px] border cursor-pointer"
                          style={isProvActive ? ACTIVE_CHECKBOX_STYLE : INACTIVE_CHECKBOX_STYLE}
                          title={isProvActive ? "Aktiver Provider" : "Als aktiven Provider setzen"}
                        >
                          {isProvActive ? <Check className="size-3" /> : null}
                        </button>
                      ) : null}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Model Picker */}
        <div className="space-y-2">
          <Label>Modell</Label>
          {isOllamaSelected && (
            <div className="space-y-3 rounded-md border border-dashed bg-background/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-xs">Ollama Modus</Label>
                  <p className="text-xs text-muted-foreground">
                    Schaltet zwischen lokaler Instanz und Ollama Cloud um.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={ollamaMode === "local" ? "font-medium text-foreground" : "text-muted-foreground"}>
                    Lokal
                  </span>
                  <Switch
                    checked={ollamaMode === "cloud"}
                    onCheckedChange={(checked) =>
                      setOllamaModesByFeature((prev) => ({
                        ...prev,
                        [featureKey]: checked ? "cloud" : "local",
                      }))
                    }
                  />
                  <span className={ollamaMode === "cloud" ? "font-medium text-foreground" : "text-muted-foreground"}>
                    Cloud
                  </span>
                </div>
              </div>
              {ollamaMode === "local" && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ollama Base URL</Label>
                  <input
                    type="text"
                    value={getOllamaBaseUrlForMode("local")}
                    onChange={(e) =>
                      setOllamaBaseUrls((prev) => ({
                        ...prev,
                        ollama: e.target.value,
                        ollama_local: e.target.value,
                      }))
                    }
                    placeholder={DEFAULT_OLLAMA_LOCAL_URL}
                    className="w-full max-w-md rounded-md border border-input bg-background px-3 py-1 text-xs font-mono"
                  />
                </div>
              )}
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
              void onDiscoverModels(featureKey, draft.provider);
            }}
            loading={discoveringFeatureKey === featureKey}
            showDiscoverButton={false}
            lastDiscoveryTime={lastDiscoveryTime[modelCacheKey]}
          />
        </div>
      </div>

      {/* Capability Info */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Capability: <strong>{meta.capability}</strong>
        </p>
      </div>
    </div>
  );
}
