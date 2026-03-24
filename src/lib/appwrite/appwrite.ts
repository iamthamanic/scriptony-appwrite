/**
 * Appwrite web SDK entry (Client, Account, Databases) for Scriptony.
 *
 * Endpoint and project default to the configured VPS project when `VITE_*` is unset
 * (local ping without `.env.local`). Otherwise uses `getAppwritePublicConfig()` via
 * `getAppwriteClient()` so Vercel/production stay env-driven.
 *
 * Location: src/lib/appwrite/appwrite.ts
 */

import { Account, Client, Databases } from "appwrite";
import { getAppwriteClient } from "./client";
import { getAppwritePublicConfig } from "../env";

/** Self-hosted Scriptony Appwrite (fallback if `VITE_APPWRITE_*` not set). */
const DEFAULT_ENDPOINT = "http://72.61.84.64:8080/v1";
const DEFAULT_PROJECT_ID = "69c04993003de8ff42aa";

function getOrCreateSdkClient(): Client {
  const fromEnv = getAppwritePublicConfig();
  if (fromEnv?.endpoint && fromEnv?.projectId) {
    return getAppwriteClient();
  }

  return new Client()
    .setEndpoint(DEFAULT_ENDPOINT)
    .setProject(DEFAULT_PROJECT_ID);
}

const client = getOrCreateSdkClient();
const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
