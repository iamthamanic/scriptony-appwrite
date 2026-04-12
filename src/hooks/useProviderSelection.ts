import { useCallback, useMemo } from "react";
import {
  CANONICAL_OLLAMA_PROVIDER_ID,
  normalizeProviderIdForUi,
  providerIdForOllamaMode,
  type OllamaUiMode,
} from "../lib/ai-provider-allowlist";

export interface AIProvider {
  id: string;
  name: string;
  requiresApiKey?: boolean;
  capabilities: Record<string, boolean>;
}

export interface FeatureConfig {
  provider: string;
  model: string;
  voice?: string;
}

export type FeatureKey =
  | "assistant_chat"
  | "assistant_embeddings"
  | "creative_gym"
  | "image_generation"
  | "audio_stt"
  | "audio_tts"
  | "video_generation";

export const KEY_SAVED_BADGE_STYLE = {
  backgroundColor: "rgba(168, 85, 247, 0.18)",
  borderColor: "rgba(196, 181, 253, 0.45)",
  color: "#ddd6fe",
} as const;

export const ACTIVE_BADGE_STYLE = {
  backgroundColor: "rgba(34, 197, 94, 0.18)",
  borderColor: "rgba(74, 222, 128, 0.45)",
  color: "#bbf7d0",
} as const;

export const ACTIVE_CHECKBOX_STYLE = {
  borderColor: "rgba(74, 222, 128, 0.55)",
  backgroundColor: "rgba(34, 197, 94, 0.22)",
  color: "#bbf7d0",
} as const;

export const INACTIVE_CHECKBOX_STYLE = {
  borderColor: "rgba(148, 163, 184, 0.35)",
  backgroundColor: "transparent",
  color: "rgba(148, 163, 184, 0.7)",
} as const;

function featureProviderCacheKey(featureKey: FeatureKey, providerId: string): string {
  return `${featureKey}:${providerId}`;
}

interface UseProviderSelectionOptions {
  featureKey: FeatureKey;
  featureDrafts: Record<FeatureKey, FeatureConfig> | null;
  setFeatureDrafts: React.Dispatch<React.SetStateAction<Record<FeatureKey, FeatureConfig> | null>>;
  featureProviderKeyIndex: Record<string, boolean>;
  providerById: Record<string, AIProvider>;
  ollamaModesByFeature: Record<FeatureKey, OllamaUiMode>;
}

interface ProviderSelectionResult {
  /** Ist dieser Provider der aktive Provider für das Feature? */
  isActive: boolean;
  /** Ist ein Key für diesen Provider gespeichert? */
  hasSavedKey: boolean;
  /** Kann dieser Provider aktiviert werden (hat Key oder braucht keinen)? */
  canActivate: boolean;
  /** Aktiviert den Provider */
  activateProvider: (providerId: string) => void;
  /** Prüft ob ein spezifischer Provider aktiv ist */
  isProviderActive: (providerId: string) => boolean;
  /** Prüft ob für einen spezifischen Provider ein Key gespeichert ist */
  hasProviderSavedKey: (providerId: string) => boolean;
  /** Prüft ob ein spezifischer Provider aktiviert werden kann */
  canProviderActivate: (providerId: string) => boolean;
  /** Aktiviert einen spezifischen Provider (für Callbacks) */
  activateSpecificProvider: (providerId: string) => (e: React.MouseEvent) => void;
  /** Styles für Badges */
  styles: {
    keySaved: typeof KEY_SAVED_BADGE_STYLE;
    active: typeof ACTIVE_BADGE_STYLE;
    checkboxActive: typeof ACTIVE_CHECKBOX_STYLE;
    checkboxInactive: typeof INACTIVE_CHECKBOX_STYLE;
  };
  /** Aktueller Provider-Name */
  currentProviderLabel: string;
  /** Effektive Provider-ID (für Ollama mit Mode) */
  effectiveProviderId: string;
}

