/**
 * Job Service — Audio Production Orchestration.
 * SOLID/DIP: Abstrahiert Job-Erstellung von der konkreten DB-Implementierung.
 * KISS: Direkte DB-Erstellung, kein externer Handler-Call.
 *
 * T08: Erzeugt Job-Eintraege in der `jobs`-Collection (Control-Plane).
 * Der eigentliche Worker (scriptony-media-worker / scriptony-audio) verarbeitet
 * den Job asynchron. Job-Payload enthaelt nur Referenzen (snapshot_id),
 * keine Inline-Script-Inhalte.
 */

import { ID } from "node-appwrite";
import {
  createDocument,
  getDocument,
  C,
} from "../../_shared/appwrite-db";

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface AudioProductionJobPayload {
  /** Job-Typ: generate | preview | export */
  type: string;
  /** Referenz auf den Snapshot — NICHT der Inhalt */
  snapshot_id: string;
  /** Projekt-Kontext für Access-Checks */
  project_id: string;
  /** Optionale Szene */
  scene_id?: string;
  /** Optionale Session */
  session_id?: string;
  /** Für Export: Ziel-Format */
  format?: string;
  /** Für Preview: Track-IDs */
  track_ids?: string[];
  /** Zusätzliche Meta-Daten (immer < 10 KB) */
  meta?: Record<string, unknown>;
}

export interface CreatedJob {
  id: string;
  status: JobStatus;
  created_at: string;
  /** Voller Job-Payload als JSON-String (verfügbar bei DB-Reads). */
  payload_json?: string;
}

/**
 * Erstellt einen Audio-Production-Job in der Control-Plane.
 *
 * DRY: Keine Inline-Script-Inhalte — nur snapshot_id Referenz.
 * SOLID: Job-Payload bleibt unter 100 KB durch Snapshot-Auslagerung.
 */
export async function createAudioProductionJob(
  type: string,
  payload: AudioProductionJobPayload,
  userId: string,
): Promise<CreatedJob> {
  const now = new Date().toISOString();

  // KISS: Payload direkt serialisieren. Snapshot ist bereits separat gespeichert,
  // daher bleibt payload_json klein (nur Referenzen).
  const minimalPayload = {
    type,
    snapshot_id: payload.snapshot_id,
    project_id: payload.project_id,
    scene_id: payload.scene_id,
    session_id: payload.session_id,
    format: payload.format,
    track_ids: payload.track_ids,
    meta: payload.meta,
  };

  const doc = await createDocument(C.jobs, ID.unique(), {
    function_name: `audio-production-${type}`,
    status: "pending",
    payload_json: JSON.stringify(minimalPayload),
    user_id: userId,
    progress: 0,
    result_json: null,
    error: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  });

  return {
    id: doc.$id,
    status: "pending",
    created_at: now,
  };
}

/**
 * Liest einen Job-Status aus der Control-Plane.
 */
export async function getAudioProductionJob(
  jobId: string,
): Promise<CreatedJob | null> {
  try {
    const doc = await getDocument(C.jobs, jobId);
    return {
      id: doc.$id as string,
      status: (doc.status as JobStatus) || "pending",
      created_at: (doc.created_at as string) || new Date().toISOString(),
      payload_json: typeof doc.payload_json === "string"
        ? doc.payload_json
        : undefined,
    };
  } catch {
    return null;
  }
}
