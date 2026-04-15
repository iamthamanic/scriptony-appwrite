/**
 * Domain logic for Puppet-Layer Stage3D (Ticket 8).
 *
 * Stage3D documents hold the 3D view state per shot:
 * camera position, GLB preview reference — everything that
 * belongs to the 3D viewport, not to the render pipeline.
 *
 * Rules:
 *   - Only view-state, never authoring
 *   - No layers, no render logic
 */

import { z } from "zod";
import { ID } from "node-appwrite";
import {
  C,
  createDocument,
  getDocument,
  listDocumentsFull,
  updateDocument,
} from "../_shared/appwrite-db";
import {
  toString,
  toStringOrNull,
  userCanAccessShot,
} from "../_shared/puppet-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Stage3dDocumentRow = Record<string, any>;

export type Stage3dDocumentApi = {
  id: string;
  shotId: string;
  userId: string;
  kind: string;
  viewState: string | null;
  glbPreviewFileId: string | null;
  lastSyncedAt: string | null;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

/** View state must be valid JSON and under 64 KB. */
export const viewStateSchema = z.string()
  .refine(
    (val) => {
      if (val === null || val === undefined) return true;
      try { JSON.parse(val as string); return true; } catch { return false; }
    },
    { message: "viewState must be valid JSON" }
  )
  .refine(
    (val) => val === null || val === undefined || val.length <= 65536,
    { message: "viewState must be at most 64 KB" }
  )
  .nullable()
  .optional();

export const updateViewStateBodySchema = z.object({
  viewState: viewStateSchema,
});

// ---------------------------------------------------------------------------
// Row → API
// ---------------------------------------------------------------------------

export function stage3dDocumentRowToApi(row: Stage3dDocumentRow): Stage3dDocumentApi {
  return {
    id: String(row.id ?? row.$id ?? ""),
    shotId: toString(row.shotId),
    userId: toString(row.userId),
    kind: "stage3d",
    viewState: toStringOrNull(row.viewState),
    glbPreviewFileId: toStringOrNull(row.glbPreviewFileId),
    lastSyncedAt: toStringOrNull(row.lastSyncedAt),
    updatedAt: toString(row.updatedAt ?? row.updated_at ?? row.created_at ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Document CRUD
// ---------------------------------------------------------------------------

export async function getStage3dDocument(shotId: string): Promise<Stage3dDocumentRow | null> {
  const { Query } = await import("node-appwrite");
  const rows = await listDocumentsFull(C.stageDocuments, [
    Query.equal("shotId", shotId),
    Query.equal("kind", "stage3d"),
    Query.limit(1),
  ]);
  return rows[0] ?? null;
}

/**
 * Get or create a stage3d document for a shot.
 * Idempotent: if a concurrent request already created the document,
 * the unique constraint on (shotId, kind) will cause a conflict —
 * we catch that and re-read instead of crashing.
 */
export async function getOrCreateStage3dDocument(
  userId: string,
  shotId: string
): Promise<Stage3dDocumentApi> {
  const existing = await getStage3dDocument(shotId);
  if (existing) return stage3dDocumentRowToApi(existing);

  const now = new Date().toISOString();
  try {
    const row = await createDocument(C.stageDocuments, ID.unique(), {
      shotId,
      userId,
      kind: "stage3d",
      viewState: null,
      glbPreviewFileId: null,
      lastSyncedAt: null,
      updatedAt: now,
    });
    return stage3dDocumentRowToApi(row);
  } catch (error: unknown) {
    // Race condition: another request created the document concurrently.
    // Re-read instead of crashing.
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("unique") || msg.includes("already exists") || msg.includes("conflict")) {
      const retry = await getStage3dDocument(shotId);
      if (retry) return stage3dDocumentRowToApi(retry);
    }
    throw error;
  }
}

export async function updateStage3dViewState(
  shotId: string,
  patch: {
    viewState?: string | null;
  }
): Promise<Stage3dDocumentApi> {
  const doc = await getStage3dDocument(shotId);
  if (!doc) {
    throw new Error("Stage3D document not found for shot — call GET /stage3d/documents/:shotId first");
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.viewState !== undefined) update.viewState = patch.viewState;

  const updated = await updateDocument(C.stageDocuments, String(doc.id ?? doc.$id), update);
  return stage3dDocumentRowToApi(updated);
}

// ---------------------------------------------------------------------------
// Re-export for convenience (index.ts already imports userCanAccessShot from here)
// ---------------------------------------------------------------------------

export { userCanAccessShot };