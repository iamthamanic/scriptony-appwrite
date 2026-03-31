#!/usr/bin/env node
/**
 * Appwrite CLI + HTTP smoke: functions list + GET /health per entry in
 * VITE_BACKEND_FUNCTION_DOMAIN_MAP (assistant, projects, mcp-host) for a direct contrast.
 *
 * Requires: `appwrite` on PATH with `appwrite client` already configured (same project as .env.local).
 * Usage: npm run verify:functions-cli
 * Location: scripts/verify-appwrite-functions-cli.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

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

async function fetchHealth(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();
    const looksJson = text.trim().startsWith("{");
    return { status: res.status, ok: res.ok, snippet: text.slice(0, 160), looksJson };
  } catch (e) {
    return {
      status: 0,
      ok: false,
      snippet: e instanceof Error ? e.message : String(e),
      looksJson: false,
    };
  } finally {
    clearTimeout(t);
  }
}

console.log("Scriptony — Appwrite CLI + HTTP (/health)\n");

let listJson;
try {
  const out = execSync("appwrite functions list -j", {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  listJson = JSON.parse(out);
} catch (e) {
  console.error(
    "appwrite CLI fehlgeschlagen (client konfigurieren: appwrite client …):\n",
    e instanceof Error ? e.message : e
  );
  process.exit(1);
}

const functions = listJson.functions || [];
const ids = ["scriptony-assistant", "scriptony-projects"];

for (const id of ids) {
  const f = functions.find((x) => x.$id === id || x.name === id);
  console.log(`→ CLI: ${id}`);
  if (!f) {
    console.log("  (nicht in functions list)\n");
    continue;
  }
  console.log(
    `  enabled=${f.enabled} live=${f.live} deployment=${f.deploymentId || "(none)"} status=${f.latestDeploymentStatus || "?"}`
  );
  console.log("");
}

const httpKeys = ["scriptony-assistant", "scriptony-projects", "scriptony-mcp-appwrite"];
const httpUrls = {};

if (existsSync(envPath)) {
  const env = parseEnvFile(readFileSync(envPath, "utf8"));
  const mapRaw = env.VITE_BACKEND_FUNCTION_DOMAIN_MAP?.trim();
  if (mapRaw) {
    try {
      const m = JSON.parse(mapRaw);
      if (m && typeof m === "object") {
        for (const key of httpKeys) {
          if (typeof m[key] === "string" && m[key].trim()) {
            httpUrls[key] = `${trimSlash(m[key].trim())}/health`;
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
}

const httpResults = {};
for (const key of httpKeys) {
  const url = httpUrls[key];
  if (!url) continue;
  httpResults[key] = await fetchHealth(url);
}

if (Object.keys(httpResults).length === 0) {
  console.log(
    "→ HTTP: Keine URLs für Functions in .env.local\n" +
      "  (VITE_BACKEND_FUNCTION_DOMAIN_MAP: scriptony-assistant, scriptony-projects, scriptony-mcp-appwrite) — übersprungen.\n"
  );
} else {
  console.log("→ HTTP GET /health (aus .env.local)\n");
  for (const key of httpKeys) {
    const url = httpUrls[key];
    const r = httpResults[key];
    if (!url || !r) {
      console.log(`  [${key}] (nicht in Map)\n`);
      continue;
    }
    console.log(`  [${key}]`);
    console.log(`    ${url}`);
    const tag = r.ok && r.looksJson ? `OK (${r.status})` : `FEHLER (${r.status || "network"})`;
    console.log(`    ${tag}`, r.snippet.replace(/\s+/g, " ").trim());
    console.log("");
  }

  const a = httpResults["scriptony-assistant"];
  const p = httpResults["scriptony-projects"];
  if (a && p && p.ok && p.looksJson && (!a.ok || !a.looksJson)) {
    console.log(
      "→ Kontrast: scriptony-projects liefert JSON/OK, scriptony-assistant nicht — Ursache liegt bei\n" +
        "  Assistant (Domain, Executor, Proxy oder Runtime), nicht bei der generellen Function-Routing-Kette.\n"
    );
  }
  if (a?.status === 503) {
    console.log(
      "→ Hinweis: CLI kann „live/ready“ melden, HTTP-Domain liefert 503 — Executor/Proxy, Logs in der\n" +
        "  Console, Domain-Eintrag vs. Map prüfen.\n"
    );
  }

  // scriptony-assistant must be healthy for KI settings; optional functions (e.g. scriptony-mcp-appwrite)
  // are reported above but do not fail this script — keeps CI green when MCP host is not deployed.
  if (httpResults["scriptony-assistant"] && !httpResults["scriptony-assistant"].ok) {
    process.exitCode = 1;
  }
}
