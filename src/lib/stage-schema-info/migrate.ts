/**
 * Schema-Migrationen zwischen Versionen; aktuell Identitaet (v1 only).
 * Spaeter: migrateStageDocumentV1ToV2 oder aehnliche Schritte hier einhaengen.
 */
import { STAGE_SCHEMA_VERSION_LATEST } from "./constants";
import type { StageDocument } from "./envelope";

export function migrateStageDocument(doc: StageDocument): StageDocument {
  if (doc.schemaVersion === STAGE_SCHEMA_VERSION_LATEST) {
    return doc;
  }
  // Platzhalter: ältere Versionen hier abbilden, dann LATEST setzen
  return doc;
}
