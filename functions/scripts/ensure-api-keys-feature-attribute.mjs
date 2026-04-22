import {
  getMissingAppwriteServerEnvKeys,
  loadAppwriteCliEnv,
} from "./load-appwrite-cli-env.mjs";

loadAppwriteCliEnv();

/**
 * Erstellt per Appwrite Server API (node-appwrite) das String-Attribut `feature`
 * auf der Collection `api_keys` (DB scriptony_ai), falls es noch fehlt.
 * Wartet, bis der Status `available` ist (Attribute werden asynchron gebaut).
 *
 * Env wie bei deployten Functions: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID,
 * APPWRITE_API_KEY, optional AI_DATABASE_ID.
 *
 *   cd functions && npm run appwrite:ensure-api-keys-feature
 *
 * Location: functions/scripts/ensure-api-keys-feature-attribute.mjs
 */

import { Client, Databases } from "node-appwrite";
import process from "node:process";

const missingEnv = getMissingAppwriteServerEnvKeys();
if (missingEnv.length > 0) {
  console.error("Missing environment variables:");
  for (const line of missingEnv) {
    console.error(`  • ${line}`);
  }
  console.error(
    "  Repo-Root .env.local: VITE_APPWRITE_* for endpoint/project; API key as APPWRITE_API_KEY or APPWRITE_APIKEY.",
  );
  process.exit(1);
}

const ENDPOINT = process.env.APPWRITE_ENDPOINT?.trim();
const PROJECT = process.env.APPWRITE_PROJECT_ID?.trim();
const KEY = process.env.APPWRITE_API_KEY?.trim();
const DB = process.env.AI_DATABASE_ID?.trim() || "scriptony_ai";
const COL = "api_keys";
const ATTR_KEY = "feature";

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(KEY);
const databases = new Databases(client);

async function waitForAttributeAvailable(maxAttempts = 90, delayMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    const list = await databases.listAttributes({
      databaseId: DB,
      collectionId: COL,
    });
    const attr = list.attributes.find((a) => a.key === ATTR_KEY);
    if (!attr) {
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    if (attr.status === "available") {
      return;
    }
    if (attr.status === "failed") {
      throw new Error(attr.error || `Attribute ${ATTR_KEY} failed to build`);
    }
    console.log(
      `… attribute ${ATTR_KEY} status=${attr.status} (${i + 1}/${maxAttempts})`,
    );
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Timeout: attribute ${ATTR_KEY} did not become available`);
}

const list = await databases.listAttributes({
  databaseId: DB,
  collectionId: COL,
});
const exists = list.attributes.some((a) => a.key === ATTR_KEY);

if (!exists) {
  console.log(`Creating string attribute ${ATTR_KEY} on ${DB}/${COL} …`);
  await databases.createStringAttribute({
    databaseId: DB,
    collectionId: COL,
    key: ATTR_KEY,
    size: 128,
    required: false,
  });
} else {
  console.log(`Attribute ${ATTR_KEY} already exists on ${DB}/${COL}.`);
}

await waitForAttributeAvailable();
console.log(`OK: ${ATTR_KEY} is available.`);
