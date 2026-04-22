/**
 * Appwrite web Client singleton for the Scriptony SPA.
 *
 * Endpoint and project ID come from
 * `src/lib/env.ts` (`VITE_APPWRITE_*`). Never embed API keys in the browser.
 *
 * Location: src/lib/appwrite/client.ts
 */

import { Client } from "appwrite";
import { getAppwritePublicConfig } from "../env";

let _client: Client | null = null;

export function getAppwriteClient(): Client {
  if (_client) {
    return _client;
  }

  const cfg = getAppwritePublicConfig();
  if (!cfg) {
    throw new Error(
      "Appwrite is not configured: set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID",
    );
  }

  const endpoint = typeof cfg.endpoint === "string" ? cfg.endpoint.trim() : "";
  const projectId =
    typeof cfg.projectId === "string" ? cfg.projectId.trim() : "";
  if (!endpoint || !projectId) {
    throw new Error(
      "Appwrite endpoint or project ID is empty after trim — check .env.local and restart Vite (rm -rf node_modules/.vite if needed).",
    );
  }

  _client = new Client().setEndpoint(endpoint).setProject(projectId);
  return _client;
}

/** For tests or hot reload when switching env. */
export function resetAppwriteClient(): void {
  _client = null;
}
