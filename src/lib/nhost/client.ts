/**
 * Shared Nhost client bootstrap.
 *
 * This file centralizes Nhost SDK setup so auth, storage, GraphQL, and functions
 * all use the same session-aware client instance.
 */

import { createClient, type NhostClient } from "@nhost/nhost-js";
import { backendConfig, getMissingNhostConfig } from "../env";
import {
  NHOST_SESSION_STORAGE_KEY,
  persistNativeSessionStorage,
} from "../capacitor/platform";

let nhostClient: NhostClient | null = null;
let sessionMirrorBound = false;

function createNhostSdkClient(): NhostClient {
  const { nhost } = backendConfig;
  const missingConfig = getMissingNhostConfig(nhost);

  if (missingConfig.length > 0) {
    throw new Error(
      `Nhost is selected but not configured. Create Scriptonyapp/.env.local and set: ${missingConfig.join(", ")}`
    );
  }

  return createClient({
    subdomain: nhost.subdomain || undefined,
    region: nhost.region || undefined,
    authUrl: nhost.authUrl || undefined,
    storageUrl: nhost.storageUrl || undefined,
    graphqlUrl: nhost.graphqlUrl || undefined,
    functionsUrl: nhost.functionsUrl || undefined,
  });
}

function bindNativeSessionMirror(client: NhostClient): void {
  if (sessionMirrorBound || typeof window === "undefined") {
    return;
  }

  sessionMirrorBound = true;

  client.sessionStorage.onChange((session) => {
    const snapshot = session
      ? window.localStorage.getItem(NHOST_SESSION_STORAGE_KEY)
      : null;

    void persistNativeSessionStorage(snapshot);
  });
}

export function getNhostClient(): NhostClient {
  if (!nhostClient) {
    nhostClient = createNhostSdkClient();
    bindNativeSessionMirror(nhostClient);
  }

  return nhostClient;
}
