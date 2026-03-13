/**
 * Storage Provider – public API for Einstellungen → Speicher and future adapters.
 */

export type {
  StorageBucketKind,
  StorageContainer,
  StorageFile,
  StorageFileInfo,
  FileMetadata,
  StorageProviderConfig,
  StorageProviderMeta,
  StorageUsageInfo,
} from "./types";

export {
  listStorageProviders,
  getStorageProviderMeta,
  getDefaultStorageProviderId,
  getSelectedStorageProviderId,
  setSelectedStorageProviderId,
} from "./registry";

export {
  getStorageOAuthAuthorizeUrl,
  getStoredStorageOAuthTokens,
  setStoredStorageOAuthTokens,
  clearStoredStorageOAuthTokens,
  parseStorageOAuthCallbackHash,
  clearStorageOAuthFromHash,
  OAUTH_PROVIDERS,
} from "./oauth";
export type { StorageOAuthTokens } from "./oauth";
