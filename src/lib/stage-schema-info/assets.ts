/**
 * Referenzen auf persistente Medien (Storage, CDN). Host mappt auf Appwrite o. Ä.
 * Keine Blob-/data:-URLs als alleinige Quelle für Langzeit-Speicherung.
 */
export interface StageAssetRef {
  /** Appwrite Storage file ID o. Ä. */
  storageFileId?: string;
  /** Öffentliche oder signierte URL nach Upload */
  url?: string;
  mimeType?: string;
  /** Original-Dateiname beim Import */
  originalName?: string;
}
