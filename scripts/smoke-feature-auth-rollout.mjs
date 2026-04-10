#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Functions, ID, Users } from "../functions/node_modules/node-appwrite/dist/index.mjs";
import { loadAppwriteCliEnv, getMissingAppwriteServerEnvKeys } from "../functions/scripts/load-appwrite-cli-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localEnvPath = resolve(root, ".env.local");

const DEMO_EMAIL = "demo@scriptony.app";
const DEMO_PASSWORD = "DemoUser999";
const DEMO_NAME = "Scriptony Demo";

const FLOWS = [
  {
    id: "image_settings",
    functionId: "scriptony-image",
    route: "/ai/image/settings",
    expectKey: "settings",
    expectType: "object",
  },
  {
    id: "audio_voices",
    functionId: "scriptony-audio",
    route: "/tts/voices?provider=openai",
    expectKey: "voices",
    expectType: "array",
  },
  {
    id: "gym_categories",
    functionId: "scriptony-gym",
    route: "/categories",
    expectKey: "categories",
    expectType: "array",
  },
  {
    id: "assistant_settings",
    functionId: "scriptony-assistant",
    route: "/ai/settings",
    expectKey: "settings",
    expectType: "object",
  },
  {
    id: "video_history",
    functionId: "scriptony-video",
    route: "/history",
    expectKey: "generations",
    expectType: "array",
    transport: "execution",
  },
];

function parseEnvFile(text) {
  const out = {};
  const normalized = text.replace(/^\uFEFF/, "");
  for (const line of normalized.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadEnv(path) {
  if (!existsSync(path)) return {};
  return parseEnvFile(readFileSync(path, "utf8"));
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function joinUrl(base, path) {
  return `${trimSlash(base)}/${String(path).replace(/^\/+/, "")}`;
}

function parseDomainMap(raw) {
  if (!raw?.trim()) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(parsed)
      .map(([key, value]) => [String(key).trim(), trimSlash(String(value || ""))])
      .filter(([key, value]) => key && value)
  );
}

function validateExpectedValue(flow, payload) {
  const value = payload?.[flow.expectKey];
  if (flow.expectType === "array") {
    return Array.isArray(value);
  }
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { response, text, json };
}

async function executeJson(functions, flow, headers) {
  let execution = await functions.createExecution({
    functionId: flow.functionId,
    method: "GET",
    xpath: flow.route,
    headers,
  });

  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (execution.status === "completed" || execution.status === "failed") {
      break;
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 1000));
    execution = await functions.getExecution({
      functionId: flow.functionId,
      executionId: execution.$id,
    });
  }

  let json = null;
  try {
    json = JSON.parse(execution.responseBody || "");
  } catch {
    /* ignore */
  }

  return {
    ok: execution.responseStatusCode >= 200 && execution.responseStatusCode < 300,
    status: execution.responseStatusCode,
    text: execution.responseBody || "",
    json,
    execution,
  };
}

loadAppwriteCliEnv();
const missingEnv = getMissingAppwriteServerEnvKeys();
if (missingEnv.length > 0) {
  console.error(`Missing Appwrite env: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const localEnv = loadEnv(localEnvPath);
const domainMap = parseDomainMap(localEnv.VITE_BACKEND_FUNCTION_DOMAIN_MAP || "");

for (const flow of FLOWS) {
  if ((flow.transport || "domain") === "domain" && !domainMap[flow.functionId]) {
    console.error(`Missing ${flow.functionId} in VITE_BACKEND_FUNCTION_DOMAIN_MAP.`);
    process.exit(1);
  }
}

console.log("Scriptony - Feature auth rollout smoke\n");

const serverClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(serverClient);
let userList = await users.list({ search: DEMO_EMAIL, total: false });
let demoUser =
  userList.users.find((entry) => (entry.email || "").trim().toLowerCase() === DEMO_EMAIL) || null;

if (!demoUser) {
  try {
    demoUser = await users.create({
      userId: ID.unique(),
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      name: DEMO_NAME,
    });
  } catch (error) {
    const code = error && typeof error === "object" ? error.code : undefined;
    if (code !== 409) {
      throw error;
    }
    userList = await users.list({ search: DEMO_EMAIL, total: false });
    demoUser =
      userList.users.find((entry) => (entry.email || "").trim().toLowerCase() === DEMO_EMAIL) || null;
  }
}

if (!demoUser) {
  console.error(`Demo user ${DEMO_EMAIL} not found after ensure/create.`);
  process.exit(1);
}

const session = await users.createSession({ userId: demoUser.$id });
const jwt = await users.createJWT({ userId: demoUser.$id, sessionId: session.$id });
const userClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setJWT(jwt.jwt);
const userFunctions = new Functions(userClient);
const authHeaders = {
  Accept: "application/json",
  Authorization: `Bearer ${jwt.jwt}`,
};

let failures = 0;

for (const flow of FLOWS) {
    if ((flow.transport || "domain") === "execution") {
    const result = await executeJson(userFunctions, flow, { Accept: authHeaders.Accept });
    if (!result.ok) {
      console.log(`- ${flow.id}: FAIL EXEC ${result.status} ${result.text.slice(0, 220)}`);
      failures += 1;
      continue;
    }
    if (!validateExpectedValue(flow, result.json)) {
      console.log(`- ${flow.id}: FAIL invalid payload ${result.text.slice(0, 220)}`);
      failures += 1;
      continue;
    }
    console.log(`- ${flow.id}: OK EXEC ${result.status}`);
    continue;
  }

  const url = joinUrl(domainMap[flow.functionId], flow.route);
  const { response, text, json } = await fetchJson(url, authHeaders);
  if (!response.ok) {
    console.log(`- ${flow.id}: FAIL HTTP ${response.status} ${text.slice(0, 220)}`);
    failures += 1;
    continue;
  }
  if (!validateExpectedValue(flow, json)) {
    console.log(`- ${flow.id}: FAIL invalid payload ${text.slice(0, 220)}`);
    failures += 1;
    continue;
  }
  console.log(`- ${flow.id}: OK ${response.status}`);
}

if (failures > 0) {
  console.error(`\nFeature auth rollout smoke FAILED (${failures} flow${failures === 1 ? "" : "s"}).`);
  process.exit(1);
}

console.log(`\nFeature auth rollout smoke OK (${FLOWS.length} flows).`);
