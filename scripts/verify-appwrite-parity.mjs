#!/usr/bin/env node
/**
 * Verifies parity between local env, live Appwrite functions, and auth-protected smoke flows.
 *
 * Checks:
 * - Appwrite API reachability
 * - critical function deployment/live status
 * - expected server-side APPWRITE_* vars per critical function
 * - browser routing configuration from .env.local (domain map or path-style base)
 * - separate /health and auth-protected real-flow checks
 *
 * Auth smoke requires a bearer token from:
 * - process.env.SCRIPTONY_SMOKE_BEARER_TOKEN
 * - .env.server.local SCRIPTONY_SMOKE_BEARER_TOKEN
 *
 * Optional:
 * - pass --require-auth to fail when the bearer token is missing
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localEnvPath = resolve(root, ".env.local");
const serverEnvPath = resolve(root, ".env.server.local");
const requireAuth = process.argv.includes("--require-auth");

const CRITICAL_FUNCTIONS = [
  {
    id: "scriptony-auth",
    expectedVars: [
      "APPWRITE_ENDPOINT",
      "APPWRITE_PROJECT_ID",
      "APPWRITE_API_KEY",
      "APPWRITE_PUBLIC_ENDPOINT",
    ],
    authSmoke: {
      route: "/profile",
      expectKey: "profile",
      description: "auth profile read",
    },
  },
  {
    id: "scriptony-projects",
    expectedVars: [
      "APPWRITE_ENDPOINT",
      "APPWRITE_PROJECT_ID",
      "APPWRITE_API_KEY",
      "APPWRITE_PUBLIC_ENDPOINT",
    ],
    authSmoke: {
      route: "/projects",
      expectKey: "projects",
      description: "projects list read",
    },
  },
  {
    id: "scriptony-worldbuilding",
    expectedVars: [
      "APPWRITE_ENDPOINT",
      "APPWRITE_PROJECT_ID",
      "APPWRITE_API_KEY",
      "APPWRITE_PUBLIC_ENDPOINT",
    ],
    authSmoke: {
      route: "/worlds",
      expectKey: "worlds",
      description: "world list read",
    },
  },
  {
    id: "scriptony-ai",
    expectedVars: [
      "APPWRITE_ENDPOINT",
      "APPWRITE_PROJECT_ID",
      "APPWRITE_API_KEY",
    ],
    authSmoke: {
      route: "/settings",
      expectKey: "providers",
      description: "AI settings read",
    },
  },
];

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

function trimSlash(value) {
  return value.replace(/\/+$/, "");
}

function joinUrl(base, path) {
  if (!base) return path;
  if (!path) return base;
  return `${trimSlash(base)}/${String(path).replace(/^\/+/, "")}`;
}

function loadEnv(path) {
  if (!existsSync(path)) {
    return {};
  }
  return parseEnvFile(readFileSync(path, "utf8"));
}

function parseDomainMap(raw) {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [
          String(key).trim(),
          typeof value === "string" ? trimSlash(value.trim()) : "",
        ])
        .filter(([key, value]) => key && value),
    );
  } catch {
    return {};
  }
}

async function fetchResult(url, options = {}) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    return { ok: res.ok, status: res.status, text, json };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      text: error instanceof Error ? error.message : String(error),
      json: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function listAllFunctions(endpoint, projectId, apiKey) {
  const base = trimSlash(endpoint);
  const all = [];
  let cursor = null;

  for (let page = 0; page < 50; page++) {
    const url = new URL(`${base}/functions`);
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const res = await fetch(url.toString(), {
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      },
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `List functions: HTTP ${res.status} — ${text.slice(0, 200)}`,
      );
    }
    if (!res.ok) {
      throw new Error(
        data?.message ||
          `List functions failed: ${res.status} ${JSON.stringify(data)}`,
      );
    }

    const batch = data.functions || [];
    all.push(...batch);
    if (!data.cursor || batch.length === 0) {
      break;
    }
    cursor = data.cursor;
  }

  return all;
}

function getFunctionHttpBase(functionId, domainMap, functionsBaseUrl) {
  if (domainMap[functionId]) {
    return { url: domainMap[functionId], source: "domain-map" };
  }
  if (functionsBaseUrl) {
    return { url: joinUrl(functionsBaseUrl, functionId), source: "path-base" };
  }
  return { url: null, source: "missing" };
}

function briefJsonShape(json) {
  if (!json || typeof json !== "object") {
    return String(json);
  }
  return Object.keys(json).slice(0, 8).join(", ") || "(empty object)";
}

console.log("Scriptony — Verify Appwrite parity\n");

const localEnv = loadEnv(localEnvPath);
const serverEnv = loadEnv(serverEnvPath);

const endpoint = (
  process.env.APPWRITE_ENDPOINT ||
  serverEnv.APPWRITE_ENDPOINT ||
  localEnv.VITE_APPWRITE_ENDPOINT ||
  ""
).trim();
const projectId = (
  process.env.APPWRITE_PROJECT_ID ||
  serverEnv.APPWRITE_PROJECT_ID ||
  localEnv.VITE_APPWRITE_PROJECT_ID ||
  ""
).trim();
const apiKey = (
  process.env.APPWRITE_API_KEY ||
  serverEnv.APPWRITE_API_KEY ||
  ""
).trim();
const smokeBearerToken = (
  process.env.SCRIPTONY_SMOKE_BEARER_TOKEN ||
  serverEnv.SCRIPTONY_SMOKE_BEARER_TOKEN ||
  process.env.SCRIPTONY_SMOKE_AUTH_TOKEN ||
  serverEnv.SCRIPTONY_SMOKE_AUTH_TOKEN ||
  ""
).trim();

const functionsBaseUrl = trimSlash(
  (
    localEnv.VITE_APPWRITE_FUNCTIONS_BASE_URL ||
    localEnv.VITE_BACKEND_API_BASE_URL ||
    ""
  ).trim(),
);
const domainMap = parseDomainMap(localEnv.VITE_BACKEND_FUNCTION_DOMAIN_MAP);

const missing = [];
if (!endpoint) missing.push("APPWRITE_ENDPOINT / VITE_APPWRITE_ENDPOINT");
if (!projectId) missing.push("APPWRITE_PROJECT_ID / VITE_APPWRITE_PROJECT_ID");
if (!apiKey) missing.push("APPWRITE_API_KEY");

if (missing.length > 0) {
  console.error("Fehlende Grundkonfiguration:", missing.join(", "));
  process.exit(1);
}

const appwriteHealth = await fetchResult(`${trimSlash(endpoint)}/health`);
if (appwriteHealth.ok || appwriteHealth.status === 401) {
  const tag = appwriteHealth.ok ? "OK" : "OK (reachable, auth required)";
  console.log(`Appwrite API: ${tag} (${appwriteHealth.status})`);
} else {
  console.error(
    `Appwrite API: FEHLER (${appwriteHealth.status}) ${appwriteHealth.text.slice(0, 200)}`,
  );
  process.exit(1);
}
console.log("");

let functions;
try {
  functions = await listAllFunctions(endpoint, projectId, apiKey);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

let failed = false;
let authChecksSkipped = false;

for (const spec of CRITICAL_FUNCTIONS) {
  const liveFn = functions.find(
    (entry) => entry.$id === spec.id || entry.name === spec.id,
  );
  const routeBase = getFunctionHttpBase(spec.id, domainMap, functionsBaseUrl);

  console.log(`→ ${spec.id}`);

  if (!liveFn) {
    console.log("  FEHLER: Function nicht in Appwrite gefunden");
    failed = true;
    console.log("");
    continue;
  }

  const liveStatusOk = Boolean(
    liveFn.enabled && liveFn.live && liveFn.deploymentId,
  );
  const deploymentReady = liveFn.latestDeploymentStatus === "ready";
  const definedVars = new Set((liveFn.vars || []).map((entry) => entry.key));
  const missingVars = spec.expectedVars.filter((key) => !definedVars.has(key));

  console.log(
    `  live=${Boolean(liveFn.live)} enabled=${Boolean(liveFn.enabled)} deployment=${liveFn.deploymentId || "(none)"} latest=${liveFn.latestDeploymentStatus || "(unknown)"}`,
  );

  if (!liveStatusOk || !deploymentReady) {
    console.log("  FEHLER: Deployment-/Live-Status nicht release-tauglich");
    failed = true;
  }

  if (missingVars.length > 0) {
    console.log(`  FEHLER: fehlende kritische Vars: ${missingVars.join(", ")}`);
    failed = true;
  } else {
    console.log(`  Vars: OK (${spec.expectedVars.join(", ")})`);
  }

  if (!routeBase.url) {
    console.log("  FEHLER: keine Browser-Route aus .env.local ableitbar");
    failed = true;
    console.log("");
    continue;
  }

  console.log(`  Browser-Route: ${routeBase.source} -> ${routeBase.url}`);

  const healthUrl = joinUrl(routeBase.url, "/health");
  const health = await fetchResult(healthUrl);
  if (health.ok && health.json) {
    console.log(
      `  Health: OK (${health.status}) ${briefJsonShape(health.json)}`,
    );
  } else {
    console.log(
      `  FEHLER Health (${health.status}) ${health.text.slice(0, 160)}`,
    );
    failed = true;
  }

  if (!smokeBearerToken) {
    authChecksSkipped = true;
    console.log(
      `  Auth-Smoke: übersprungen (${spec.authSmoke.description}) — setze SCRIPTONY_SMOKE_BEARER_TOKEN in .env.server.local oder process.env`,
    );
    console.log("");
    continue;
  }

  const authUrl = joinUrl(routeBase.url, spec.authSmoke.route);
  const auth = await fetchResult(authUrl, {
    headers: {
      Authorization: `Bearer ${smokeBearerToken}`,
      Accept: "application/json",
    },
  });

  if (!auth.ok || !auth.json) {
    console.log(
      `  FEHLER Auth-Smoke (${auth.status}) ${auth.text.slice(0, 160)}`,
    );
    failed = true;
    console.log("");
    continue;
  }

  if (!(spec.authSmoke.expectKey in auth.json)) {
    console.log(
      `  FEHLER Auth-Smoke (${auth.status}) erwarteter Key fehlt: ${spec.authSmoke.expectKey}; erhalten: ${briefJsonShape(auth.json)}`,
    );
    failed = true;
    console.log("");
    continue;
  }

  console.log(
    `  Auth-Smoke: OK (${auth.status}) ${spec.authSmoke.description} -> key "${spec.authSmoke.expectKey}"`,
  );
  console.log("");
}

if (authChecksSkipped && requireAuth) {
  console.error(
    "Auth-Smokes wurden übersprungen, aber --require-auth wurde gesetzt.",
  );
  process.exit(1);
}

if (failed) {
  console.error("Appwrite-Parität NICHT OK.\n");
  process.exit(1);
}

if (authChecksSkipped) {
  console.log(
    "Parität teilweise OK: Deployment/Env/Health sind geprüft, Auth-Smokes wurden mangels Token übersprungen.\n",
  );
  process.exit(0);
}

console.log("Appwrite-Parität OK.\n");
