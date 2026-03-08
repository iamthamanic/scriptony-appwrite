/**
 * Auth Client Factory
 *
 * Returns a singleton instance of the Nhost auth client.
 */

import { NhostAuthAdapter } from "./NhostAuthAdapter";
import type { AuthClient } from "./AuthClient";

let _client: AuthClient | null = null;

/**
 * Get the auth client singleton
 */
export function getAuthClient(): AuthClient {
  if (_client) return _client;

  _client = new NhostAuthAdapter();
  return _client;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetAuthClient(): void {
  _client = null;
}
