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

let projectsDomain = null;
let assistantDomain = null;
let imageDomain = null;
let styleGuideDomain = null;
let worldbuildingDomain = null;
let mcpAppwriteDomain = null;
let clipsDomain = null;
let domainMap = null;
const mapRaw = env.VITE_BACKEND_FUNCTION_DOMAIN_MAP?.trim();
if (mapRaw) {
  try {
    const m = JSON.parse(mapRaw);
    if (m && typeof m === "object") {
      domainMap = m;
      if (typeof m["scriptony-projects"] === "string") {
        projectsDomain = m["scriptony-projects"].trim();
      }
      if (typeof m["scriptony-assistant"] === "string") {
        assistantDomain = m["scriptony-assistant"].trim();
      }
      if (typeof m["scriptony-image"] === "string") {
        imageDomain = m["scriptony-image"].trim();
      }
      if (typeof m["scriptony-style-guide"] === "string") {
        styleGuideDomain = m["scriptony-style-guide"].trim();
      }
      if (typeof m["scriptony-worldbuilding"] === "string") {
        worldbuildingDomain = m["scriptony-worldbuilding"].trim();
      }
      if (typeof m["scriptony-mcp-appwrite"] === "string") {
        mcpAppwriteDomain = m["scriptony-mcp-appwrite"].trim();
      }
      if (typeof m["scriptony-clips"] === "string") {
        clipsDomain = m["scriptony-clips"].trim();
      }
    }
  } catch {
    /* ignore */
  }
}

if (!endpoint || !projectId) {
  console.error("In .env.local fehlen VITE_APPWRITE_ENDPOINT und/oder VITE_APPWRITE_PROJECT_ID.");
  process.exit(1);
}

if (!fnBase && !projectsDomain) {
  console.error(
    "In .env.local fehlt eine Basis-URL für die HTTP-Functions. Setze **eine** der folgenden Optionen:\n\n" +
      "  A) Pro Function (empfohlen, Appwrite Console → Functions → scriptony-projects → Domains):\n" +
      '     VITE_BACKEND_FUNCTION_DOMAIN_MAP={"scriptony-projects":"https://DEINE-FUNCTION-DOMAIN"}\n' +
      "     (eine Zeile, doppelte Anführungszeichen im JSON. Weitere Keys später ergänzbar.)\n\n" +
      "  B) Gateway / Pfad-Prefix (ein Host, unter dem …/scriptony-projects/… erreichbar ist):\n" +
      "     VITE_APPWRITE_FUNCTIONS_BASE_URL=https://DEIN-GATEWAY\n" +
      "     (Alias: VITE_BACKEND_API_BASE_URL — gleiche Bedeutung.)\n\n" +
      "Nicht leer lassen: `VITE_BACKEND_FUNCTION_DOMAIN_MAP=` ohne JSON zählt als „fehlt“.\n" +
      "Siehe .env.local.example und docs/DEPLOYMENT.md.\n"
  );
  process.exit(1);
}

const appwriteHealth = `${trimSlash(endpoint)}/health`;
const projectsHealth = projectsDomain
  ? `${trimSlash(projectsDomain)}/health`
  : `${trimSlash(fnBase)}/scriptony-projects/health`;

/** KI & LLM: gleiche URL-Logik wie die SPA (api-gateway buildFunctionRouteUrl). */
const assistantHealth = assistantDomain
  ? `${trimSlash(assistantDomain)}/health`
  : fnBase
    ? `${trimSlash(fnBase)}/scriptony-assistant/health`
    : null;

const imageHealth = imageDomain
  ? `${trimSlash(imageDomain)}/health`
  : fnBase
    ? `${trimSlash(fnBase)}/scriptony-image/health`
    : null;

const mcpAppwriteHealth = mcpAppwriteDomain
  ? `${trimSlash(mcpAppwriteDomain)}/health`
  : fnBase
    ? `${trimSlash(fnBase)}/scriptony-mcp-appwrite/health`
    : null;

const styleGuideHealth = styleGuideDomain
  ? `${trimSlash(styleGuideDomain)}/health`
  : fnBase
    ? `${trimSlash(fnBase)}/scriptony-style-guide/health`
    : null;

const worldbuildingHealth = worldbuildingDomain
  ? `${trimSlash(worldbuildingDomain)}/health`
  : fnBase
    ? `${trimSlash(fnBase)}/scriptony-worldbuilding/health`
    : null;

const clipsHealth = clipsDomain
  ? `${trimSlash(clipsDomain)}/health`
  : fnBase
    ? `${trimSlash(fnBase)}/scriptony-clips/health`
    : null;

let failed = false;

const checks = [
  { url: appwriteHealth, label: "Appwrite /health" },
  { url: projectsHealth, label: "scriptony-projects /health" },
];
if (assistantHealth) {
  checks.push({ url: assistantHealth, label: "scriptony-assistant /health (KI & LLM)" });
} else {
  console.warn(
    "Hinweis: Keine URL für scriptony-assistant ermittelbar (KI-Einstellungen).\n" +
      "  Setze VITE_APPWRITE_FUNCTIONS_BASE_URL **oder** ergänze in VITE_BACKEND_FUNCTION_DOMAIN_MAP den Key \"scriptony-assistant\".\n"
  );
}