export function useProviderSelection({
  featureKey,
  featureDrafts,
  setFeatureDrafts,
  featureProviderKeyIndex,
  providerById,
  ollamaModesByFeature,
}: UseProviderSelectionOptions): ProviderSelectionResult {
  
  const currentDraft = featureDrafts?.[featureKey];
  const currentProvider = currentDraft?.provider || "";
  const ollamaMode = ollamaModesByFeature[featureKey] ?? "local";
  
  const effectiveProviderId = useMemo(() => {
    if (normalizeProviderIdForUi(currentProvider) !== CANONICAL_OLLAMA_PROVIDER_ID) {
      return currentProvider;
    }
    return providerIdForOllamaMode(ollamaMode);
  }, [currentProvider, ollamaMode]);

  const currentProviderLabel = useMemo(() => {
    if (normalizeProviderIdForUi(currentProvider) === CANONICAL_OLLAMA_PROVIDER_ID) {
      return "Ollama";
    }
    return providerById[currentProvider]?.name || currentProvider;
  }, [currentProvider, providerById]);

  const isProviderActive = useCallback(
    (providerId: string): boolean => {
      if (!featureDrafts) return false;
      return (
        normalizeProviderIdForUi(featureDrafts[featureKey]?.provider || "") ===
        normalizeProviderIdForUi(providerId)
      );
    },
    [featureDrafts, featureKey]
  );

  const hasProviderSavedKey = useCallback(
    (providerId: string): boolean => {
      if (normalizeProviderIdForUi(providerId) === CANONICAL_OLLAMA_PROVIDER_ID) {
        return Boolean(
          featureProviderKeyIndex[featureProviderCacheKey(featureKey, providerIdForOllamaMode("cloud"))] ||
            featureProviderKeyIndex[featureProviderCacheKey(featureKey, CANONICAL_OLLAMA_PROVIDER_ID)]
        );
      }
      return Boolean(featureProviderKeyIndex[featureProviderCacheKey(featureKey, providerId)]);
    },
    [featureProviderKeyIndex, featureKey]
  );

  const canProviderActivate = useCallback(
    (providerId: string): boolean => {
      const hasKey = hasProviderSavedKey(providerId);
      const requiresKey = providerById[providerId]?.requiresApiKey !== false;
      const isOllama = normalizeProviderIdForUi(providerId) === CANONICAL_OLLAMA_PROVIDER_ID;
      
      // Für Ollama: Local braucht keinen Key, Cloud schon
      if (isOllama) {
        const mode = ollamaModesByFeature[featureKey] ?? "local";
        if (mode === "local") return true;
        return hasKey;
      }
      
      return hasKey || !requiresKey;
    },
    [hasProviderSavedKey, providerById, ollamaModesByFeature, featureKey]
  );

  const isActive = isProviderActive(currentProvider);
  const hasSavedKey = hasProviderSavedKey(currentProvider);
  const canActivate = canProviderActivate(currentProvider);

  const activateProvider = useCallback(
    (providerId: string) => {
      setFeatureDrafts((prev) => {
        if (!prev) return prev;
        const current = prev[featureKey];
        const sameProvider =
          normalizeProviderIdForUi(current.provider) === normalizeProviderIdForUi(providerId);
        return {
          ...prev,
          [featureKey]: {
            ...current,
            provider: normalizeProviderIdForUi(providerId),
            model: sameProvider ? current.model : "",
          },
        };
      });
    },
    [setFeatureDrafts, featureKey]
  );

  const activateSpecificProvider = useCallback(
    (providerId: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      activateProvider(providerId);
    },
    [activateProvider]
  );

  return {
    isActive,
    hasSavedKey,
    canActivate,
    activateProvider,
    isProviderActive,
    hasProviderSavedKey,
    canProviderActivate,
    activateSpecificProvider,
    styles: {
      keySaved: KEY_SAVED_BADGE_STYLE,
      active: ACTIVE_BADGE_STYLE,
      checkboxActive: ACTIVE_CHECKBOX_STYLE,
      checkboxInactive: INACTIVE_CHECKBOX_STYLE,
    },
    currentProviderLabel,
    effectiveProviderId,
  };
}
