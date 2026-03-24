/**
 * Resolves Appwrite endpoint, project, API key, and database id for repo CLI tools
 * (after `appwrite-env-load.mjs` has populated process.env).
 *
 * Location: functions/tools/_appwrite-tool-creds.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { repoRoot } from "./appwrite-env-load.mjs";

function envFirst(...names) {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return null;
}

function getRequiredAny(message, ...names) {
  const v = envFirst(...names);
  if (!v) throw new Error(message);
  return v;
}

function apiKeyLineIsEmptyInFile(absPath) {
  if (!existsSync(absPath)) return false;
  const text = readFileSync(absPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (/^APPWRITE_API_KEY\s*=/.test(t)) {
      const eq = t.indexOf("=");
      const rest = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      return rest.length === 0;
    }
  }
  return false;
}

const API_KEY_HINT_BASE =
  "Set APPWRITE_API_KEY in .env / .env.server.local or export it (server key with databases.* and storage.* where needed).";

/**
 * @param {string} [emptyKeyExtra] - Appended to hint when APPWRITE_API_KEY line exists but is empty in .env files
 */
export function getAppwriteToolCredentials(emptyKeyExtra = "") {
  const endpoint = getRequiredAny(
    "Set APPWRITE_ENDPOINT or VITE_APPWRITE_ENDPOINT (e.g. in .env.local).",
    "APPWRITE_ENDPOINT",
    "VITE_APPWRITE_ENDPOINT"
  );
  const projectId = getRequiredAny(
    "Set APPWRITE_PROJECT_ID or VITE_APPWRITE_PROJECT_ID.",
    "APPWRITE_PROJECT_ID",
    "VITE_APPWRITE_PROJECT_ID"
  );
  const apiKeyPaths = [
    join(repoRoot, ".env.server.local"),
    join(repoRoot, ".env.local"),
    join(repoRoot, ".env"),
  ];
  const apiKeyEmptyInFile = apiKeyPaths.some(apiKeyLineIsEmptyInFile);
  const apiKey = getRequiredAny(
    apiKeyEmptyInFile && emptyKeyExtra ? `${API_KEY_HINT_BASE}${emptyKeyExtra}` : API_KEY_HINT_BASE,
    "APPWRITE_API_KEY"
  );
  const databaseId = process.env.APPWRITE_DATABASE_ID?.trim() || "scriptony";
  return { endpoint, projectId, apiKey, databaseId, repoRoot };
}
