/**
 * Type Guards für StageDocument (narrowing ohne erneute Validierung).
 * Nur nach erfolgreichem validateStageDocument verwenden.
 */
import { STAGE_KIND_2D, STAGE_KIND_3D } from "./constants";
import type {
  StageDocument,
  StageDocumentStage2D,
  StageDocumentStage3D,
} from "./envelope";

export function isStage2DDocument(
  doc: StageDocument,
): doc is StageDocumentStage2D {
  return doc.kind === STAGE_KIND_2D;
}

export function isStage3DDocument(
  doc: StageDocument,
): doc is StageDocumentStage3D {
  return doc.kind === STAGE_KIND_3D;
}
