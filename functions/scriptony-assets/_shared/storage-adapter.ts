import { uploadFileToStorage } from "../../_shared/storage";
import { getStorageBucketId } from "../../_shared/env";

export interface StorageFile {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
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
      return uploadFileToStorage({ file, bucketId, name: fileName });
    },
  };
}

export function getDefaultStorageAdapter(): StorageAdapter {
  return createAppwriteStorageAdapter();
}
