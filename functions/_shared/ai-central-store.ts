/**
 * Central AI configuration store backed by Appwrite database `scriptony_ai`.
 *
 * This is the single source of truth for:
 * - feature-scoped provider/model assignments
 * - feature/provider API keys
 * - legacy assistant/image compatibility settings
 */

import { Client, Databases, ID, Query } from "node-appwrite";
import { docToRow } from "./appwrite-db";
import {
  type AiSettingsJsonV1,
  mergeSettingsJson,
  OLLAMA_CLOUD_ORIGIN,
  parseSettingsJsonField,
} from "./ai-feature-profile";
import { DEFAULT_ASSISTANT_SYSTEM_PROMPT } from "./default-assistant-system-prompt";
import {
  getAppwriteApiKey,
  getAppwriteEndpoint,
  getAppwriteProjectId,
} from "./env";
import process from "node:process";

const AI_DB_ID = (process.env.AI_DATABASE_ID || "scriptony_ai").trim();
const API_KEYS_COLLECTION = "api_keys";
const FEATURE_CONFIG_COLLECTION = "feature_config";
const USER_SETTINGS_COLLECTION = "user_settings";

let aiDatabasesCache: {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databases: Databases;
} | null = null;

export type CanonicalAiFeature =
  | "assistant_chat"
  | "assistant_embeddings"
  | "creative_gym"
  | "image_generation"
  | "audio_stt"
  | "audio_tts"
  | "video_generation";

export type CanonicalProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "openrouter"
  | "deepseek"
  | "ollama"
  | "ollama_local"
  | "ollama_cloud"
  | "elevenlabs"
  | "huggingface";

export type FeatureConfig = {
  provider: CanonicalProvider;
  model: string;
  voice?: string;
};

export type UserSettingsRow = {
  id: string;
  user_id: string;
  active_provider: CanonicalProvider;
  active_model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  use_rag: boolean;
  ollama_base_url: string | null;
  settings_json: string | null;
  settings_json_parsed: AiSettingsJsonV1;
};

type FeatureConfigRow = {
  id: string;
  user_id: string;
  feature: CanonicalAiFeature;
  provider: CanonicalProvider;
  model: string;
  voice?: string | null;
};

type ApiKeyRow = {
  id: string;
  user_id: string;
  feature?: string | null;
  provider: CanonicalProvider;
  api_key: string;
};

export type LegacyAssistantSettingsRow = {
  id: string;
  user_id: string;
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  google_api_key: string | null;
  openrouter_api_key: string | null;
  deepseek_api_key: string | null;
  ollama_api_key: string | null;
  ollama_base_url: string | null;
  active_provider: CanonicalProvider;
  active_model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  use_rag: boolean;
  settings_json: string;
  settings_json_parsed: AiSettingsJsonV1;
};

export type LegacyImageSettingsRow = {
  id: string;
  user_id: string;
  settings_json: string;
  settings_json_parsed: AiSettingsJsonV1;
  image_provider: "ollama" | "openrouter";
  ollama_image_api_key: string;
  openrouter_image_api_key: string;
};

export type ResolvedFeatureRuntime = {
  feature: CanonicalAiFeature;
  config: FeatureConfig;
  apiKey: string | null;
  baseUrl?: string;
  userSettings: UserSettingsRow;
};

export const DEFAULT_FEATURE_CONFIG: Record<CanonicalAiFeature, FeatureConfig> =
  {
    assistant_chat: { provider: "openai", model: "gpt-4o-mini" },
    assistant_embeddings: {
      provider: "openai",
      model: "text-embedding-3-small",
    },
    creative_gym: { provider: "openai", model: "gpt-4o" },
    image_generation: { provider: "openai", model: "gpt-image-1" },
    audio_stt: { provider: "openai", model: "whisper-1" },
    audio_tts: {
      provider: "elevenlabs",
      model: "eleven_multilingual_v2",
      voice: "21m00Tcm4TlvDq8ikWAM",
    },
    video_generation: { provider: "openrouter", model: "runway/gen3a_turbo" },
  };

