/**
 * stage-schema-info — gemeinsames Schema für Stage-Dokumente (2D/3D): Typen, Validierung, Konstanten.
 * Host/Engines serialisieren hierher; kein Appwrite/React in diesem Modul.
 */
export {
  STAGE_KIND_2D,
  STAGE_KIND_3D,
  STAGE_SCHEMA_VERSION_LATEST,
  STAGE_SCHEMA_VERSIONS,
  type StageKind,
  type StageSchemaVersion,
} from "./constants";

export type { StageAssetRef } from "./assets";

export type {
  StageDocument,
  StageDocumentStage2D,
  StageDocumentStage3D,
} from "./envelope";

export type {
  Stage2DBaseLayer,
  Stage2DCameraState,
  Stage2DDrawLayer,
  Stage2DImageLayer,
  Stage2DLayer,
  Stage2DPayload,
  Stage2DPayloadMeta,
  Stage2DPoint,
  Stage2DStroke,
} from "./kinds/stage2d";

export type { Stage3DNodeStub, Stage3DPayload } from "./kinds/stage3d";

export {
  createStage2DDocument,
  createStage2DPayloadFromState,
  parseStageDocumentJson,
  validateStageDocument,
  type StageDocumentParseResult,
} from "./validate";

export { migrateStageDocument } from "./migrate";

export { isStage2DDocument, isStage3DDocument } from "./guards";
