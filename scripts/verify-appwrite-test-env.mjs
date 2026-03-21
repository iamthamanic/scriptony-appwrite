#!/usr/bin/env node
/**
 * Verifies local .env.local: Appwrite endpoint health + Scriptony functions base (projects health).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function parseEnvFile(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function trimSlash(s) {
  return s.replace(/\/+$/, "");
}

async function fetchJson(url, label) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    return { ok: res.ok, status: res.status, text, json, label };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      text: e instanceof Error ? e.message : String(e),
      json: null,
      label,
    };
  } finally {
    clearTimeout(t);
  }
}

console.log("Scriptony — Prüfe .env.local (Appwrite + Functions)\n");

if (!existsSync(envPath)) {
  console.error("Fehlt: .env.local (Kopie von .env.local.example)\n  ", envPath);
  process.exit(1);
}

const env = parseEnvFile(readFileSync(envPath, "utf8"));
const endpoint = env.VITE_APPWRITE_ENDPOINT?.trim();
const projectId = env.VITE_APPWRITE_PROJECT_ID?.trim();
const fnBase =
  env.VITE_APPWRITE_FUNCTIONS_BASE_URL?.trim() || env.VITE_BACKEND_API_BASE_URL?.trim();

if (!endpoint || !projectId) {
  console.error("In .env.local fehlen VITE_APPWRITE_ENDPOINT und/oder VITE_APPWRITE_PROJECT_ID.");
  process.exit(1);
}

if (!fnBase) {
  console.error(
    "In .env.local fehlt VITE_APPWRITE_FUNCTIONS_BASE_URL oder VITE_BACKEND_API_BASE_URL."
  );
  process.exit(1);
}

const appwriteHealth = `${trimSlash(endpoint)}/health`;
const projectsHealth = `${trimSlash(fnBase)}/scriptony-projects/health`;

let failed = false;

for (const url of [appwriteHealth, projectsHealth]) {
  const label = url.includes("scriptony-projects") ? "scriptony-projects /health" : "Appwrite /health";
  process.stdout.write(`→ ${label}\n  GET ${url}\n`);
  const r = await fetchJson(url, label);
  if (r.ok) {
    const brief = r.json != null ? JSON.stringify(r.json) : r.text.slice(0, 120);
    console.log(`  OK (${r.status})`, brief);
  } else {
    failed = true;
    console.log(`  FEHLER (${r.status})`, r.text.slice(0, 200));
  }
  console.log("");
}

if (failed) {
  console.error("Mindestens ein Check fehlgeschlagen. URLs und Netzwerk prüfen.\n");
  process.exit(1);
}

console.log("Checks OK. App: npm run dev → http://localhost:3000\n");
