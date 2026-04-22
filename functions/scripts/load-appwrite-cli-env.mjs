/**
 * Lädt Appwrite-Variablen für CLI-/Deploy-Skripte: zuerst process.env,
 * dann bevorzugt serverseitige Env-Dateien (`.env.server.local` / `.env.server`),
 * danach Repo-Root `.env.local` / `.env.migration`, optional `functions/.env`.
 * Mappt VITE_APPWRITE_ENDPOINT / VITE_APPWRITE_PROJECT_ID auf APPWRITE_* falls diese fehlen.
 *
 * API-Key muss als APPWRITE_API_KEY gesetzt sein (nicht VITE_ — nie ins Frontend).
 *
 * Location: functions/scripts/load-appwrite-cli-env.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Repo root: …/scriptony-appwrite (…/functions/scripts → ../..) */
const REPO_ROOT = resolve(__dirname, "../..");
const FUNCTIONS_ROOT = resolve(__dirname, "..");

/**
 * Sucht `.env.server.local` / `.env.server` / `.env.local` / `.env` / `.env.migration`
 * beginnend bei `startDir` nach oben
 * (nächstliegende Datei zuerst). Hilft, wenn `npm --prefix functions` cwd/INIT_CWD
 * anders setzt oder `functions` ein Symlink ist.
 */
function collectEnvPathsWalkingUp(startDir) {
  if (!startDir?.trim()) return [];
  const out = [];
  let dir = resolve(startDir.trim());
  for (let depth = 0; depth < 14; depth++) {
    for (
      const name of [
        ".env.server.local",
        ".env.server",
        ".env.local",
        ".env",
        ".env.migration",
      ]
    ) {
      const p = resolve(dir, name);
      if (existsSync(p)) out.push(p);
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return out;
}

function parseEnvFile(text) {
  const raw = text.replace(/^\uFEFF/, "");
  for (const line of raw.split("\n")) {
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
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
}

function tryLoad(path) {
  if (!existsSync(path)) return;
  parseEnvFile(readFileSync(path, "utf8"));
}

export function loadAppwriteCliEnv() {
  const init = process.env.INIT_CWD?.trim();
  const cwd = process.cwd();

  /** npm setzt INIT_CWD auf das Verzeichnis, von dem aus `npm run` gestartet wurde (meist Repo-Root). */
  const paths = [
    ...collectEnvPathsWalkingUp(init),
    ...collectEnvPathsWalkingUp(cwd),
    init && resolve(init, ".env.server.local"),
    init && resolve(init, ".env.server"),
    init && resolve(init, ".env.local"),
    init && resolve(init, ".env"),
    resolve(REPO_ROOT, ".env.server.local"),
    resolve(REPO_ROOT, ".env.server"),
    resolve(REPO_ROOT, ".env.local"),
    resolve(REPO_ROOT, ".env"),
    resolve(REPO_ROOT, ".env.migration"),
    resolve(FUNCTIONS_ROOT, ".env.server.local"),
    resolve(FUNCTIONS_ROOT, ".env.server"),
    resolve(FUNCTIONS_ROOT, ".env"),
    resolve(cwd, ".env.server.local"),
    resolve(cwd, ".env.server"),
    resolve(cwd, ".env.local"),
    resolve(cwd, ".env"),
    resolve(cwd, ".env.migration"),
    basename(cwd) === "functions"
      ? resolve(cwd, "..", ".env.server.local")
      : null,
    basename(cwd) === "functions" ? resolve(cwd, "..", ".env.server") : null,
    basename(cwd) === "functions" ? resolve(cwd, "..", ".env.local") : null,
    basename(cwd) === "functions" ? resolve(cwd, "..", ".env") : null,
  ].filter((p) => typeof p === "string" && p.length > 0);

  const seen = new Set();
  for (const p of paths) {
    const norm = resolve(p);
    if (seen.has(norm)) continue;
    seen.add(norm);
    tryLoad(norm);
  }

  if (process.env.DEBUG_APPWRITE_CLI) {
    console.error("[load-appwrite-cli-env] INIT_CWD=", init);
    console.error("[load-appwrite-cli-env] REPO_ROOT=", REPO_ROOT);
    console.error("[load-appwrite-cli-env] cwd=", cwd);
    for (const p of seen) {
      console.error("  loaded check:", p, existsSync(p));
    }
    console.error(
      "  VITE_EP?",
      Boolean(process.env.VITE_APPWRITE_ENDPOINT),
      "APPWRITE_KEY?",
      Boolean(process.env.APPWRITE_API_KEY || process.env.APPWRITE_APIKEY),
    );
  }

  const trimSlash = (s) => s.replace(/\/+$/, "");

  if (
    !process.env.APPWRITE_ENDPOINT?.trim() &&
    process.env.VITE_APPWRITE_ENDPOINT?.trim()
  ) {
    process.env.APPWRITE_ENDPOINT = trimSlash(
      process.env.VITE_APPWRITE_ENDPOINT.trim(),
    );
  }
  if (
    !process.env.APPWRITE_PROJECT_ID?.trim() &&
    process.env.VITE_APPWRITE_PROJECT_ID?.trim()
  ) {
    process.env.APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID
      .trim();
  }

  /** Viele .env-Dateien nutzen `APPWRITE_APIKEY` (Console/ältere Docs); SDK erwartet `APPWRITE_API_KEY`. */
  if (
    !process.env.APPWRITE_API_KEY?.trim() &&
    process.env.APPWRITE_APIKEY?.trim()
  ) {
    process.env.APPWRITE_API_KEY = process.env.APPWRITE_APIKEY.trim();
  }
}

/**
 * Nach {@link loadAppwriteCliEnv}: welche Server-Variablen fehlen noch (für klare CLI-Fehler).
 */
export function getMissingAppwriteServerEnvKeys() {
  loadAppwriteCliEnv();
  const missing = [];
  if (!process.env.APPWRITE_ENDPOINT?.trim()) {
    missing.push("APPWRITE_ENDPOINT oder VITE_APPWRITE_ENDPOINT");
  }
  if (!process.env.APPWRITE_PROJECT_ID?.trim()) {
    missing.push("APPWRITE_PROJECT_ID oder VITE_APPWRITE_PROJECT_ID");
  }
  if (!process.env.APPWRITE_API_KEY?.trim()) {
    missing.push(
      "APPWRITE_API_KEY oder APPWRITE_APIKEY (Server-Key aus der Appwrite-Console)",
    );
  }
  return missing;
}
