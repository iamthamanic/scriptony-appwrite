/**
 * Appwrite SDK client setup for the Local Bridge.
 *
 * Uses the server-side SDK with an API key for:
 * - Databases: read renderJobs, shots, guideBundles
 * - Storage: upload result images
 * - Realtime: subscribe to collection changes
 */

import { Client, Databases, Storage } from "node-appwrite";
import { getConfig } from "./config.js";
import { log } from "./logger.js";

let _client: Client | null = null;
let _databases: Databases | null = null;
let _storage: Storage | null = null;

export function getAppwriteClient(): Client {
  if (!_client) {
    const config = getConfig();
    _client = new Client()
      .setEndpoint(config.BRIDGE_APPWRITE_ENDPOINT)
      .setProject(config.BRIDGE_APPWRITE_PROJECT_ID)
      .setKey(config.BRIDGE_APPWRITE_API_KEY);
    log.info("appwrite-client", "Client initialized", {
      endpoint: config.BRIDGE_APPWRITE_ENDPOINT,
      project: config.BRIDGE_APPWRITE_PROJECT_ID,
    });
  }
  return _client;
}

export function getDatabases(): Databases {
  if (!_databases) {
    _databases = new Databases(getAppwriteClient());
  }
  return _databases;
}

export function getStorage(): Storage {
  if (!_storage) {
    _storage = new Storage(getAppwriteClient());
  }
  return _storage;
}

/** Collection IDs matching the Appwrite database schema. */
export const Collections = {
  renderJobs: "renderJobs",
  imageTasks: "imageTasks",
  shots: "shots",
  guideBundles: "guideBundles",
  styleProfiles: "styleProfiles",
  stageDocuments: "stageDocuments",
} as const;