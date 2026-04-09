/**
 * Feature-scoped AI API keys stored in Appwrite `scriptony_ai.api_keys`.
 *
 * Location: functions/_shared/ai-service/user-api-keys.ts
 */

import type { Databases } from "node-appwrite";
import { Query } from "node-appwrite";

import { getOptionalEnv } from "../env";
import { DEFAULT_FEATURE_CONFIG } from "./config/settings";

export const AI_API_KEYS_COLLECTION = "api_keys";

export function getAiServiceDatabaseId(): string {
  return getOptionalEnv("AI_DATABASE_ID") || "scriptony_ai";
}

export function getValidFeatureKeys(): string[] {
  return Object.keys(DEFAULT_FEATURE_CONFIG);
}

export function isValidFeatureKey(feature: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEFAULT_FEATURE_CONFIG, feature);
}

/**
 * Resolve stored API key for (user, feature, provider). No cross-feature fallback.
 * Legacy rows without `feature` are used only when no scoped row exists (migration).
 */
export async function getApiKeyForUserFeature(
  databases: Databases,
  userId: string,
  feature: string,
  provider: string
): Promise<string | null> {
  const dbId = getAiServiceDatabaseId();
  const scoped = await databases.listDocuments(dbId, AI_API_KEYS_COLLECTION, [
    Query.equal("user_id", userId),
    Query.equal("feature", feature),
    Query.equal("provider", provider),
  ]);
  if (scoped.documents.length > 0) {
    return String((scoped.documents[0] as { api_key: string }).api_key);
  }

  const legacy = await databases.listDocuments(dbId, AI_API_KEYS_COLLECTION, [
    Query.equal("user_id", userId),
    Query.equal("provider", provider),
  ]);
  for (const doc of legacy.documents) {
    const row = doc as Record<string, unknown>;
    const f = row.feature;
    if (f === undefined || f === null || String(f).trim() === "") {
      return String(row.api_key);
    }
  }
  return null;
}

/**
 * Create or update an API key document for (user, feature, provider).
 */
export async function upsertApiKeyForFeature(
  databases: Databases,
  userId: string,
  feature: string,
  provider: string,
  apiKey: string
): Promise<void> {
  const dbId = getAiServiceDatabaseId();
  const existing = await databases.listDocuments(dbId, AI_API_KEYS_COLLECTION, [
    Query.equal("user_id", userId),
    Query.equal("feature", feature),
    Query.equal("provider", provider),
  ]);

  if (existing.documents.length > 0) {
    await databases.updateDocument(dbId, AI_API_KEYS_COLLECTION, existing.documents[0].$id, {
      api_key: apiKey,
    });
    return;
  }

  await databases.createDocument(dbId, AI_API_KEYS_COLLECTION, "unique()", {
    user_id: userId,
    feature,
    provider,
    api_key: apiKey,
  });
}

export async function deleteApiKeyForFeature(
  databases: Databases,
  userId: string,
  feature: string,
  provider: string
): Promise<boolean> {
  const dbId = getAiServiceDatabaseId();
  const existing = await databases.listDocuments(dbId, AI_API_KEYS_COLLECTION, [
    Query.equal("user_id", userId),
    Query.equal("feature", feature),
    Query.equal("provider", provider),
  ]);
  if (existing.documents.length > 0) {
    await databases.deleteDocument(dbId, AI_API_KEYS_COLLECTION, existing.documents[0].$id);
    return true;
  }

  const legacy = await databases.listDocuments(dbId, AI_API_KEYS_COLLECTION, [
    Query.equal("user_id", userId),
    Query.equal("provider", provider),
  ]);
  for (const doc of legacy.documents) {
    const row = doc as Record<string, unknown>;
    const f = row.feature;
    if (f === undefined || f === null || String(f).trim() === "") {
      await databases.deleteDocument(dbId, AI_API_KEYS_COLLECTION, doc.$id);
      return true;
    }
  }
  return false;
}
