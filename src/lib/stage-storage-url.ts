/**
 * Öffentliche Appwrite-Storage-URLs für Stage-Dokumente (Browser, keine Secrets).
 */
import { getAppwritePublicConfig } from "@/lib/env";

const DEFAULT_BUCKET = "stage-documents";

export function getStageDocumentsBucketId(): string {
  const v = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_STAGE_DOCUMENTS;
  return typeof v === "string" && v.trim() ? v.trim() : DEFAULT_BUCKET;
}

export function buildStorageFileViewUrl(bucketId: string, fileId: string): string | null {
  const cfg = getAppwritePublicConfig();
  if (!cfg?.endpoint || !fileId) return null;
  return `${cfg.endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${cfg.projectId}`;
}
