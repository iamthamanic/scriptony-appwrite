#!/usr/bin/env node
/**
 * Verifies "local Vite + remote Nhost" test setup: Auth and GraphQL reachable from this machine.
 * Reads .env.local from repo root (same keys as Vite). Location: scripts/verify-remote-nhost-test-env.mjs
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

function graphqlOriginHealthz(graphqlV1Url) {
  const u = new URL(graphqlV1Url.trim());
  return `${u.origin}/healthz`;
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

console.log("Scriptony — Testumgebung: lokales Frontend (.env.local) → entferntes Nhost (Auth / Hasura)\n");
console.log("Hinweis: Postgres läuft nur auf dem Server; der Mac spricht nie direkt mit der DB.\n");

if (!existsSync(envPath)) {
  console.error("Fehlt: .env.local (Kopie von .env.local.example)\n  ", envPath);
  process.exit(1);
}

const env = parseEnvFile(readFileSync(envPath, "utf8"));
const authBase = env.VITE_NHOST_AUTH_URL?.trim();
const graphqlBase = env.VITE_NHOST_GRAPHQL_URL?.trim();

if (!authBase || !graphqlBase) {
  console.error("In .env.local fehlen VITE_NHOST_AUTH_URL und/oder VITE_NHOST_GRAPHQL_URL.");
  process.exit(1);
}

const authHealth = authBase.replace(/\/+$/, "") + "/healthz";
const gqlHealth = graphqlOriginHealthz(graphqlBase);

let failed = false;

for (const url of [authHealth, gqlHealth]) {
  const label = url.includes("graphql") || url.includes("local.graphql") ? "Hasura (GraphQL host)" : "Nhost Auth";
  process.stdout.write(`→ ${label}\n  GET ${url}\n`);
  const r = await fetchJson(url, label);
  if (r.ok) {
    const brief =
      r.json != null
        ? JSON.stringify(r.json)
        : r.text.trimStart().startsWith("<!")
          ? "(HTML — Host erreichbar, vermutlich Hasura/Console)"
          : r.text.slice(0, 120);
    console.log(`  OK (${r.status})`, brief);
  } else {
    failed = true;
    console.log(`  FEHLER (${r.status})`, r.text.slice(0, 200));
  }
  console.log("");
}

if (failed) {
  console.error(
    "Netzwerk oder DNS: Prüfe /etc/hosts (scripts/macos-override-nhost-local-hosts.sh) und ob der Nhost-Stack auf dem VPS läuft.\n"
  );
  process.exit(1);
}

console.log("Alles erreichbar. Starte die App mit: npm run dev → http://localhost:3000\n");
console.log("Ersten Auth-User (wenn Signup erlaubt): ./scripts/nhost-signup-email-password.sh email pass\n");
