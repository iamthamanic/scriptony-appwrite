/**
 * Root-Dokument: ein Umschlag für alle Stage-Varianten (discriminated union).
 * kind-Strings müssen mit STAGE_KIND_2D / STAGE_KIND_3D in constants.ts übereinstimmen.
 */
import type { StageSchemaVersion } from "./constants";
import type { Stage2DPayload } from "./kinds/stage2d";
import type { Stage3DPayload } from "./kinds/stage3d";

export interface StageDocumentStage2D {
  schemaVersion: StageSchemaVersion;
  kind: "stage2d";
  payload: Stage2DPayload;
}

export interface StageDocumentStage3D {
  schemaVersion: StageSchemaVersion;
  kind: "stage3d";
  payload: Stage3DPayload;
}

export type StageDocument = StageDocumentStage2D | StageDocumentStage3D;
