import { uploadFileToStorage } from "../../_shared/storage";
import { getStorageBucketId } from "../../_shared/env";

/**
 * StorageAdapter – schmale architektonische Nahtstelle für physische
 * Storage-Provider. Aktuell ein Wrapper um Appwrite Storage.
 *
 * Zukünftige Erweiterungspunkte (S3, GCS, R2 etc.) implementieren
 * StorageAdapter und werden über getDefaultStorageAdapter() injiziert.
 * Das Interface isoliert Asset-Logik von Provider-Details (SOLID/ISP).
 */

export interface StorageFile {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  bucketId: string;
}

export interface StorageAdapter {
  upload(file: File, bucketKind: string, name?: string): Promise<StorageFile>;
}

function resolveBucketId(kind: string): string {
  try {
    return getStorageBucketId(kind as Parameters<typeof getStorageBucketId>[0]);
  } catch {
    return getStorageBucketId("general");
  }
}

export function createAppwriteStorageAdapter(): StorageAdapter {
  return {
    async upload(file, bucketKind, name) {
      const bucketId = resolveBucketId(bucketKind);
      const fileName = name || file.name || `${Date.now()}-upload.bin`;
      const uploaded = await uploadFileToStorage({
        file,
        bucketId,
        name: fileName,
      });
      return { ...uploaded, bucketId };
    },
  };
}
