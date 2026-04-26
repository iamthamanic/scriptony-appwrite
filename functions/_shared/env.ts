/**
 * Server-side environment for Scriptony HTTP functions (Node / Appwrite Functions).
 *
 * Reads `process.env` only here and in thin wrappers — keeps handlers free of duplicated
 * `process.env` access (DRY). Values like `APPWRITE_API_KEY` must never be imported from frontend code.
 *
 * PRIORITY (highest to lowest):
 * 1. SCRIPTONY_APPWRITE_API_ENDPOINT - Custom override for external access (bypasses injected values)
 * 2. APPWRITE_FUNCTION_API_ENDPOINT - Injected by Appwrite for in-cluster calls
 * 3. APPWRITE_ENDPOINT - Public URL (fallback)
 * 4. APPWRITE_FUNCTION_ENDPOINT - Alternative injected value
 *
 * Location: functions/_shared/env.ts
 */

import process from "node:process";
function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getRequiredEnv(name: string): string {
  const value = getOptionalEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Server-to-server Appwrite endpoint.
 *
 * CRITICAL: SCRIPTONY_APPWRITE_API_ENDPOINT must be set for external function domains
 * to override the injected APPWRITE_FUNCTION_API_ENDPOINT which points to internal
 * Docker network (http://appwrite/v1) that is not reachable from outside.
 */
export function getAppwriteEndpoint(): string {
  // PRIORITY 1: Custom override - must be explicit for external domain access
  const customEndpoint = getOptionalEnv("SCRIPTONY_APPWRITE_API_ENDPOINT");
  if (customEndpoint) {
    return trimTrailingSlash(customEndpoint);
  }

  // PRIORITY 2: Appwrite-injected endpoint for in-cluster calls (internal Docker network)
  const functionApiEndpoint = getOptionalEnv("APPWRITE_FUNCTION_API_ENDPOINT");
  if (functionApiEndpoint) {
    return trimTrailingSlash(functionApiEndpoint);
  }

  // PRIORITY 3: Public endpoint (fallback for manual configuration)
  const publicEndpoint = getOptionalEnv("APPWRITE_ENDPOINT");
  if (publicEndpoint) {
    return trimTrailingSlash(publicEndpoint);
  }

  // PRIORITY 4: Alternative injected endpoint
  const functionEndpoint = getOptionalEnv("APPWRITE_FUNCTION_ENDPOINT");
  if (functionEndpoint) {
    return trimTrailingSlash(functionEndpoint);
  }

  return trimTrailingSlash(getRequiredEnv("APPWRITE_ENDPOINT"));
}

/** Public endpoint for URLs returned to the browser (never the in-cluster hostname). */
export function getPublicAppwriteEndpoint(): string {
  // Prefer explicit public URL, fall back to APPWRITE_ENDPOINT
  const pub =
    getOptionalEnv("APPWRITE_PUBLIC_ENDPOINT") ||
    getOptionalEnv("APPWRITE_ENDPOINT");
  if (pub) {
    return trimTrailingSlash(pub);
  }
  return getAppwriteEndpoint();
}

export function getAppwriteProjectId(): string {
  const fn = getOptionalEnv("APPWRITE_FUNCTION_PROJECT_ID");
  if (fn) {
    return fn;
  }
  return (
    getOptionalEnv("APPWRITE_PROJECT_ID") ||
    getRequiredEnv("APPWRITE_FUNCTION_PROJECT_ID")
  );
}

export function getAppwriteApiKey(): string {
  return (
    getOptionalEnv("APPWRITE_API_KEY") ||
    getRequiredEnv("APPWRITE_FUNCTION_API_KEY")
  );
}

export function getAppwriteDatabaseId(): string {
  return getOptionalEnv("APPWRITE_DATABASE_ID") || "scriptony";
}

export type StorageBucketKind =
  | "general"
  | "projectImages"
  | "worldImages"
  | "shotImages"
  | "stageDocuments"
  | "audioFiles";

const STORAGE_BUCKET_DEFAULTS: Record<StorageBucketKind, string> = {
  general: "general",
  projectImages: "project-images",
  worldImages: "world-images",
  shotImages: "shots",
  stageDocuments: "stage-documents",
  audioFiles: "audio-files",
};

export function getStorageBucketId(kind: StorageBucketKind): string {
  const envMap: Record<StorageBucketKind, string> = {
    general: "SCRIPTONY_STORAGE_BUCKET_GENERAL",
    projectImages: "SCRIPTONY_STORAGE_BUCKET_PROJECT_IMAGES",
    worldImages: "SCRIPTONY_STORAGE_BUCKET_WORLD_IMAGES",
    shotImages: "SCRIPTONY_STORAGE_BUCKET_SHOT_IMAGES",
    stageDocuments: "SCRIPTONY_STORAGE_BUCKET_STAGE_DOCUMENTS",
    audioFiles: "SCRIPTONY_STORAGE_BUCKET_AUDIO_FILES",
  };

  return getOptionalEnv(envMap[kind]) || STORAGE_BUCKET_DEFAULTS[kind];
}

export function getDemoUserCredentials(): {
  email: string;
  password: string;
  displayName: string;
} {
  return {
    email: process.env.SCRIPTONY_DEMO_EMAIL?.trim() || "demo@scriptony.app",
    password: process.env.SCRIPTONY_DEMO_PASSWORD?.trim() || "DemoUser999",
    displayName: process.env.SCRIPTONY_DEMO_NAME?.trim() || "Scriptony Demo",
  };
}
