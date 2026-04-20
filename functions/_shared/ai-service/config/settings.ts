/**
 * AI settings management backed by central Appwrite database `scriptony_ai`.
 */

import {
  type CanonicalAiFeature,
  DEFAULT_FEATURE_CONFIG,
  type FeatureConfig,
  getFeatureConfigMap,
  getUserSettings,
  listMaskedApiKeys,
  resolveFeatureRuntime,
  updateApiKey as updateCentralApiKey,
  updateFeatureConfig as updateCentralFeatureConfig,
  type UserSettingsRow,
} from "../../ai-central-store";

export interface AISettings {
  api_keys: Record<string, boolean>;
  features: Record<CanonicalAiFeature, FeatureConfig>;
  user: UserSettingsRow;
}

export { DEFAULT_FEATURE_CONFIG };
export type { FeatureConfig };

export async function getAISettings(userId: string): Promise<AISettings> {
  const [features, user, keys] = await Promise.all([
    getFeatureConfigMap(userId),
    getUserSettings(userId),
    listMaskedApiKeys(userId),
  ]);

  const api_keys: Record<string, boolean> = {};
  for (const entry of keys) {
    api_keys[`${entry.feature}:${entry.provider}`] = true;
  }

  return {
    api_keys,
    features,
    user,
  };
}

export async function updateAISettings(
  userId: string,
  settings: Partial<AISettings>,
): Promise<void> {
  if (settings.features) {
    await Promise.all(
      Object.entries(settings.features).map(([feature, config]) =>
        updateCentralFeatureConfig(
          userId,
          feature as CanonicalAiFeature,
          config,
        )
      ),
    );
  }
}

export async function updateAPIKey(
  userId: string,
  provider: string,
  apiKey: string,
  feature: CanonicalAiFeature | "" = "",
): Promise<void> {
  await updateCentralApiKey(userId, feature, provider as any, apiKey);
}

export async function updateFeatureConfig(
  userId: string,
  feature: keyof typeof DEFAULT_FEATURE_CONFIG,
  config: FeatureConfig,
): Promise<void> {
  await updateCentralFeatureConfig(
    userId,
    feature as CanonicalAiFeature,
    config,
  );
}

export function hasAPIKey(settings: AISettings, provider: string): boolean {
  return Object.keys(settings.api_keys).some((key) =>
    key.endsWith(`:${provider}`)
  );
}

export function isFeatureConfigured(
  settings: AISettings,
  feature: keyof typeof DEFAULT_FEATURE_CONFIG,
): boolean {
  const config = settings.features[feature];
  return Boolean(config?.provider && config?.model);
}

export { resolveFeatureRuntime };
