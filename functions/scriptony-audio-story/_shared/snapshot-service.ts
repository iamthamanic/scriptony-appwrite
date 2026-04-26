/**
 * Snapshot Service — T08 Audio Production.
 *
 * SOLID: Trennt Snapshot-Persistenz von Job-Orchestration.
 * DRY: Script-Block-Daten werden einmal als Snapshot gespeichert,
 * mehrere Jobs referenzieren denselben Snapshot.
 * KISS: Einfache JSON-Serialisierung, keine komplexe Transformation.
 *
 * Snapshot-Daten enthalten:
 * - Referenz-IDs (script_id, scene_id, block_ids)
 * - Keine vollstaendigen Script-Inhalte (Source of Truth bleibt scriptony-script)
 * - Nur serialisierte Metadaten fuer nachvollziehbare Wiedergabe
 */

import { ID } from "node-appwrite";
import { createDocument, dbId, C } from "../../_shared/appwrite-db";

export interface ScriptBlockSnapshot {
  id: string;
  type: string;
  content?: string;
  speaker_character_id?: string;
  order_index: number;
}

export interface AudioProductionSnapshot {
  project_id: string;
  scene_id?: string;
  script_id?: string;
  /** Liste der Block-Referenzen, nicht vollstaendiger Inhalt */
  block_references: Array<{ id: string; type: string; order_index: number }>;
  /** Serialisierte Snapshot-Version für Wiedergabe (< 50 KB) */
  snapshot_json: string;
  created_by: string;
}

export interface CreatedSnapshot {
  id: string;
  created_at: string;
}

/**
 * Erstellt einen Snapshot aus Script-Block-Referenzen.
 *
 * T08: Snapshot-Daten liegen separat in `job_snapshots`.
 * Das `jobs`-Dokument bleibt unter 100 KB (nur snapshot_id Referenz).
 */
export async function createSnapshot(
  snapshot: AudioProductionSnapshot,
): Promise<CreatedSnapshot> {
  const now = new Date().toISOString();

  const doc = await createDocument(dbId(), C.job_snapshots, ID.unique(), {
    project_id: snapshot.project_id,
    scene_id: snapshot.scene_id || null,
    script_id: snapshot.script_id || null,
    script_block_ids: JSON.stringify(
      snapshot.block_references.map((b) => b.id),
    ),
    snapshot_json: snapshot.snapshot_json,
    created_by: snapshot.created_by,
    created_at: now,
    updated_at: now,
  });

  return {
    id: doc.$id,
    created_at: now,
  };
}

/**
 * Baut eine serialisierte Snapshot-Repraesentation aus Script-Blocks.
 * KISS: Nur Metadaten + Content-Hash, nicht vollstaendige Revision-History.
 */
export function buildSnapshotJson(
  scriptId: string,
  blocks: ScriptBlockSnapshot[],
): string {
  const payload = {
    script_id: scriptId,
    block_count: blocks.length,
    blocks: blocks.map((b) => ({
      id: b.id,
      type: b.type,
      speaker_id: b.speaker_character_id || null,
      order_index: b.order_index,
      // KISS: Content wird auf 500 Zeichen getruncated für Snapshot
      content_preview:
        b.content && b.content.length > 500
          ? b.content.slice(0, 500) + "..."
          : b.content || "",
    })),
    generated_at: new Date().toISOString(),
  };

  // Sicherstellen dass Snapshot < 50 KB bleibt
  const json = JSON.stringify(payload);
  if (json.length > 50000) {
    // Wenn zu gross: nur Metadaten ohne Content-Preview
    const minimalPayload = {
      script_id: scriptId,
      block_count: blocks.length,
      block_ids: blocks.map((b) => b.id),
      generated_at: new Date().toISOString(),
      note: "Content truncated: exceeded 50KB snapshot limit",
    };
    return JSON.stringify(minimalPayload);
  }

  return json;
}
