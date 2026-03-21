/**
 * Auth client factory (singleton).
 *
 * Returns `AppwriteAuthAdapter` implementing `AuthClient` — the only supported production path.
 * Configuration comes from `src/lib/env.ts` (`VITE_APPWRITE_*`). Factory keeps call sites decoupled
 * from the concrete adapter (useful for tests via `resetAuthClient`).
 *
 * Location: src/lib/auth/getAuthClient.ts
 */

import { resetAppwriteClient } from "../appwrite/client";
import { getMissingAppwriteConfig } from "../env";
import { AppwriteAuthAdapter } from "./AppwriteAuthAdapter";
import type { AuthClient } from "./AuthClient";

let _client: AuthClient | null = null;

/**
 * Get the auth client singleton
 */
export function getAuthClient(): AuthClient {
  if (_client) return _client;

  const missing = getMissingAppwriteConfig();
  if (missing.length > 0) {
    throw new Error(`Appwrite auth requires: ${missing.join(", ")}`);
  }
  _client = new AppwriteAuthAdapter();

  return _client;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetAuthClient(): void {
  _client = null;
  resetAppwriteClient();
}
