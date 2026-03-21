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
      "Appwrite is not configured: set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID"
    );
  }

  _client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);
  return _client;
}

/** For tests or hot reload when switching env. */
export function resetAppwriteClient(): void {
  _client = null;
}
