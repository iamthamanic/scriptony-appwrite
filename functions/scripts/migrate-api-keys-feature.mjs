import {
  getMissingAppwriteServerEnvKeys,
  loadAppwriteCliEnv,
} from "./load-appwrite-cli-env.mjs";

loadAppwriteCliEnv();

/**
 * One-off migration: set `feature: "assistant_chat"` on legacy `scriptony_ai.api_keys`
 * documents that have no `feature` attribute (provider-only rows).
 *
 * Same env as deployed Appwrite Functions: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID,
 * APPWRITE_API_KEY, optional AI_DATABASE_ID (default scriptony_ai).
 *
 *   cd functions && npm run migrate:api-keys-feature
 *   # or: node functions/scripts/migrate-api-keys-feature.mjs
 *
 * Location: functions/scripts/migrate-api-keys-feature.mjs
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
const COL = "api_keys";

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(KEY);
const databases = new Databases(client);

const res = await databases.listDocuments(DB, COL, [Query.limit(5000)]);
let n = 0;
for (const doc of res.documents) {
  const f = doc.feature;
  if (f !== undefined && f !== null && String(f).trim() !== "") {
    continue;
  }
  await databases.updateDocument(DB, COL, doc.$id, {
    feature: "assistant_chat",
  });
  console.log("updated", doc.$id, "provider=", doc.provider);
  n++;
}
console.log(`Done. Updated ${n} document(s).`);
