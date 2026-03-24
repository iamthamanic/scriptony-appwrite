#!/usr/bin/env node
/**
 * Deletes an Appwrite Databases collection (all documents and schema). Irreversible.
 *
 * Usage (from repo root):
 *   npm run appwrite:delete:collection -- projects --confirm
 *
 * Requires the same env as provision: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY
 * Optional: APPWRITE_DATABASE_ID (default scriptony)
 *
 * Location: functions/tools/delete-appwrite-collection.mjs
 */

import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAppwriteToolCredentials } from "./_appwrite-tool-creds.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const functionsRoot = join(__dirname, "..");
const require = createRequire(join(functionsRoot, "package.json"));
const { Client, Databases } = require("node-appwrite");

const argv = process.argv.slice(2);
const confirm = argv.includes("--confirm");
const collectionId = argv.filter((a) => !a.startsWith("--"))[0]?.trim();

if (!collectionId) {
  console.error("Usage: node delete-appwrite-collection.mjs <collectionId> --confirm");
  process.exit(1);
}
if (!confirm) {
  console.error("Refusing to delete without --confirm (irreversible). Example: ... projects --confirm");
  process.exit(1);
}

const { endpoint, projectId, apiKey, databaseId } = getAppwriteToolCredentials(
  " Your .env*.local has APPWRITE_API_KEY= with no value after =."
);

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const db = new Databases(client);

try {
  await db.deleteCollection(databaseId, collectionId);
  console.log(`Deleted collection "${collectionId}" in database "${databaseId}".`);
} catch (e) {
  if (e?.code === 404) {
    console.log(`Collection "${collectionId}" not found (already gone).`);
    process.exit(0);
  }
  console.error(e);
  process.exit(1);
}
