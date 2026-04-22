#!/usr/bin/env node
/**
 * Lists Appwrite functions (server API) and writes VITE_BACKEND_FUNCTION_DOMAIN_MAP into .env.local
 * when domains are returned, or prints a template + instructions.
 *
 * Reads credentials from .env.server.local (APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY).
 * Empty values in the file are overridden by the same variables in process.env if set:
 *   APPWRITE_API_KEY=... npm run appwrite:sync:function-domains
 *
 * Usage: node scripts/sync-vite-function-domain-map.mjs
 * Location: scripts/sync-vite-function-domain-map.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverEnvPath = resolve(root, ".env.server.local");
const localEnvPath = resolve(root, ".env.local");

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

function trimSlash(s) {
  return s.replace(/\/+$/, "");
}

function extractDomainFromFunction(fn) {
  if (!fn || typeof fn !== "object") return null;
  const candidates = [
    fn.domain,
    fn.hostname,
    fn.httpUrl,
    fn.httpURL,
    fn.url,
    fn.endpoint,
    fn.domains?.[0]?.domain,
    fn.domains?.[0]?.hostname,
    fn.domains?.[0],
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) {
      return trimSlash(c);
    }
  }
  return null;
}

async function listAllFunctions(endpoint, projectId, apiKey) {
  const base = trimSlash(endpoint);
  const all = [];
  let cursor = null;
  for (let page = 0; page < 50; page++) {
    const url = new URL(`${base}/functions`);
    if (cursor) url.searchParams.set("cursor", cursor);
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
    const batch = data.functions || data.documents || [];
    all.push(...batch);
    const next = data.cursor;
    if (!next || batch.length === 0) break;
    cursor = next;
  }
  return all;
}

function mergeDomainMapIntoEnvLocal(content, jsonLine) {
  const lines = content.split("\n");
  const key = "VITE_BACKEND_FUNCTION_DOMAIN_MAP";
  let replaced = false;
  const out = lines.map((line) => {
    const t = line.trim();
    if (t.startsWith(`${key}=`) || t.startsWith(`${key} =`)) {
      replaced = true;
      return `${key}=${jsonLine}`;
    }
    return line;
  });
  if (!replaced) {
    out.push(`${key}=${jsonLine}`, "");
  }
  return out.join("\n");
}

console.log(
  "Scriptony — sync VITE_BACKEND_FUNCTION_DOMAIN_MAP from Appwrite\n",
);

if (!existsSync(serverEnvPath)) {
  console.error("Fehlt:", serverEnvPath);
  process.exit(1);
}

const se = parseEnvFile(readFileSync(serverEnvPath, "utf8"));
const endpoint = (
  process.env.APPWRITE_ENDPOINT ||
  se.APPWRITE_ENDPOINT ||
  ""
).trim();
const projectId = (
  process.env.APPWRITE_PROJECT_ID ||
  se.APPWRITE_PROJECT_ID ||
  ""
).trim();
const apiKey = (
  process.env.APPWRITE_API_KEY ||
  se.APPWRITE_API_KEY ||
  ""
).trim();

const missing = [];
if (!endpoint) missing.push("APPWRITE_ENDPOINT");
if (!projectId) missing.push("APPWRITE_PROJECT_ID");
if (!apiKey) missing.push("APPWRITE_API_KEY");

if (missing.length > 0) {
  console.error(
    "Fehlende Werte (nach .env.server.local + optional process.env):",
    missing.join(", "),
  );
  console.error("Datei:", serverEnvPath);
  console.error(
    "Tipp: API-Key in .env.server.local speichern (Zeile APPWRITE_API_KEY=…) oder einmalig:\n" +
      '  APPWRITE_API_KEY="dein_key" npm run appwrite:sync:function-domains',
  );
  process.exit(1);
}

let functions;
try {
  functions = await listAllFunctions(endpoint, projectId, apiKey);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const relevant = functions.filter((f) => {
  const id = f.$id || f.id;
  return (
    typeof id === "string" &&
    (id.startsWith("scriptony-") || id.startsWith("make-server-"))
  );
});

console.log(
  `Gefunden: ${functions.length} Functions, ${relevant.length} Scriptony-relevant.\n`,
);

const map = {};
let withDomain = 0;
for (const fn of relevant) {
  const id = fn.$id || fn.id;
  const domain = extractDomainFromFunction(fn);
  if (domain) {
    map[id] = domain;
    withDomain++;
  }
}

if (withDomain === 0) {
  console.log(
    "Die Appwrite-API liefert in der Function-Liste keine HTTP-Domain-Felder (self-hosted oft erst nach Domains/SSL in der Konsole).\n" +
      "Trage die URLs manuell ein (Console → Functions → Domains), z. B.:\n" +
      `  VITE_BACKEND_FUNCTION_DOMAIN_MAP={"scriptony-projects":"https://…","scriptony-assistant":"https://…","scriptony-auth":"https://…"}\n`,
  );
  console.log("Function-IDs auf dem Server:");
  for (const fn of relevant) {
    console.log(`  - ${fn.$id || fn.name}`);
  }
  process.exit(0);
}

const jsonLine = JSON.stringify(map);
console.log("Domain-Map (VITE):", jsonLine, "\n");

if (!existsSync(localEnvPath)) {
  console.error("Fehlt .env.local — bitte aus .env.local.example anlegen.");
  process.exit(1);
}

const before = readFileSync(localEnvPath, "utf8");
const after = mergeDomainMapIntoEnvLocal(before, jsonLine);
writeFileSync(localEnvPath, after, "utf8");
console.log("Aktualisiert:", localEnvPath);
console.log("Vite neu starten: npm run dev\n");
