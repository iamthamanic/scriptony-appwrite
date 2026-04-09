#!/usr/bin/env node
/**
 * Auth-protected smoke matrix for critical Scriptony user flows.
 *
 * Modes:
 * - direct (default): hit function domains / path-style function base from `.env.local`
 * - dev-proxy: hit the local Vite dev proxy (`/__dev-proxy/:function/*`)
 *
 * Required auth token sources:
 * - process.env.SCRIPTONY_SMOKE_BEARER_TOKEN
 * - .env.server.local SCRIPTONY_SMOKE_BEARER_TOKEN
 * - process.env.SCRIPTONY_SMOKE_AUTH_TOKEN
 * - .env.server.local SCRIPTONY_SMOKE_AUTH_TOKEN
 *
 * Examples:
 *   node scripts/smoke-user-flows.mjs
 *   node scripts/smoke-user-flows.mjs --mode=dev-proxy --frontend-origin=http://127.0.0.1:3000
 *   node scripts/smoke-user-flows.mjs --list
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localEnvPath = resolve(root, ".env.local");
const serverEnvPath = resolve(root, ".env.server.local");

const SMOKE_FLOWS = [
  {
    id: "auth_profile_read",
    label: "Auth profile read",
    description: "Authenticated app bootstrap can load the current profile.",
    functionId: "scriptony-auth",
    route: "/profile",
    method: "GET",
    expect: [{ key: "profile", type: "object" }],
  },
  {
    id: "projects_list_read",
    label: "Projects list read",
    description: "Projects page loads without auth regressions.",
    functionId: "scriptony-projects",
    route: "/projects",
    method: "GET",
    expect: [{ key: "projects", type: "array" }],
  },
  {
    id: "worlds_list_read",
    label: "Worldbuilding list read",
    description: "Worldbuilding page loads without auth regressions.",
    functionId: "scriptony-worldbuilding",
    route: "/worlds",
    method: "GET",
    expect: [{ key: "worlds", type: "array" }],
  },
  {
    id: "assistant_settings_read",
    label: "Assistant settings read",
    description: "Assistant runtime can load user AI chat settings.",
    functionId: "scriptony-ai",
    route: "/ai/settings",
    method: "GET",
    expect: [{ key: "settings", type: "object" }],
  },
  {
    id: "assistant_conversations_read",
    label: "Assistant conversations read",
    description: "Assistant sidebar can load the user's conversation list.",
    functionId: "scriptony-ai",
    route: "/ai/conversations",
    method: "GET",
    expect: [{ key: "conversations", type: "array" }],
  },
  {
    id: "ai_integrations_read",
    label: "AI integrations read",
    description: "Settings > Integrations can load provider and feature config.",
    functionId: "scriptony-ai",
    route: "/settings",
    method: "GET",
    expect: [
      { key: "providers", type: "array" },
      { key: "features", type: "object" },
    ],
  },
];

function hasFlag(name) {
  return process.argv.includes(name);
}

function getFlagValue(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) {
    return direct.slice(name.length + 1).trim();
  }
  const idx = process.argv.indexOf(name);
  if (idx >= 0) {
    const next = process.argv[idx + 1];
    if (next && !next.startsWith("--")) {
      return next.trim();
    }
  }
  return "";
}

function parseEnvFile(text) {
  const out = {};
  const normalized = text.replace(/^\uFEFF/, "");
  for (const line of normalized.split(/\r?\n/)) {
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

function loadEnv(path) {
  if (!existsSync(path)) return {};
  return parseEnvFile(readFileSync(path, "utf8"));
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function joinUrl(base, path) {
  if (!base) return path;
  if (!path) return base;
  return `${trimSlash(base)}/${String(path).replace(/^\/+/, "")}`;
}

function parseDomainMap(raw) {
  if (!raw || typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [
          String(key).trim(),
          typeof value === "string" ? trimSlash(value.trim()) : "",
        ])
        .filter(([key, value]) => key && value)
    );
  } catch {
    return {};
  }
}

function describeExpectation(expect) {
  return `${expect.key}:${expect.type}`;
}

function describeValue(value) {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value && typeof value === "object") return "object";
  return typeof value;
}

function assertExpectation(flow, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`${flow.id}: expected JSON object, got ${describeValue(payload)}`);
  }

  for (const expect of flow.expect) {
    const value = payload[expect.key];
    if (expect.type === "array") {
      if (!Array.isArray(value)) {
        throw new Error(
          `${flow.id}: expected key "${expect.key}" to be array, got ${describeValue(value)}`
        );
      }
      continue;
    }
    if (expect.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(
          `${flow.id}: expected key "${expect.key}" to be object, got ${describeValue(value)}`
        );
      }
      continue;
    }
    if (value == null) {
      throw new Error(`${flow.id}: expected key "${expect.key}" to be present`);
    }
  }
}

async function fetchJson(url, options = {}) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15000);
  try {
    const response = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    return {
      ok: response.ok,
      status: response.status,
      text,
      json,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveDirectBase(functionId, domainMap, functionsBaseUrl) {
  if (domainMap[functionId]) {
    return { url: domainMap[functionId], source: "domain-map" };
  }
  if (functionsBaseUrl) {
    return { url: joinUrl(functionsBaseUrl, functionId), source: "path-base" };
  }
  return { url: "", source: "missing" };
}

function resolveFlowUrl(flow, options) {
  if (options.mode === "dev-proxy") {
    const frontendOrigin = trimSlash(options.frontendOrigin);
    return {
      url: `${frontendOrigin}/__dev-proxy/${flow.functionId}${flow.route}`,
      source: "dev-proxy",
    };
  }

  const base = resolveDirectBase(flow.functionId, options.domainMap, options.functionsBaseUrl);
  return {
    url: base.url ? joinUrl(base.url, flow.route) : "",
    source: base.source,
  };
}

function printList() {
  console.log("Scriptony smoke matrix\n");
  for (const flow of SMOKE_FLOWS) {
    console.log(`- ${flow.id}`);
    console.log(`  ${flow.label}`);
    console.log(`  route=${flow.route} function=${flow.functionId}`);
    console.log(`  expects=${flow.expect.map(describeExpectation).join(", ")}`);
    console.log(`  ${flow.description}`);
  }
}

const localEnv = loadEnv(localEnvPath);
const serverEnv = loadEnv(serverEnvPath);

const mode = (getFlagValue("--mode") || process.env.SCRIPTONY_SMOKE_MODE || "direct").trim();
const frontendOrigin = (
  getFlagValue("--frontend-origin") ||
  process.env.SCRIPTONY_SMOKE_FRONTEND_ORIGIN ||
  "http://127.0.0.1:3000"
).trim();

if (hasFlag("--list")) {
  printList();
  process.exit(0);
}

if (mode !== "direct" && mode !== "dev-proxy") {
  console.error(`Unsupported mode "${mode}". Use --mode=direct or --mode=dev-proxy.`);
  process.exit(1);
}

const smokeBearerToken = (
  process.env.SCRIPTONY_SMOKE_BEARER_TOKEN ||
  serverEnv.SCRIPTONY_SMOKE_BEARER_TOKEN ||
  process.env.SCRIPTONY_SMOKE_AUTH_TOKEN ||
  serverEnv.SCRIPTONY_SMOKE_AUTH_TOKEN ||
  ""
).trim();

if (!smokeBearerToken) {
  console.error(
    "Missing SCRIPTONY_SMOKE_BEARER_TOKEN. Add it to .env.server.local or export it in the shell."
  );
  process.exit(1);
}

const domainMap = parseDomainMap(localEnv.VITE_BACKEND_FUNCTION_DOMAIN_MAP);
const functionsBaseUrl = trimSlash(
  localEnv.VITE_APPWRITE_FUNCTIONS_BASE_URL ||
    localEnv.VITE_BACKEND_API_BASE_URL ||
    ""
);

console.log("Scriptony - Smoke user flows\n");
console.log(`Mode: ${mode}`);
if (mode === "dev-proxy") {
  console.log(`Frontend origin: ${trimSlash(frontendOrigin)}`);
} else {
  console.log(
    `Routing source: ${
      Object.keys(domainMap).length > 0 ? "domain-map / .env.local" : "functions base / .env.local"
    }`
  );
}
console.log("");

let failures = 0;

for (const flow of SMOKE_FLOWS) {
  const target = resolveFlowUrl(flow, { mode, frontendOrigin, domainMap, functionsBaseUrl });

  console.log(`-> ${flow.id}`);
  console.log(`   ${flow.label}`);
  console.log(`   ${target.source} -> ${target.url || "(missing)"}`);

  if (!target.url) {
    console.log("   FAIL missing route base for function");
    failures += 1;
    console.log("");
    continue;
  }

  try {
    const result = await fetchJson(target.url, {
      method: flow.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${smokeBearerToken}`,
      },
    });

    if (!result.ok) {
      const snippet = result.text.trim().slice(0, 220) || "(empty body)";
      console.log(`   FAIL HTTP ${result.status} ${snippet}`);
      failures += 1;
      console.log("");
      continue;
    }

    assertExpectation(flow, result.json);
    console.log(`   OK ${result.status} (${flow.expect.map(describeExpectation).join(", ")})`);
  } catch (error) {
    console.log(`   FAIL ${error instanceof Error ? error.message : String(error)}`);
    failures += 1;
  }

  console.log("");
}

if (failures > 0) {
  console.error(`Smoke matrix FAILED (${failures} flow${failures === 1 ? "" : "s"}).`);
  process.exit(1);
}

console.log(`Smoke matrix OK (${SMOKE_FLOWS.length} flows).`);