if (imageHealth) {
  checks.push({ url: imageHealth, label: "scriptony-image /health (Cover & Image-API)" });
} else {
  console.warn(
    "Hinweis: Keine URL für scriptony-image ermittelbar (Cover-Generierung).\n" +
      "  Ergänze in VITE_BACKEND_FUNCTION_DOMAIN_MAP den Key \"scriptony-image\" (Function-Domain aus der Console).\n"
  );
}

if (mcpAppwriteHealth) {
  checks.push({
    url: mcpAppwriteHealth,
    label: "scriptony-mcp-appwrite /health (interne Capabilities)",
  });
} else {
  console.warn(
    "Hinweis: Keine URL für scriptony-mcp-appwrite ermittelbar.\n" +
      "  Setze VITE_APPWRITE_FUNCTIONS_BASE_URL **oder** ergänze in VITE_BACKEND_FUNCTION_DOMAIN_MAP den Key \"scriptony-mcp-appwrite\".\n"
  );
}

if (styleGuideHealth) {
  checks.push({
    url: styleGuideHealth,
    label: "scriptony-style-guide /health (Style Guide)",
  });
} else {
  console.warn(
    "Hinweis: Keine URL für scriptony-style-guide ermittelbar (Style Guide im Projekt).\n" +
      "  Ergänze in VITE_BACKEND_FUNCTION_DOMAIN_MAP den Key \"scriptony-style-guide\" nach Deploy.\n"
  );
}

if (worldbuildingHealth) {
  checks.push({
    url: worldbuildingHealth,
    label: "scriptony-worldbuilding /health (Welten)",
  });
} else {
  console.warn(
    "Hinweis: Keine URL für scriptony-worldbuilding ermittelbar (Welten erstellen/laden).\n" +
      "  Ergänze in VITE_BACKEND_FUNCTION_DOMAIN_MAP den Key \"scriptony-worldbuilding\" (Function-Domain aus der Console).\n" +
      "  Deploy: npm run appwrite:deploy:worldbuilding\n"
  );
}

if (clipsHealth) {
  checks.push({
    url: clipsHealth,
    label: "scriptony-clips /health (Timeline-Clips)",
  });
} else {
  console.warn(
    "Hinweis: Keine URL für scriptony-clips ermittelbar (Timeline-Clips).\n" +
      "  Ergänze in VITE_BACKEND_FUNCTION_DOMAIN_MAP den Key \"scriptony-clips\" (Function-Domain aus der Console).\n" +
      "  Deploy: npm run appwrite:deploy:clips\n"
  );
}

for (const { url, label } of checks) {
  process.stdout.write(`→ ${label}\n  GET ${url}\n`);
  const r = await fetchJson(url, label);
  // Appwrite 1.8+ returns 401 on /v1/health for guests — that still means the server is reachable.
  const isAppwriteReachable = label.startsWith("Appwrite") && r.status === 401;
  if (r.ok || isAppwriteReachable) {
    const brief = r.json != null ? JSON.stringify(r.json) : r.text.slice(0, 120);
    const tag = isAppwriteReachable ? "OK (erreichbar, Auth erforderlich)" : `OK (${r.status})`;
    console.log(`  ${tag}`, brief);
  } else {
    failed = true;
    console.log(`  FEHLER (${r.status})`, r.text.slice(0, 200));
    if (
      label.includes("scriptony-assistant") ||
      label.includes("scriptony-mcp-appwrite") ||
      label.includes("scriptony-image") ||
      label.includes("scriptony-style-guide") ||
      label.includes("scriptony-worldbuilding") ||
      label.includes("scriptony-clips")
    ) {
      const t = typeof r.text === "string" ? r.text : "";
      const looksHtml = t.includes("<!DOCTYPE") || t.includes("<html");
      if (r.status === 404 || looksHtml) {
        const fnId = label.includes("scriptony-mcp-appwrite")
          ? "scriptony-mcp-appwrite"
          : label.includes("scriptony-image")
            ? "scriptony-image"
            : label.includes("scriptony-style-guide")
              ? "scriptony-style-guide"
              : label.includes("scriptony-worldbuilding")
                ? "scriptony-worldbuilding"
                : label.includes("scriptony-clips")
                  ? "scriptony-clips"
                  : "scriptony-assistant";
        console.log(
          `  → Die URL liefert keine Function-JSON-Antwort (HTML/404). Appwrite: Function \`${fnId}\` deployen,\n` +
            "     aktives Deployment wählen und unter Functions → Domains dieselbe Host-URL wie in .env eintragen.\n" +
            "     Browser: „Failed to fetch“ entsteht oft durch fehlende CORS auf der Fehlerseite — nach Deploy behoben."
        );
        if (fnId === "scriptony-style-guide") {
          console.log(
            "     CLI (im Projekt, Appwrite eingeloggt): npm run appwrite:deploy:style-guide\n"
          );
        }
        if (fnId === "scriptony-worldbuilding") {
          console.log(
            "     CLI (im Projekt, Appwrite eingeloggt): npm run appwrite:deploy:worldbuilding\n"
          );
        }
        if (fnId === "scriptony-clips") {
          console.log("     CLI (im Projekt, Appwrite eingeloggt): npm run appwrite:deploy:clips\n");
        }
      }
    }
  }
  console.log("");
}

if (failed) {
  console.error("Mindestens ein Check fehlgeschlagen. URLs und Netzwerk prüfen.\n");
  process.exit(1);
}

console.log("Checks OK. App: npm run dev → http://localhost:3000\n");
