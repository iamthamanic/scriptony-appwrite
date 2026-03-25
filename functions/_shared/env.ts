/**
 * Server-side environment for Scriptony HTTP functions (Node / Appwrite Functions).
 *
 * Reads `process.env` only here and in thin wrappers — keeps handlers free of duplicated
 * `process.env` access (DRY). Values like `APPWRITE_API_KEY` must never be imported from frontend code.
 * Endpoint: prefer `APPWRITE_FUNCTION_ENDPOINT` (injected by Appwrite for in-cluster calls) over
 * `APPWRITE_ENDPOINT` (often a public URL that function containers cannot reach).
 *
 * Location: functions/_shared/env.ts
 */

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getOptionalEnv(name: string): string | null {
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

/** Internal endpoint for server-to-server calls (prefers in-cluster APPWRITE_FUNCTION_ENDPOINT). */
export function getAppwriteEndpoint(): string {
  const functionEndpoint = getOptionalEnv("APPWRITE_FUNCTION_ENDPOINT");
  if (functionEndpoint) {
    return trimTrailingSlash(functionEndpoint);
  }
  return trimTrailingSlash(getRequiredEnv("APPWRITE_ENDPOINT"));
}

/** Public endpoint for URLs returned to the browser (never the in-cluster hostname). */
export function getPublicAppwriteEndpoint(): string {
  // Prefer explicit public URL, fall back to APPWRITE_ENDPOINT
  const pub = getOptionalEnv("APPWRITE_PUBLIC_ENDPOINT") || getOptionalEnv("APPWRITE_ENDPOINT");
  if (pub) {
    return trimTrailingSlash(pub);
  }
  return getAppwriteEndpoint();
}

export function getAppwriteProjectId(): string {
  return getOptionalEnv("APPWRITE_PROJECT_ID") || getRequiredEnv("APPWRITE_FUNCTION_PROJECT_ID");
}

export function getAppwriteApiKey(): string {
  return getOptionalEnv("APPWRITE_API_KEY") || getRequiredEnv("APPWRITE_FUNCTION_API_KEY");
}

export function getAppwriteDatabaseId(): string {
  return getOptionalEnv("APPWRITE_DATABASE_ID") || "scriptony";
}

export type StorageBucketKind =
  | "general"
  | "projectImages"
  | "worldImages"
  | "shotImages"
  | "audioFiles";

const STORAGE_BUCKET_DEFAULTS: Record<StorageBucketKind, string> = {
  general: "general",
  projectImages: "project-images",
  worldImages: "world-images",
  shotImages: "shots",
  audioFiles: "audio-files",
};

export function getStorageBucketId(kind: StorageBucketKind): string {
  const envMap: Record<StorageBucketKind, string> = {
    general: "SCRIPTONY_STORAGE_BUCKET_GENERAL",
    projectImages: "SCRIPTONY_STORAGE_BUCKET_PROJECT_IMAGES",
    worldImages: "SCRIPTONY_STORAGE_BUCKET_WORLD_IMAGES",
    shotImages: "SCRIPTONY_STORAGE_BUCKET_SHOT_IMAGES",
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
