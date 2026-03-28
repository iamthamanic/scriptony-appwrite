/**
 * Stage 2D — Konva-Zeichen-Engine (Layer, Export, Shot/Welt-Zuweisung).
 * Öffentliche API nur über dieses Barrel; Host-App (Scriptony) liefert @/-Imports (UI, API).
 */
export { StageCanvas, type StageCanvasHandle, type StageCanvasProps } from "./StageCanvas";
export { StageLayerStylingDialog, type StageLayerStylingValues } from "./StageLayerStylingDialog";
export type {
  Stage2DExportAdapter,
  StageExportAssetRow,
  StageExportProjectRow,
  StageExportWorldRow,
  StageTimelineBundle,
} from "./export-adapter";
