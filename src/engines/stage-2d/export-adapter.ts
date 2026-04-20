import type {
  Stage2DPayload,
  StageDocumentStage2D,
  StageDocumentStage3D,
} from "@/lib/stage-schema-info";
import type { Act, Scene, Sequence, Shot } from "@/lib/types";

/** Ergebnis eines Shot-Imports (Storage + Vorschaubild). */
export interface StageShotImportBundle {
  stage2dPayload: Stage2DPayload | null;
  stage3dDocument: StageDocumentStage3D | null;
  rasterImageUrl: string | null;
  shotArtboardHint: { width: number; height: number } | null;
}

/** Zeilen für Projekt-/Welt-Dropdowns im Export-Dialog. */
export interface StageExportProjectRow {
  id: string;
  title: string;
  type?: string;
}

export interface StageExportWorldRow {
  id: string;
  name: string;
}

export interface StageExportAssetRow {
  id: string;
  name?: string;
  title?: string;
  world_category_id?: string;
  category_id?: string;
}

/** Akt / Sequenz / Szene / Shots — ein Bundle pro Projekt. */
export interface StageTimelineBundle {
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  shots: Shot[];
}

/**
 * Host-Adapter: lädt Export-Ziele, Timeline und führt Zuweisungen aus.
 * Scriptony-Implementierung: `createScriptonyStageExportAdapter` in `@/integrations/stage-export`.
 */
export interface Stage2DExportAdapter {
  loadExportTargets: () => Promise<{
    projects: StageExportProjectRow[];
    worlds: StageExportWorldRow[];
  }>;
  loadTimelineForProject: (
    projectId: string,
    projectType?: string,
  ) => Promise<StageTimelineBundle>;
  loadAssetsForWorld: (worldId: string) => Promise<StageExportAssetRow[]>;
  assignToShot: (args: {
    projectId: string;
    shotId: string;
    file: File;
    /** Serialisiertes Stage-Dokument (Root mit schemaVersion/kind); Host lädt JSON hoch. */
    stage2dDocument?: StageDocumentStage2D;
  }) => Promise<void>;
  assignToWorldAsset: (args: {
    worldId: string;
    categoryId: string;
    assetId: string;
    file: File;
  }) => Promise<void>;
  /** Shot per API + Stage-Dokumente aus Storage — für Import aus Scriptony-Timeline. */
  loadShotStageImportBundle: (shotId: string) => Promise<StageShotImportBundle>;
}