export const DEFAULT_USER_SETTINGS = {
  active_provider: "openai" as CanonicalProvider,
  active_model: "gpt-4o-mini",
  system_prompt: DEFAULT_ASSISTANT_SYSTEM_PROMPT,
  temperature: 0.7,
  max_tokens: 2000,
  use_rag: true,
  ollama_base_url: null as string | null,
  settings_json: "{}",
};

function isOllamaFamilyProvider(
  provider: string,
): provider is "ollama" | "ollama_local" | "ollama_cloud" {
  return (
    provider === "ollama" ||
    provider === "ollama_local" ||
    provider === "ollama_cloud"
  );
}

function getAiDatabases(): Databases {
  const endpoint = getAppwriteEndpoint();
  const projectId = getAppwriteProjectId();
  const apiKey = getAppwriteApiKey();

  if (
    !aiDatabasesCache ||
    aiDatabasesCache.endpoint !== endpoint ||
    aiDatabasesCache.projectId !== projectId ||
    aiDatabasesCache.apiKey !== apiKey
  ) {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);
    aiDatabasesCache = {
      endpoint,
      projectId,
      apiKey,
      databases: new Databases(client),
    };
  }

  return aiDatabasesCache.databases;
}

function normalizeFeature(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeApiKey(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function cleanBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

async function listDocuments(
  collectionId: string,
  queries: string[],
): Promise<Record<string, any>[]> {
  const response = await getAiDatabases().listDocuments(
    AI_DB_ID,
    collectionId,
    [...queries, Query.limit(200)],
  );
  return response.documents.map((doc) =>
    docToRow(doc as Record<string, unknown>)
  );
}

async function getOrCreateUserSettingsDocument(
  userId: string,
): Promise<Record<string, any>> {
  const rows = await listDocuments(USER_SETTINGS_COLLECTION, [
    Query.equal("user_id", userId),
  ]);
  if (rows[0]) return rows[0];

  try {
    const created = await getAiDatabases().createDocument(
      AI_DB_ID,
      USER_SETTINGS_COLLECTION,
      ID.unique(),
      {
        user_id: userId,
        ...DEFAULT_USER_SETTINGS,
      },
    );
    return docToRow(created as Record<string, unknown>);
  } catch (error: any) {
    // Parallel first-access requests can race on the unique user_id index.
    if (error?.code !== 409) {
      throw error;
    }
    const existing = await listDocuments(USER_SETTINGS_COLLECTION, [
      Query.equal("user_id", userId),
    ]);
    if (existing[0]) {
      return existing[0];
    }
    throw error;
  }
}

async function listApiKeyRows(userId: string): Promise<ApiKeyRow[]> {
  const rows = await listDocuments(API_KEYS_COLLECTION, [
    Query.equal("user_id", userId),
  ]);
  return rows as ApiKeyRow[];
}

async function listFeatureConfigRows(
  userId: string,
): Promise<FeatureConfigRow[]> {
  const rows = await listDocuments(FEATURE_CONFIG_COLLECTION, [
    Query.equal("user_id", userId),
  ]);
  return rows as FeatureConfigRow[];
}

function findApiKeyRow(
  rows: ApiKeyRow[],
  provider: CanonicalProvider,
  feature: CanonicalAiFeature,
): ApiKeyRow | null {
  const exact = rows.find(
    (row) =>
      row.provider === provider && normalizeFeature(row.feature) === feature,
  );
  if (exact) return exact;

  const providerOnly = rows.find(
    (row) => row.provider === provider && normalizeFeature(row.feature) === "",
  );
  if (providerOnly) return providerOnly;

  if (feature !== "assistant_chat") {
    const assistantFallback = rows.find(
      (row) =>
        row.provider === provider &&
        normalizeFeature(row.feature) === "assistant_chat",
    );
    if (assistantFallback) return assistantFallback;
  }

  return null;
}

function serializeSettingsJson(json: AiSettingsJsonV1): string {
  return JSON.stringify(json);
}

function materializeFeatureConfigMap(
  rows: FeatureConfigRow[],
): Record<CanonicalAiFeature, FeatureConfig> {
  const out = { ...DEFAULT_FEATURE_CONFIG };
  for (const row of rows) {
    if (!(row.feature in out)) continue;
    out[row.feature as CanonicalAiFeature] = {
      provider: row.provider,
      model: row.model,
      ...(cleanNullableString(row.voice)
        ? { voice: cleanNullableString(row.voice) || undefined }
        : {}),
    };
  }
  return out;
}

function toUserSettingsRow(doc: Record<string, any>): UserSettingsRow {
  const settings_json = typeof doc.settings_json === "string"
    ? doc.settings_json
    : "{}";
  return {
    id: String(doc.id),
    user_id: String(doc.user_id),
    active_provider:
      (cleanNullableString(doc.active_provider) as CanonicalProvider | null) ||
      DEFAULT_USER_SETTINGS.active_provider,
    active_model: cleanNullableString(doc.active_model) ||
      DEFAULT_USER_SETTINGS.active_model,
    system_prompt: cleanNullableString(doc.system_prompt) ||
      DEFAULT_USER_SETTINGS.system_prompt,
    temperature: cleanNumber(
      doc.temperature,
      DEFAULT_USER_SETTINGS.temperature,
    ),
    max_tokens: cleanNumber(doc.max_tokens, DEFAULT_USER_SETTINGS.max_tokens),
    use_rag: cleanBoolean(doc.use_rag, DEFAULT_USER_SETTINGS.use_rag),
    ollama_base_url: cleanNullableString(doc.ollama_base_url),
    settings_json,
    settings_json_parsed: parseSettingsJsonField(settings_json),
  };
}

async function updateUserSettingsDocument(
  id: string,
  changes: Record<string, unknown>,
): Promise<Record<string, any>> {
  const doc = await getAiDatabases().updateDocument(
    AI_DB_ID,
    USER_SETTINGS_COLLECTION,
    id,
    changes,
  );
  return docToRow(doc as Record<string, unknown>);
}

async function upsertFeatureConfigRow(
  userId: string,
  feature: CanonicalAiFeature,
  config: FeatureConfig,
): Promise<void> {
  const existingRows = await listFeatureConfigRows(userId);
  const existing = existingRows.find((row) => row.feature === feature);
  const payload: Record<string, unknown> = {
    user_id: userId,
    feature,
    provider: config.provider,
    model: config.model,
    voice: cleanNullableString(config.voice) || undefined,
  };

  if (existing) {
    await getAiDatabases().updateDocument(
      AI_DB_ID,
      FEATURE_CONFIG_COLLECTION,
      existing.id,
      payload,
    );
    return;
  }

  await getAiDatabases().createDocument(
    AI_DB_ID,
    FEATURE_CONFIG_COLLECTION,
    ID.unique(),
    payload,
  );
}

async function upsertApiKeyRow(
  userId: string,
  feature: CanonicalAiFeature | "",
  provider: CanonicalProvider,
  apiKey: string,
): Promise<void> {
  const rows = await listApiKeyRows(userId);
  const existing = rows.find(
    (row) =>
      row.provider === provider && normalizeFeature(row.feature) === feature,
  );
  const payload: Record<string, unknown> = {
    user_id: userId,
    feature,
    provider,
    api_key: apiKey,
  };

  if (existing) {
    await getAiDatabases().updateDocument(
      AI_DB_ID,
      API_KEYS_COLLECTION,
      existing.id,
      payload,
    );
    return;
  }

  await getAiDatabases().createDocument(
    AI_DB_ID,
    API_KEYS_COLLECTION,
    ID.unique(),
    payload,
  );
}

async function deleteApiKeyRow(
  userId: string,
  feature: CanonicalAiFeature | "",
  provider: CanonicalProvider,
): Promise<void> {
  const rows = await listApiKeyRows(userId);
  const existing = rows.find(
    (row) =>
      row.provider === provider && normalizeFeature(row.feature) === feature,
  );
  if (!existing) return;
  await getAiDatabases().deleteDocument(
    AI_DB_ID,
    API_KEYS_COLLECTION,
    existing.id,
  );
}

function assistantProviderFieldMap(): Record<string, CanonicalProvider> {
  return {
    openai_api_key: "openai",
    anthropic_api_key: "anthropic",
    google_api_key: "google",
    openrouter_api_key: "openrouter",
    deepseek_api_key: "deepseek",
  };
}

function imageProviderFromJson(
  json: AiSettingsJsonV1,
): "ollama" | "openrouter" {
  return json.image?.provider === "openrouter" ? "openrouter" : "ollama";
}

function applyAssistantFeatureProfileSync(
  featureMap: Record<CanonicalAiFeature, FeatureConfig>,
  settingsJson: AiSettingsJsonV1,
): Record<CanonicalAiFeature, FeatureConfig> {
  const assistant = settingsJson.feature_profiles?.assistant;
  if (assistant?.provider || assistant?.model) {
    featureMap.assistant_chat = {
      ...featureMap.assistant_chat,
      ...(assistant.provider
        ? { provider: assistant.provider as CanonicalProvider }
        : {}),
      ...(assistant.model ? { model: assistant.model } : {}),
    };
  }

  const gym = settingsJson.feature_profiles?.gym;
  if (gym?.provider || gym?.model) {
    featureMap.creative_gym = {
      ...featureMap.creative_gym,
      ...(gym.provider ? { provider: gym.provider as CanonicalProvider } : {}),
      ...(gym.model ? { model: gym.model } : {}),
    };
  }

  const coverProvider = settingsJson.image?.feature_profiles?.cover?.provider;
  const coverModel = settingsJson.image?.feature_profiles?.cover?.model ||
    settingsJson.image?.provider_models?.[
      coverProvider || imageProviderFromJson(settingsJson)
    ] ||
    settingsJson.image?.model;
  if (coverProvider || coverModel) {
    featureMap.image_generation = {
      ...featureMap.image_generation,
      ...(coverProvider ? { provider: coverProvider } : {}),
      ...(coverModel ? { model: coverModel } : {}),
    };
  }

  return featureMap;
}

export async function getUserSettings(
  userId: string,
): Promise<UserSettingsRow> {
  const doc = await getOrCreateUserSettingsDocument(userId);
  return toUserSettingsRow(doc);
}

export async function getFeatureConfigMap(
  userId: string,
): Promise<Record<CanonicalAiFeature, FeatureConfig>> {
  const [settings, rows] = await Promise.all([
    getUserSettings(userId),
    listFeatureConfigRows(userId),
  ]);
  return applyAssistantFeatureProfileSync(
    materializeFeatureConfigMap(rows),
    settings.settings_json_parsed,
  );
}

export async function getFeatureConfig(
  userId: string,
  feature: CanonicalAiFeature,
): Promise<FeatureConfig> {
  const map = await getFeatureConfigMap(userId);
  return map[feature];
}

export async function updateFeatureConfig(
  userId: string,
  feature: CanonicalAiFeature,
  config: FeatureConfig,
): Promise<FeatureConfig> {
  await upsertFeatureConfigRow(userId, feature, config);
  return getFeatureConfig(userId, feature);
}

export async function listMaskedApiKeys(
  userId: string,
): Promise<
  Array<{
    feature: string;
    provider: string;
    has_key: true;
    key_preview: string;
  }>
> {
  const rows = await listApiKeyRows(userId);
  return rows
    .filter((row) => normalizeApiKey(row.api_key))
    .map((row) => {
      const apiKey = normalizeApiKey(row.api_key);
      return {
        feature: normalizeFeature(row.feature) || "global",
        provider: row.provider,
        has_key: true as const,
        key_preview: apiKey.length > 12
          ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
          : `${apiKey.slice(0, 4)}...`,
      };
    });
}

export async function getStoredApiKey(
  userId: string,
  feature: CanonicalAiFeature,
  provider: CanonicalProvider,
): Promise<string | null> {
  const rows = await listApiKeyRows(userId);
  const row = findApiKeyRow(rows, provider, feature);
  return row ? normalizeApiKey(row.api_key) || null : null;
}

export async function updateApiKey(
  userId: string,
  feature: CanonicalAiFeature | "",
  provider: CanonicalProvider,
  apiKey: string | null,
): Promise<void> {
  const clean = cleanNullableString(apiKey);
  if (!clean) {
    await deleteApiKeyRow(userId, feature, provider);
    return;
  }
  await upsertApiKeyRow(userId, feature, provider, clean);
}

export async function resolveFeatureRuntime(
  userId: string,
  feature: CanonicalAiFeature,
): Promise<ResolvedFeatureRuntime> {
  const [userSettings, featureMap, apiRows] = await Promise.all([
    getUserSettings(userId),
    getFeatureConfigMap(userId),
    listApiKeyRows(userId),
  ]);

  const config = featureMap[feature];
  const keyRow = findApiKeyRow(apiRows, config.provider, feature);
  const apiKey = keyRow ? normalizeApiKey(keyRow.api_key) || null : null;

  let baseUrl: string | undefined;
  if (isOllamaFamilyProvider(config.provider)) {
    if (config.provider === "ollama_cloud") {
      baseUrl = OLLAMA_CLOUD_ORIGIN;
    } else if (config.provider === "ollama_local") {
      baseUrl = userSettings.ollama_base_url || undefined;
    } else {
      const mode = userSettings.settings_json_parsed.ollama?.mode === "cloud"
        ? "cloud"
        : "local";
      baseUrl = mode === "cloud"
        ? OLLAMA_CLOUD_ORIGIN
        : userSettings.ollama_base_url || undefined;
    }
  }

  return {
    feature,
    config,
    apiKey,
    ...(baseUrl ? { baseUrl } : {}),
    userSettings,
  };
}

export async function getLegacyAssistantSettings(
  userId: string,
): Promise<LegacyAssistantSettingsRow> {
  const [userSettings, featureMap, apiRows] = await Promise.all([
    getUserSettings(userId),
    getFeatureConfigMap(userId),
    listApiKeyRows(userId),
  ]);

  const assistantConfig = featureMap.assistant_chat;
  const providerKeys = assistantProviderFieldMap();

  const settings_json = userSettings.settings_json || "{}";
  const out: LegacyAssistantSettingsRow = {
    id: userSettings.id,
    user_id: userSettings.user_id,
    openai_api_key: null,
    anthropic_api_key: null,
    google_api_key: null,
    openrouter_api_key: null,
    deepseek_api_key: null,
    ollama_api_key: null,
    ollama_base_url: userSettings.ollama_base_url,
    active_provider: assistantConfig.provider,
    active_model: assistantConfig.model,
    system_prompt: userSettings.system_prompt,
    temperature: userSettings.temperature,
    max_tokens: userSettings.max_tokens,
    use_rag: userSettings.use_rag,
    settings_json,
    settings_json_parsed: userSettings.settings_json_parsed,
  };

  for (const [field, provider] of Object.entries(providerKeys)) {
    const row = findApiKeyRow(apiRows, provider, "assistant_chat");
    (out as Record<string, unknown>)[field] = row
      ? normalizeApiKey(row.api_key) || null
      : null;
  }

  const ollamaRow = findApiKeyRow(apiRows, "ollama", "assistant_chat");
  out.ollama_api_key = ollamaRow
    ? normalizeApiKey(ollamaRow.api_key) || null
    : null;

  return out;
}

export async function updateLegacyAssistantSettings(
  userId: string,
  patch: Record<string, unknown>,
): Promise<LegacyAssistantSettingsRow> {
  const [currentUserSettings, currentFeatureMap] = await Promise.all([
    getUserSettings(userId),
    getFeatureConfigMap(userId),
  ]);

  const nextFeatureMap = { ...currentFeatureMap };
  const userSettingsChanges: Record<string, unknown> = {};

  if (patch.active_provider || patch.active_model) {
    nextFeatureMap.assistant_chat = {
      ...nextFeatureMap.assistant_chat,
      ...(cleanNullableString(patch.active_provider)
        ? {
          provider: cleanNullableString(
            patch.active_provider,
          ) as CanonicalProvider,
        }
        : {}),
      ...(cleanNullableString(patch.active_model)
        ? { model: cleanNullableString(patch.active_model) || "" }
        : {}),
    };
  }

  if (patch.system_prompt !== undefined) {
    userSettingsChanges.system_prompt =
      cleanNullableString(patch.system_prompt) ||
      DEFAULT_USER_SETTINGS.system_prompt;
  }
  if (patch.temperature !== undefined) {
    userSettingsChanges.temperature = cleanNumber(
      patch.temperature,
      DEFAULT_USER_SETTINGS.temperature,
    );
  }
  if (patch.max_tokens !== undefined) {
    userSettingsChanges.max_tokens = cleanNumber(
      patch.max_tokens,
      DEFAULT_USER_SETTINGS.max_tokens,
    );
  }
  if (patch.use_rag !== undefined) {
    userSettingsChanges.use_rag = cleanBoolean(
      patch.use_rag,
      DEFAULT_USER_SETTINGS.use_rag,
    );
  }
  if (patch.ollama_base_url !== undefined) {
    userSettingsChanges.ollama_base_url = cleanNullableString(
      patch.ollama_base_url,
    );
  }

  let mergedSettingsJson = currentUserSettings.settings_json_parsed;
  if (patch.settings_json !== undefined && patch.settings_json !== null) {
    mergedSettingsJson = typeof patch.settings_json === "string"
      ? mergeSettingsJson(
        currentUserSettings.settings_json,
        parseSettingsJsonField(patch.settings_json),
      )
      : mergeSettingsJson(
        currentUserSettings.settings_json,
        patch.settings_json as Partial<AiSettingsJsonV1>,
      );
  }

  userSettingsChanges.settings_json = serializeSettingsJson(mergedSettingsJson);
  nextFeatureMap.assistant_chat = {
    ...nextFeatureMap.assistant_chat,
    provider: mergedSettingsJson.feature_profiles?.assistant?.provider
      ? (mergedSettingsJson.feature_profiles.assistant
        .provider as CanonicalProvider)
      : nextFeatureMap.assistant_chat.provider,
    model: mergedSettingsJson.feature_profiles?.assistant?.model ||
      nextFeatureMap.assistant_chat.model,
  };
  nextFeatureMap.creative_gym = {
    ...nextFeatureMap.creative_gym,
    provider: mergedSettingsJson.feature_profiles?.gym?.provider
      ? (mergedSettingsJson.feature_profiles.gym.provider as CanonicalProvider)
      : nextFeatureMap.creative_gym.provider,
    model: mergedSettingsJson.feature_profiles?.gym?.model ||
      nextFeatureMap.creative_gym.model,
  };

  await Promise.all([
    updateUserSettingsDocument(currentUserSettings.id, {
      ...userSettingsChanges,
      active_provider: nextFeatureMap.assistant_chat.provider,
      active_model: nextFeatureMap.assistant_chat.model,
    }),
    upsertFeatureConfigRow(
      userId,
      "assistant_chat",
      nextFeatureMap.assistant_chat,
    ),
    upsertFeatureConfigRow(userId, "creative_gym", nextFeatureMap.creative_gym),
  ]);

  const providerFields = assistantProviderFieldMap();
  const keyUpdates = Object.entries(providerFields).map(
    async ([field, provider]) => {
      if (!(field in patch)) return;
      await updateApiKey(
        userId,
        "assistant_chat",
        provider,
        cleanNullableString(patch[field]),
      );
    },
  );

  if ("ollama_api_key" in patch) {
    keyUpdates.push(
      updateApiKey(
        userId,
        "assistant_chat",
        "ollama",
        cleanNullableString(patch.ollama_api_key),
      ),
    );
  }

  await Promise.all(keyUpdates);
  return getLegacyAssistantSettings(userId);
}

export async function getLegacyImageSettings(
  userId: string,
): Promise<LegacyImageSettingsRow> {
  const [userSettings, featureMap, apiRows] = await Promise.all([
    getUserSettings(userId),
    getFeatureConfigMap(userId),
    listApiKeyRows(userId),
  ]);

  const imageConfig = featureMap.image_generation;
  const settings_json = userSettings.settings_json || "{}";
  return {
    id: userSettings.id,
    user_id: userSettings.user_id,
    settings_json,
    settings_json_parsed: userSettings.settings_json_parsed,
    image_provider: imageConfig.provider === "openrouter"
      ? "openrouter"
      : "ollama",
    ollama_image_api_key:
      findApiKeyRow(apiRows, "ollama", "image_generation")?.api_key || "",
    openrouter_image_api_key:
      findApiKeyRow(apiRows, "openrouter", "image_generation")?.api_key || "",
  };
}

export async function updateLegacyImageSettings(
  userId: string,
  patch: Record<string, unknown>,
): Promise<LegacyImageSettingsRow> {
  const [currentUserSettings, currentFeatureMap, currentImageSettings] =
    await Promise.all([
      getUserSettings(userId),
      getFeatureConfigMap(userId),
      getLegacyImageSettings(userId),
    ]);

  let mergedSettingsJson = currentUserSettings.settings_json_parsed;
  if (patch.settings_json !== undefined && patch.settings_json !== null) {
    mergedSettingsJson = typeof patch.settings_json === "string"
      ? mergeSettingsJson(
        currentUserSettings.settings_json,
        parseSettingsJsonField(patch.settings_json),
      )
      : mergeSettingsJson(
        currentUserSettings.settings_json,
        patch.settings_json as Partial<AiSettingsJsonV1>,
      );
  }

  const provider =
    patch.image_provider === "openrouter" || patch.image_provider === "ollama"
      ? (patch.image_provider as "openrouter" | "ollama")
      : currentImageSettings.image_provider;

  const mergedImageBlock = {
    ...(mergedSettingsJson.image || {}),
    provider,
  };
  mergedSettingsJson = {
    ...mergedSettingsJson,
    image: mergedImageBlock,
  };

  const coverProvider =
    mergedSettingsJson.image?.feature_profiles?.cover?.provider || provider;
  const coverModel = mergedSettingsJson.image?.feature_profiles?.cover?.model ||
    mergedSettingsJson.image?.provider_models?.[coverProvider] ||
    mergedSettingsJson.image?.model ||
    currentFeatureMap.image_generation.model;

  await Promise.all([
    updateUserSettingsDocument(currentUserSettings.id, {
      settings_json: serializeSettingsJson(mergedSettingsJson),
    }),
    upsertFeatureConfigRow(userId, "image_generation", {
      provider: coverProvider,
      model: coverModel,
    }),
  ]);

  const updates: Array<Promise<void>> = [];
  if ("ollama_image_api_key" in patch) {
    updates.push(
      updateApiKey(
        userId,
        "image_generation",
        "ollama",
        cleanNullableString(patch.ollama_image_api_key),
      ),
    );
  }
  if ("openrouter_image_api_key" in patch) {
    updates.push(
      updateApiKey(
        userId,
        "image_generation",
        "openrouter",
        cleanNullableString(patch.openrouter_image_api_key),
      ),
    );
  }

  await Promise.all(updates);
  return getLegacyImageSettings(userId);
}
