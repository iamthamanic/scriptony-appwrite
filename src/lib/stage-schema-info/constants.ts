/**
 * Zentrale Versions- und Kind-Konstanten für Stage-Dokumente (2D/3D).
 * Ein Ort (DRY) — Host und Engines importieren nur hierher.
 */
export const STAGE_SCHEMA_VERSION_LATEST = 1 as const;

/** Unterstützte Root-Versionen (ältere Clients können migrieren). */
export const STAGE_SCHEMA_VERSIONS = [1] as const;

export type StageSchemaVersion = (typeof STAGE_SCHEMA_VERSIONS)[number];

export const STAGE_KIND_2D = "stage2d" as const;
export const STAGE_KIND_3D = "stage3d" as const;

export type StageKind = typeof STAGE_KIND_2D | typeof STAGE_KIND_3D;
