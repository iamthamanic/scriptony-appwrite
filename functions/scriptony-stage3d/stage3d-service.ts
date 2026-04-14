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

import { ID, Query } from "node-appwrite";
import {
  C,
  createDocument,
  getDocument,
  listDocumentsFull,
  updateDocument,
} from "../_shared/appwrite-db";
import { getAccessibleProject } from "../_shared/scriptony";

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
// Helpers
// ---------------------------------------------------------------------------

function toString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

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
// Access
// ---------------------------------------------------------------------------

export async function userCanAccessShot(
  shotId: string,
  userId: string,
  organizationIds: string[]
): Promise<boolean> {
  const shot = await getDocument(C.shots, shotId);
  if (!shot) return false;
  const projectId = toString(shot.project_id ?? shot.projectId);
  if (!projectId) return false;
  return Boolean(await getAccessibleProject(projectId, userId, organizationIds));
}

// ---------------------------------------------------------------------------
// Document CRUD
// ---------------------------------------------------------------------------

export async function getStage3dDocument(shotId: string): Promise<Stage3dDocumentRow | null> {
  const rows = await listDocumentsFull(C.stageDocuments, [
    Query.equal("shotId", shotId),
    Query.equal("kind", "stage3d"),
    Query.limit(1),
  ]);
  return rows[0] ?? null;
}

export async function getOrCreateStage3dDocument(
  userId: string,
  shotId: string
): Promise<Stage3dDocumentApi> {
  const existing = await getStage3dDocument(shotId);
  if (existing) return stage3dDocumentRowToApi(existing);

  const now = new Date().toISOString();
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
}

export async function updateStage3dViewState(
  shotId: string,
  patch: {
    viewState?: string | null;
  }
): Promise<Stage3dDocumentApi> {
  const doc = await getStage3dDocument(shotId);
  if (!doc) {
    throw new Error("Stage3D document not found for shot");
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.viewState !== undefined) update.viewState = patch.viewState;

  const updated = await updateDocument(C.stageDocuments, String(doc.id), update);
  return stage3dDocumentRowToApi(updated);
}
