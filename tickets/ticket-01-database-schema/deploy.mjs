#!/usr/bin/env node

import { createRequire } from "module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAppwriteCliEnv } from "../../functions/scripts/load-appwrite-cli-env.mjs";

loadAppwriteCliEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(new URL("../../functions/package.json", import.meta.url));
const { Client, Databases, IndexType, OrderBy } = require("node-appwrite");

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID?.trim() || "scriptony";

if (!endpoint || !projectId || !apiKey) {
  console.error("Missing Appwrite env. Expected APPWRITE_ENDPOINT/PROJECT_ID/API_KEY or mapped VITE_APPWRITE_*.");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const db = new Databases(client);

const collectionFiles = [
  "styleProfiles.json",
  "renderJobs.json",
  "imageTasks.json",
  "guideBundles.json",
  "stageDocuments.json",
];

const shotsAttributes = [
  { key: "blenderSourceVersion", type: "string", required: false, size: 255 },
  { key: "blenderSyncRevision", type: "integer", required: false },
  { key: "guideBundleRevision", type: "integer", required: false },
  { key: "styleProfileRevision", type: "integer", required: false },
  { key: "renderRevision", type: "integer", required: false },
  { key: "lastBlenderSyncAt", type: "string", required: false, size: 255 },
  { key: "lastPreviewAt", type: "string", required: false, size: 255 },
  { key: "latestGuideBundleId", type: "string", required: false, size: 255 },
  { key: "latestRenderJobId", type: "string", required: false, size: 255 },
  { key: "acceptedRenderJobId", type: "string", required: false, size: 255 },
];

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

function isAlreadyExists(err) {
  return err?.code === 409 || String(err?.message || "").toLowerCase().includes("already exists");
}

function getSpec(file) {
  return JSON.parse(readFileSync(resolve(__dirname, file), "utf8"));
}

async function waitAttribute(collectionId, key) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const attribute = await db.getAttribute(databaseId, collectionId, key);
    if (attribute.status === "available") return;
    if (attribute.status === "failed") {
      throw new Error(`Attribute ${collectionId}.${key} failed: ${JSON.stringify(attribute)}`);
    }
    await sleep(500);
  }
  throw new Error(`Timeout waiting for attribute ${collectionId}.${key}`);
}

async function ensureCollection(collectionId) {
  try {
    await db.getCollection(databaseId, collectionId);
    console.log(`collection exists: ${collectionId}`);
  } catch (err) {
    if (err?.code !== 404) throw err;
    await db.createCollection(databaseId, collectionId, collectionId, [], false, true);
    console.log(`collection created: ${collectionId}`);
  }
}

async function ensureAttribute(collectionId, attr) {
  try {
    await db.getAttribute(databaseId, collectionId, attr.key);
    console.log(`  attr exists: ${collectionId}.${attr.key}`);
    return;
  } catch (err) {
    if (err?.code !== 404) throw err;
  }

  const required = Boolean(attr.required);
  const isArray = Boolean(attr.array);

  try {
    if (attr.type === "string") {
      await db.createStringAttribute(
        databaseId,
        collectionId,
        attr.key,
        Number(attr.size || 255),
        required,
        undefined,
        isArray
      );
    } else if (attr.type === "integer") {
      await db.createIntegerAttribute(
        databaseId,
        collectionId,
        attr.key,
        required,
        undefined,
        undefined,
        undefined,
        isArray
      );
    } else if (attr.type === "double" || attr.type === "float") {
      await db.createFloatAttribute(
        databaseId,
        collectionId,
        attr.key,
        required,
        undefined,
        undefined,
        undefined,
        isArray
      );
    } else {
      throw new Error(`Unsupported attribute type ${attr.type} for ${collectionId}.${attr.key}`);
    }

    await waitAttribute(collectionId, attr.key);
    console.log(`  attr created: ${collectionId}.${attr.key}`);
  } catch (err) {
    if (isAlreadyExists(err)) {
      console.log(`  attr exists after race: ${collectionId}.${attr.key}`);
      return;
    }
    throw err;
  }
}

async function ensureIndex(collectionId, indexSpec) {
  const indexes = await db.listIndexes(databaseId, collectionId);
  if (indexes.indexes.some((index) => index.key === indexSpec.key)) {
    console.log(`  index exists: ${collectionId}.${indexSpec.key}`);
    return;
  }

  try {
    await db.createIndex(
      databaseId,
      collectionId,
      indexSpec.key,
      indexSpec.type === "key" ? IndexType.Key : indexSpec.type,
      indexSpec.attributes,
      (indexSpec.attributes || []).map(() => OrderBy.Asc)
    );
    console.log(`  index created: ${collectionId}.${indexSpec.key}`);
  } catch (err) {
    if (isAlreadyExists(err)) {
      console.log(`  index exists after race: ${collectionId}.${indexSpec.key}`);
      return;
    }
    throw err;
  }
}

async function main() {
  console.log(`Deploying Ticket 1 schema to Appwrite database '${databaseId}'`);

  for (const file of collectionFiles) {
    const spec = getSpec(file);
    const collectionId = spec.name;
    await ensureCollection(collectionId);
    for (const attr of spec.attributes) {
      await ensureAttribute(collectionId, attr);
    }
    for (const indexSpec of spec.indexes || []) {
      await ensureIndex(collectionId, indexSpec);
    }
  }

  console.log("Ensuring shots extensions...");
  for (const attr of shotsAttributes) {
    await ensureAttribute("shots", attr);
  }

  console.log("Ticket 1 deploy complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
