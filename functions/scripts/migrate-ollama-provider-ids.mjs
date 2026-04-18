import {
  getMissingAppwriteServerEnvKeys,
  loadAppwriteCliEnv,
} from "./load-appwrite-cli-env.mjs";

loadAppwriteCliEnv();

/**
 * One-off migration: normalizes feature_config rows that have provider "ollama_local" or "ollama_cloud"
 * to canonical "ollama", storing the mode in user_settings.settings_json.ollama.mode.
 * Also normalizes api_keys rows with legacy provider IDs.
 *
 * Idempotent: safe to run multiple times.
 *
 * Same env as deployed Appwrite Functions: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID,
 * APPWRITE_API_KEY, optional AI_DATABASE_ID (default scriptony_ai).
 *
 *   cd functions && node scripts/migrate-ollama-provider-ids.mjs
 *
 * Location: functions/scripts/migrate-ollama-provider-ids.mjs
 */

import { Client, Databases, Query } from "node-appwrite";
import process from "node:process";

const missingEnv = getMissingAppwriteServerEnvKeys();
if (missingEnv.length > 0) {
  console.error("Missing environment variables:");
  for (const line of missingEnv) {
    console.error(`  • ${line}`);
  }
  console.error(
    "  .env.local: VITE_APPWRITE_*; Appwrite key as APPWRITE_API_KEY or APPWRITE_APIKEY.",
  );
  process.exit(1);
}

const ENDPOINT = process.env.APPWRITE_ENDPOINT?.trim();
const PROJECT = process.env.APPWRITE_PROJECT_ID?.trim();
const KEY = process.env.APPWRITE_API_KEY?.trim();
const DB = process.env.AI_DATABASE_ID?.trim() || "scriptony_ai";

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(KEY);
const databases = new Databases(client);

const OLLAMA_FAMILY_IDS = ["ollama_local", "ollama_cloud"];
const LEGACY_TO_MODE = { ollama_cloud: "cloud", ollama_local: "local" };

async function migrateFeatureConfig() {
  console.log("\n=== Migrating feature_config collection ===");
  const res = await databases.listDocuments(DB, "feature_config", [
    Query.limit(5000),
  ]);
  let updated = 0;

  for (const doc of res.documents) {
    if (!OLLAMA_FAMILY_IDS.includes(doc.provider)) continue;

    const mode = LEGACY_TO_MODE[doc.provider] || "local";
    console.log(
      `  feature_config ${doc.$id}: provider="${doc.provider}" → "ollama" (mode=${mode}), feature=${doc.feature}`,
    );

    await databases.updateDocument(DB, "feature_config", doc.$id, {
      provider: "ollama",
    });

    // Update user settings to reflect the Ollama mode
    await updateUserOllamaMode(doc.user_id, doc.feature, mode);
    updated++;
  }

  console.log(`feature_config: Updated ${updated} document(s).`);
  return updated;
}

async function migrateApiKeys() {
  console.log("\n=== Migrating api_keys collection ===");
  const res = await databases.listDocuments(DB, "api_keys", [
    Query.limit(5000),
  ]);
  let updated = 0;

  for (const doc of res.documents) {
    if (!OLLAMA_FAMILY_IDS.includes(doc.provider)) continue;

    const mode = LEGACY_TO_MODE[doc.provider] || "local";
    console.log(
      `  api_keys ${doc.$id}: provider="${doc.provider}" → "ollama" (mode=${mode}), feature=${doc.feature}`,
    );

    await databases.updateDocument(DB, "api_keys", doc.$id, {
      provider: "ollama",
    });
    updated++;
  }

  console.log(`api_keys: Updated ${updated} document(s).`);
  return updated;
}

async function updateUserOllamaMode(userId, _featureKey, mode) {
  if (!userId) return;

  try {
    const settingsRes = await databases.listDocuments(DB, "user_settings", [
      Query.equal("user_id", userId),
      Query.limit(1),
    ]);

    if (settingsRes.documents.length === 0) return;

    const settingsDoc = settingsRes.documents[0];
    let settingsJson = {};

    try {
      settingsJson = settingsDoc.settings_json
        ? JSON.parse(settingsDoc.settings_json)
        : {};
    } catch {
      // If parsing fails, start fresh
    }

    // Merge ollama mode into settings_json
    const currentOllama = settingsJson.ollama || {};
    settingsJson.ollama = {
      ...currentOllama,
      mode,
    };

    await databases.updateDocument(DB, "user_settings", settingsDoc.$id, {
      settings_json: JSON.stringify(settingsJson),
    });

    console.log(
      `    Updated user_settings ${settingsDoc.$id} for user ${userId}: ollama.mode=${mode}`,
    );
  } catch (err) {
    console.warn(
      `    Could not update user_settings for user ${userId}: ${err.message}`,
    );
  }
}

async function main() {
  console.log("Ollama Provider ID Migration");
  console.log("============================");
  console.log(`Database: ${DB}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log("");

  const featureConfigUpdated = await migrateFeatureConfig();
  const apiKeysUpdated = await migrateApiKeys();

  console.log("\n=== Migration Complete ===");
  console.log(`feature_config: ${featureConfigUpdated} document(s) updated`);
  console.log(`api_keys: ${apiKeysUpdated} document(s) updated`);
  console.log("");
  console.log(
    "After this migration, the frontend normalizes all Ollama variants to canonical",
  );
  console.log(
    "'ollama' on load, and saves with the correct ollama_local/ollama_cloud runtime ID.",
  );
  console.log(
    "Legacy ollama_local/ollama_cloud entries in feature_config and api_keys are now 'ollama'.",
  );
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
