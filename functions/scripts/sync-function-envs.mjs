#!/usr/bin/env node
/**
 * Sync APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY env vars
 * on Appwrite functions. Handles secret→non-secret migration by delete+recreate.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Functions } from "node-appwrite";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const serverEnvPath = resolve(root, ".env.server.local");

function parseEnv(text) {
  const out = {};
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = {
  ...parseEnv(readFileSync(serverEnvPath, "utf8")),
  ...process.env,
};
const endpoint = (env.APPWRITE_ENDPOINT || "").replace(/\/+$/, "");
const projectId = env.APPWRITE_PROJECT_ID || "";
const apiKey = env.APPWRITE_API_KEY || "";

if (!endpoint || !projectId || !apiKey) {
  console.error(
    "Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, or APPWRITE_API_KEY",
  );
  process.exit(1);
}

const FUNCTIONS = [
  "scriptony-ai",
  "scriptony-assistant",
  "scriptony-audio",
  "scriptony-auth",
  "scriptony-beats",
  "scriptony-characters",
  "scriptony-clips",
  "scriptony-gym",
  "scriptony-image",
  "scriptony-logs",
  "scriptony-mcp-appwrite",
  "scriptony-project-nodes",
  "scriptony-projects",
  "scriptony-shots",
  "scriptony-stage",
  "scriptony-stage2d",
  "scriptony-stats",
  "scriptony-style",
  "scriptony-style-guide",
  "scriptony-superadmin",
  "scriptony-video",
  "scriptony-worldbuilding",
];

const DESIRED_VARS = [
  { key: "APPWRITE_ENDPOINT", secret: false },
  { key: "APPWRITE_PROJECT_ID", secret: false },
  { key: "APPWRITE_API_KEY", secret: true },
];

async function syncVariable(functions, fnId, desired, value) {
  const list = await functions.listVariables({ functionId: fnId });
  const existing = (list.variables || []).find((v) => v.key === desired.key);

  if (!existing) {
    await functions.createVariable({
      functionId: fnId,
      key: desired.key,
      value,
      secret: desired.secret,
    });
    return "created";
  }

  // If secret flag matches, just update
  if (existing.secret === desired.secret) {
    await functions.updateVariable({
      functionId: fnId,
      variableId: existing.$id,
      key: desired.key,
      value,
      secret: desired.secret,
    });
    return "updated";
  }

  // Secret flag mismatch — delete and recreate
  await functions.deleteVariable({
    functionId: fnId,
    variableId: existing.$id,
  });
  await functions.createVariable({
    functionId: fnId,
    key: desired.key,
    value,
    secret: desired.secret,
  });
  return "recreated";
}

async function main() {
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  const functions = new Functions(client);

  for (const fnId of FUNCTIONS) {
    try {
      for (const desired of DESIRED_VARS) {
        const value = env[desired.key]?.trim();
        if (!value) continue;
        const result = await syncVariable(functions, fnId, desired, value);
        console.log(`  ✓ ${desired.key} (${result})`);
      }
      console.log(`✅ ${fnId}`);
    } catch (err) {
      console.error(`❌ ${fnId}: ${err.message || err}`);
    }
  }
}

main();
