/**
 * Shared environment helpers for Nhost functions.
 *
 * This keeps runtime config consistent across all route handlers.
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

export function getAuthBaseUrl(): string {
  return trimTrailingSlash(getRequiredEnv("NHOST_AUTH_URL"));
}

export function getGraphqlUrl(): string {
  const direct = getOptionalEnv("NHOST_GRAPHQL_URL");
  if (direct) {
    return trimTrailingSlash(direct);
  }

  const hasuraUrl = trimTrailingSlash(getRequiredEnv("NHOST_HASURA_URL"));
  if (hasuraUrl.endsWith("/v1/graphql")) {
    return hasuraUrl;
  }

  if (hasuraUrl.endsWith("/v1")) {
    return `${hasuraUrl}/graphql`;
  }

  return `${hasuraUrl}/v1/graphql`;
}

export function getStorageBaseUrl(): string {
  return trimTrailingSlash(getRequiredEnv("NHOST_STORAGE_URL"));
}

export type StorageBucketKind =
  | "general"
  | "projectImages"
  | "worldImages"
  | "shotImages"
  | "audioFiles";

const STORAGE_BUCKET_DEFAULTS: Record<StorageBucketKind, string> = {
  general: "make-3b52693b-general",
  projectImages: "make-3b52693b-project-images",
  worldImages: "make-3b52693b-world-images",
  shotImages: "make-3b52693b-shots",
  audioFiles: "make-3b52693b-audio-files",
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

export function getAdminSecret(): string {
  return getRequiredEnv("NHOST_ADMIN_SECRET");
}

export function getDemoUserCredentials(): {
  email: string;
  password: string;
  displayName: string;
} {
  return {
    email: process.env.SCRIPTONY_DEMO_EMAIL?.trim() || "demo@scriptony.app",
    password: process.env.SCRIPTONY_DEMO_PASSWORD?.trim() || "demo123456",
    displayName: process.env.SCRIPTONY_DEMO_NAME?.trim() || "Scriptony Demo",
  };
}
