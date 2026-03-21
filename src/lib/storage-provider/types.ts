/**
 * Storage Provider Types
 *
 * Generic types for pluggable storage backends (Scriptony Cloud on backend,
 * other providers client-only). Used by Einstellungen → Speicher tab and
 * future storage adapter implementations.
 */

export type StorageBucketKind =
  | "projectImages"
  | "worldImages"
  | "shotImages"
  | "audioFiles"
  | "general";

export interface StorageContainer {
  id: string;
  name: string;
  providerId: string;
  nativeId?: string;
}

export interface StorageFileInfo {
  path: string;
  id?: string;
  size: number;
  mimeType?: string;
  url?: string;
}

export interface StorageFile extends StorageFileInfo {
  blob?: Blob;
}

export interface FileMetadata {
  contentType?: string;
  [key: string]: unknown;
}

export interface StorageProviderConfig {
  providerId: string;
  displayName?: string;
  isDefault?: boolean;
  credentials: Record<string, unknown>;
  options?: Record<string, unknown>;
}

/** Result of getStorageUsage() – used/total and optional file count per provider */
export interface StorageUsageInfo {
  usedBytes: number;
  totalBytes?: number;
  fileCount?: number;
}

/** Metadata for the registry: id, name, description, availability */
export interface StorageProviderMeta {
  id: string;
  name: string;
  description: string;
  /** If true, backend uses this (Scriptony Cloud). If false, client-only (e.g. Google Drive). */
  backendSupported: boolean;
  /** Shown in UI when provider is not yet implemented */
  comingSoon?: boolean;
}
