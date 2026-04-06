/**
 * Bootstrap the central AI database `scriptony_ai`.
 *
 * Creates:
 * - api_keys
 * - feature_config
 * - user_settings
 */

import { Client, Databases, IndexType } from "node-appwrite";
import "../tools/appwrite-env-load.mjs";
import { getAppwriteToolCredentials } from "../tools/_appwrite-tool-creds.mjs";

const { endpoint: ENDPOINT, projectId: PROJECT, apiKey: KEY } = getAppwriteToolCredentials();
const DB_ID = process.env.AI_DATABASE_ID?.trim() || "scriptony_ai";

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(KEY);
const databases = new Databases(client);

function isStatus(error, code) {
  return error?.code === code;
}

async function ensureDatabase() {
  try {
    await databases.get(DB_ID);
  } catch (error) {
    if (!isStatus(error, 404)) throw error;
    await databases.create({ databaseId: DB_ID, name: "Scriptony AI" });
  }
}

async function ensureCollection(collectionId, name) {
  try {
    await databases.getCollection({ databaseId: DB_ID, collectionId });
  } catch (error) {
    if (!isStatus(error, 404)) throw error;
    await databases.createCollection({
      databaseId: DB_ID,
      collectionId,
      name,
      permissions: [],
      documentSecurity: false,
    });
  }
}

async function waitAttributesAvailable(collectionId, keys, maxAttempts = 90, delayMs = 2000) {
  const want = new Set(keys);
  for (let i = 0; i < maxAttempts; i += 1) {
    const list = await databases.listAttributes({ databaseId: DB_ID, collectionId });
    const attrs = list.attributes.filter((entry) => want.has(entry.key));
    const allThere = keys.every((key) => attrs.some((entry) => entry.key === key));
    if (!allThere) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    const pending = attrs.filter((entry) => entry.status !== "available");
    if (pending.length === 0) return;
    const failed = attrs.find((entry) => entry.status === "failed");
    if (failed) throw new Error(`Attribute ${failed.key} failed: ${failed.error || "unknown"}`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Timeout: attributes on ${collectionId} did not become available`);
}

async function waitIndexesAvailable(collectionId, keys, maxAttempts = 90, delayMs = 2000) {
  const want = new Set(keys);
  for (let i = 0; i < maxAttempts; i += 1) {
    const list = await databases.listIndexes({ databaseId: DB_ID, collectionId });
    const indexes = list.indexes.filter((entry) => want.has(entry.key));
    if (indexes.length < keys.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    if (indexes.every((entry) => entry.status === "available")) return;
    const failed = indexes.find((entry) => entry.status === "failed");
    if (failed) throw new Error(`Index ${failed.key} failed: ${failed.error || "unknown"}`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Timeout: indexes on ${collectionId} did not become available`);
}

async function ensureAttribute(collectionId, key, factory) {
  const list = await databases.listAttributes({ databaseId: DB_ID, collectionId });
  if (list.attributes.some((entry) => entry.key === key)) return;
  await factory();
}

async function ensureStringAttribute(collectionId, key, size, required) {
  await ensureAttribute(collectionId, key, () =>
    databases.createStringAttribute({
      databaseId: DB_ID,
      collectionId,
      key,
      size,
      required,
    })
  );
}

async function ensureIntegerAttribute(collectionId, key, required) {
  await ensureAttribute(collectionId, key, () =>
    databases.createIntegerAttribute({
      databaseId: DB_ID,
      collectionId,
      key,
      required,
    })
  );
}

async function ensureFloatAttribute(collectionId, key, required) {
  await ensureAttribute(collectionId, key, () =>
    databases.createFloatAttribute({
      databaseId: DB_ID,
      collectionId,
      key,
      required,
    })
  );
}

async function ensureBooleanAttribute(collectionId, key, required) {
  await ensureAttribute(collectionId, key, () =>
    databases.createBooleanAttribute({
      databaseId: DB_ID,
      collectionId,
      key,
      required,
    })
  );
}

async function ensureIndex(collectionId, key, type, attributes) {
  const list = await databases.listIndexes({ databaseId: DB_ID, collectionId });
  if (list.indexes.some((entry) => entry.key === key)) return;
  await databases.createIndex({
    databaseId: DB_ID,
    collectionId,
    key,
    type,
    attributes,
  });
}

async function setupApiKeys() {
  const col = "api_keys";
  await ensureCollection(col, "API keys");
  await ensureStringAttribute(col, "user_id", 255, true);
  await ensureStringAttribute(col, "feature", 128, false);
  await ensureStringAttribute(col, "provider", 64, true);
  await ensureStringAttribute(col, "api_key", 8192, true);
  await waitAttributesAvailable(col, ["user_id", "feature", "provider", "api_key"]);
  await ensureIndex(col, "idx_user_id", IndexType.Key, ["user_id"]);
  await ensureIndex(col, "idx_user_feature_provider", IndexType.Unique, ["user_id", "feature", "provider"]);
  await waitIndexesAvailable(col, ["idx_user_id", "idx_user_feature_provider"]);
}

async function setupFeatureConfig() {
  const col = "feature_config";
  await ensureCollection(col, "Feature configuration");
  await ensureStringAttribute(col, "user_id", 255, true);
  await ensureStringAttribute(col, "feature", 128, true);
  await ensureStringAttribute(col, "provider", 64, true);
  await ensureStringAttribute(col, "model", 256, true);
  await ensureStringAttribute(col, "voice", 128, false);
  await waitAttributesAvailable(col, ["user_id", "feature", "provider", "model", "voice"]);
  await ensureIndex(col, "idx_fc_user", IndexType.Key, ["user_id"]);
  await ensureIndex(col, "idx_fc_user_feature", IndexType.Unique, ["user_id", "feature"]);
  await waitIndexesAvailable(col, ["idx_fc_user", "idx_fc_user_feature"]);
}

async function setupUserSettings() {
  const col = "user_settings";
  await ensureCollection(col, "User settings");
  await ensureStringAttribute(col, "user_id", 255, true);
  await ensureStringAttribute(col, "active_provider", 64, true);
  await ensureStringAttribute(col, "active_model", 256, true);
  await ensureStringAttribute(col, "system_prompt", 32767, true);
  await ensureFloatAttribute(col, "temperature", true);
  await ensureIntegerAttribute(col, "max_tokens", true);
  await ensureBooleanAttribute(col, "use_rag", true);
  await ensureStringAttribute(col, "ollama_base_url", 2048, false);
  await ensureStringAttribute(col, "settings_json", 32767, false);
  await waitAttributesAvailable(col, [
    "user_id",
    "active_provider",
    "active_model",
    "system_prompt",
    "temperature",
    "max_tokens",
    "use_rag",
    "ollama_base_url",
    "settings_json",
  ]);
  await ensureIndex(col, "idx_us_user", IndexType.Unique, ["user_id"]);
  await waitIndexesAvailable(col, ["idx_us_user"]);
}

await ensureDatabase();
await setupApiKeys();
await setupFeatureConfig();
await setupUserSettings();

console.log(`OK: ${DB_ID} is ready.`);
