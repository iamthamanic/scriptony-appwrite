#!/usr/bin/env node
/**
 * Idempotent Storage buckets for Scriptony defaults (matches functions/_shared/env.ts).
 *
 * Run from repo root: npm run appwrite:provision:buckets
 * Requires: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY (storage.buckets.* or full scopes)
 *
 * Location: functions/tools/provision-appwrite-buckets.mjs
 */

import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAppwriteToolCredentials } from "./_appwrite-tool-creds.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const functionsRoot = join(__dirname, "..");
const require = createRequire(join(functionsRoot, "package.json"));
const { Client, Storage, Permission, Role } = require("node-appwrite");

const { endpoint, projectId, apiKey } = getAppwriteToolCredentials(
  " Your .env*.local has APPWRITE_API_KEY= with no value after =.",
);

/** Default bucket IDs — override in env with SCRIPTONY_STORAGE_BUCKET_* in Functions, not here. */
const BUCKETS = [
  { bucketId: "general", name: "Scriptony general" },
  { bucketId: "project-images", name: "Scriptony project images" },
  { bucketId: "world-images", name: "Scriptony world images" },
  { bucketId: "shots", name: "Scriptony shot images" },
  { bucketId: "audio-files", name: "Scriptony audio files" },
  { bucketId: "stage-documents", name: "Scriptony stage documents" },
];

const MAX_BYTES = 10_000_000; // ~10 MB — Appwrite self-hosted default max; raise via _APP_STORAGE_LIMIT

const bucketPermissions = [
  Permission.create(Role.users()),
  Permission.read(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);
const storage = new Storage(client);

function isConflict(err) {
  return (
    err?.code === 409 ||
    String(err?.message || "")
      .toLowerCase()
      .includes("already exists")
  );
}

async function ensureBucket(def) {
  try {
    await storage.getBucket(def.bucketId);
    console.log(`  bucket skip (exists): ${def.bucketId}`);
    return;
  } catch (e) {
    if (e?.code !== 404) throw e;
  }
  try {
    await storage.createBucket({
      bucketId: def.bucketId,
      name: def.name,
      permissions: bucketPermissions,
      fileSecurity: true,
      enabled: true,
      maximumFileSize: MAX_BYTES,
    });
    console.log(`  bucket ok: ${def.bucketId}`);
  } catch (e) {
    if (isConflict(e)) {
      console.log(`  bucket skip (conflict): ${def.bucketId}`);
      return;
    }
    throw e;
  }
}

console.log(`Endpoint ${endpoint}  project ${projectId}  (storage buckets)`);

for (const def of BUCKETS) {
  await ensureBucket(def);
}

console.log(
  "\nDone. Defaults in code: functions/_shared/env.ts (SCRIPTONY_STORAGE_BUCKET_* overrides).",
);
