#!/usr/bin/env node

import { createRequire } from "module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAppwriteCliEnv } from "../../functions/scripts/load-appwrite-cli-env.mjs";

loadAppwriteCliEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(
  new URL("../../functions/package.json", import.meta.url),
);
const { Client, Databases } = require("node-appwrite");

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID?.trim() || "scriptony";

if (!endpoint || !projectId || !apiKey) {
  console.error(
    "Missing Appwrite env. Expected APPWRITE_ENDPOINT/PROJECT_ID/API_KEY or mapped VITE_APPWRITE_*.",
  );
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);
const db = new Databases(client);

const collectionFiles = [
  "styleProfiles.json",
  "renderJobs.json",
  "imageTasks.json",
  "guideBundles.json",
  "stageDocuments.json",
];

const shotsExpected = [
  { key: "blenderSourceVersion", type: "string" },
  { key: "blenderSyncRevision", type: "integer" },
  { key: "guideBundleRevision", type: "integer" },
  { key: "styleProfileId", type: "string" },
  { key: "styleProfileRevision", type: "integer" },
  { key: "renderRevision", type: "integer" },
  { key: "lastBlenderSyncAt", type: "string" },
  { key: "lastPreviewAt", type: "string" },
  { key: "latestGuideBundleId", type: "string" },
  { key: "latestRenderJobId", type: "string" },
  { key: "acceptedRenderJobId", type: "string" },
];

function normalizeType(type) {
  return type === "double" ? "float" : type;
}

function getSpec(file) {
  return JSON.parse(readFileSync(resolve(__dirname, file), "utf8"));
}

function buildValue(collectionId, attr, nowIso) {
  const key = attr.key;

  if (attr.array) {
    return [`${collectionId}-${key}-1`];
  }

  if (attr.type === "integer") {
    return 1;
  }

  if (attr.type === "double" || attr.type === "float") {
    return 0.5;
  }

  if (
    key === "configJson" ||
    key === "metadata" ||
    key === "payload" ||
    key === "viewState" ||
    key === "repairConfig"
  ) {
    return "{}";
  }

  if (key === "files") {
    return "[]";
  }

  if (key === "kind") {
    return "stage2d";
  }

  if (key.endsWith("At")) {
    return nowIso;
  }

  if (key === "createdAt" || key === "completedAt") {
    return nowIso;
  }

  if (key === "prompt") {
    return "Smoke test prompt";
  }

  return `${collectionId}-${key}-smoke`;
}

function buildValidDocument(collectionId, spec) {
  const nowIso = new Date().toISOString();
  const data = {};

  for (const attr of spec.attributes) {
    if (
      !attr.required &&
      ![
        "acceptedAt",
        "acceptedBy",
        "completedAt",
        "previewImageId",
        "projectId",
        "prompt",
        "repairConfig",
        "viewState",
        "selectedTakeId",
        "glbPreviewFileId",
        "lastSyncedAt",
        "outputImageIds",
      ].includes(attr.key)
    ) {
      continue;
    }
    data[attr.key] = buildValue(collectionId, attr, nowIso);
  }

  return data;
}

async function expectExists(collectionId, spec) {
  await db.getCollection(databaseId, collectionId);

  for (const attr of spec.attributes) {
    const live = await db.getAttribute(databaseId, collectionId, attr.key);
    const issues = [];
    if (normalizeType(live.type) !== normalizeType(attr.type)) {
      issues.push(`type ${live.type} != ${attr.type}`);
    }
    if (Boolean(live.required) !== Boolean(attr.required)) {
      issues.push(`required ${live.required} != ${attr.required}`);
    }
    if (
      attr.type === "string" &&
      attr.size != null &&
      live.size !== attr.size
    ) {
      issues.push(`size ${live.size} != ${attr.size}`);
    }
    if (Boolean(live.array) !== Boolean(attr.array)) {
      issues.push(`array ${live.array} != ${Boolean(attr.array)}`);
    }
    if (issues.length) {
      throw new Error(
        `Attribute mismatch for ${collectionId}.${attr.key}: ${issues.join(", ")}`,
      );
    }
  }

  const indexes = await db.listIndexes(databaseId, collectionId);
  for (const indexSpec of spec.indexes || []) {
    const live = indexes.indexes.find((index) => index.key === indexSpec.key);
    if (!live) {
      throw new Error(`Missing index ${collectionId}.${indexSpec.key}`);
    }
    if (
      JSON.stringify(live.attributes || []) !==
      JSON.stringify(indexSpec.attributes || [])
    ) {
      throw new Error(
        `Index attribute mismatch for ${collectionId}.${indexSpec.key}`,
      );
    }
  }
}

async function smokeCollection(collectionId, spec) {
  const valid = buildValidDocument(collectionId, spec);
  const requiredAttr = spec.attributes.find((attr) => attr.required);

  if (!requiredAttr) {
    throw new Error(`No required attribute found for ${collectionId}`);
  }

  let createdId = null;

  try {
    const invalid = { ...valid };
    delete invalid[requiredAttr.key];

    let invalidRejected = false;
    try {
      await db.createDocument(databaseId, collectionId, "unique()", invalid);
    } catch (err) {
      if (err?.code === 400) {
        invalidRejected = true;
      } else {
        throw err;
      }
    }

    if (!invalidRejected) {
      throw new Error(
        `Missing required field was accepted for ${collectionId}.${requiredAttr.key}`,
      );
    }

    const created = await db.createDocument(
      databaseId,
      collectionId,
      "unique()",
      valid,
    );
    createdId = created.$id;
    console.log(`smoke ok: ${collectionId} created ${createdId}`);
  } finally {
    if (createdId) {
      await db.deleteDocument(databaseId, collectionId, createdId);
      console.log(`cleanup ok: ${collectionId} deleted ${createdId}`);
    }
  }
}

async function verifyShotsExtensions() {
  for (const attr of shotsExpected) {
    const live = await db.getAttribute(databaseId, "shots", attr.key);
    if (normalizeType(live.type) !== normalizeType(attr.type)) {
      throw new Error(
        `shots.${attr.key} has type ${live.type}, expected ${attr.type}`,
      );
    }
  }
}

async function main() {
  console.log(
    `Running Ticket 1 smoke test against Appwrite database '${databaseId}'`,
  );

  for (const file of collectionFiles) {
    const spec = getSpec(file);
    await expectExists(spec.name, spec);
    await smokeCollection(spec.name, spec);
  }

  await verifyShotsExtensions();

  console.log("Ticket 1 smoke test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
