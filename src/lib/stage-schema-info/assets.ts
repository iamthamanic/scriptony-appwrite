/**
 * Referenzen auf persistente Medien (Storage, CDN).
 * Keine Blob-/data:-URLs als alleinige Quelle fuer Langzeit-Speicherung.
 */
export interface StageAssetRef {
  /** Appwrite Storage file ID oder aehnlich. */
  storageFileId?: string;
  /** Öffentliche oder signierte URL nach Upload */
  url?: string;
  mimeType?: string;
  /** Original-Dateiname beim Import */
  originalName?: string;
}
