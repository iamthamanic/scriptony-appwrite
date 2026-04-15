/**
 * Domain logic for Puppet-Layer Stage2D (Ticket 5).
 *
 * Stage documents hold the 2D composition state per shot:
 * layers, view state, selection, frame — everything that
 * belongs to the creative canvas, not to the render pipeline.
 */

import { ID, Query } from "node-appwrite";
import {
  C,
  createDocument,
  deleteDocument,
  getDocument,
  listDocumentsFull,
  updateDocument,
} from "../_shared/appwrite-db";
import { getAccessibleProject } from "../_shared/scriptony";
import { uploadFileToStorage } from "../_shared/storage";
import { getStorageBucketId } from "../_shared/env";
import {
  toString,
  toStringOrNull,
  toIntegerOrNull,
  toBoolean,
  userCanAccessShot,
} from "../_shared/puppet-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StageDocumentKind = "stage2d" | "stage3d";

export type StageDocumentRow = Record<string, any>;

export type StageDocumentApi = {
  id: string;
  shotId: string;
  userId: string;
  kind: string;
  payload: string | null;
  viewState: string | null;
  selectedTakeId: string | null;
  currentFrame: number | null;
  glbPreviewFileId: string | null;
  lastSyncedAt: string | null;
  updatedAt: string;
};

export type LayerApi = {
  id: string;
  layerType: string;
  name: string;
  visible: boolean;
  opacity: number;
  orderIndex: number;
  fileId: string | null;
  metadata: string | null;
};

// ---------------------------------------------------------------------------
// Row → API
// ---------------------------------------------------------------------------

export function stageDocumentRowToApi(row: StageDocumentRow): StageDocumentApi {
  return {
    id: String(row.id ?? row.$id ?? ""),
    shotId: toString(row.shotId),
    userId: toString(row.userId),
    kind: toString(row.kind) || "stage2d",
    payload: toStringOrNull(row.payload),
    viewState: toStringOrNull(row.viewState),
    selectedTakeId: toStringOrNull(row.selectedTakeId),
    currentFrame: toIntegerOrNull(row.currentFrame),
    glbPreviewFileId: toStringOrNull(row.glbPreviewFileId),
    lastSyncedAt: toStringOrNull(row.lastSyncedAt),
    updatedAt: toString(row.updatedAt ?? row.updated_at ?? row.created_at ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Document CRUD
// ---------------------------------------------------------------------------

export async function getStageDocument(shotId: string): Promise<StageDocumentRow | null> {
  const rows = await listDocumentsFull(C.stageDocuments, [
    Query.equal("shotId", shotId),
    Query.equal("kind", "stage2d"),
    Query.limit(1),
  ]);
  return rows[0] ?? null;
}

export async function getOrCreateStageDocument(
  userId: string,
  shotId: string
): Promise<StageDocumentApi> {
  const existing = await getStageDocument(shotId);
  if (existing) return stageDocumentRowToApi(existing);

  const now = new Date().toISOString();
  const row = await createDocument(C.stageDocuments, ID.unique(), {
    shotId,
    userId,
    kind: "stage2d",
    payload: null,
    viewState: null,
    selectedTakeId: null,
    currentFrame: null,
    glbPreviewFileId: null,
    lastSyncedAt: null,
    updatedAt: now,
  });
  return stageDocumentRowToApi(row);
}

export async function updateStageDocument(
  shotId: string,
  patch: {
    payload?: string | null;
    viewState?: string | null;
    selectedTakeId?: string | null;
    currentFrame?: number | null;
  }
): Promise<StageDocumentApi> {
  let doc = await getStageDocument(shotId);
  if (!doc) {
    throw new Error("Stage document not found for shot");
  }
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.payload !== undefined) update.payload = patch.payload;
  if (patch.viewState !== undefined) update.viewState = patch.viewState;
  if (patch.selectedTakeId !== undefined) update.selectedTakeId = patch.selectedTakeId;
  if (patch.currentFrame !== undefined) update.currentFrame = patch.currentFrame;
  const updated = await updateDocument(C.stageDocuments, String(doc.id), update);
  return stageDocumentRowToApi(updated);
}

// ---------------------------------------------------------------------------
// Layer CRUD (stored as JSON array inside payload)
// ---------------------------------------------------------------------------

function parseLayersFromPayload(row: StageDocumentRow): LayerApi[] {
  const raw = row.payload;
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((l: any) => ({
      id: String(l.id ?? ""),
      layerType: String(l.layerType ?? "image"),
      name: String(l.name ?? ""),
      visible: toBoolean(l.visible, true),
      opacity: typeof l.opacity === "number" ? l.opacity : 1,
      orderIndex: typeof l.orderIndex === "number" ? l.orderIndex : 0,
      fileId: l.fileId ? String(l.fileId) : null,
      metadata: l.metadata ? (typeof l.metadata === "string" ? l.metadata : JSON.stringify(l.metadata)) : null,
    }));
  } catch {
    return [];
  }
}

function serializeLayers(layers: LayerApi[]): string {
  return JSON.stringify(layers);
}

export async function listLayers(shotId: string): Promise<LayerApi[]> {
  const doc = await getStageDocument(shotId);
  if (!doc) return [];
  return parseLayersFromPayload(doc);
}

export async function addLayer(
  userId: string,
  shotId: string,
  input: {
    layerType?: string;
    name?: string;
    visible?: boolean;
    opacity?: number;
    orderIndex?: number;
    fileId?: string | null;
    metadata?: string | null;
  }
): Promise<LayerApi> {
  const doc = await getOrCreateStageDocument(userId, shotId);
  const row = await getDocument(C.stageDocuments, doc.id);
  const layers = parseLayersFromPayload(row!);

  const newLayer: LayerApi = {
    id: ID.unique(),
    layerType: input.layerType || "image",
    name: input.name || "Untitled layer",
    visible: input.visible !== undefined ? input.visible : true,
    opacity: input.opacity !== undefined ? input.opacity : 1,
    orderIndex: input.orderIndex !== undefined ? input.orderIndex : layers.length,
    fileId: input.fileId ?? null,
    metadata: input.metadata ?? null,
  };

  layers.push(newLayer);
  await updateDocument(C.stageDocuments, doc.id, {
    payload: serializeLayers(layers),
    updatedAt: new Date().toISOString(),
  });
  return newLayer;
}

export async function updateLayer(
  shotId: string,
  layerId: string,
  patch: Partial<Omit<LayerApi, "id">>
): Promise<LayerApi | null> {
  const doc = await getStageDocument(shotId);
  if (!doc) return null;
  const row = await getDocument(C.stageDocuments, doc.id);
  const layers = parseLayersFromPayload(row!);
  const idx = layers.findIndex((l) => l.id === layerId);
  if (idx === -1) return null;

  layers[idx] = { ...layers[idx], ...patch };
  await updateDocument(C.stageDocuments, String(doc.id), {
    payload: serializeLayers(layers),
    updatedAt: new Date().toISOString(),
  });
  return layers[idx];
}

export async function deleteLayer(shotId: string, layerId: string): Promise<boolean> {
  const doc = await getStageDocument(shotId);
  if (!doc) return false;
  const row = await getDocument(C.stageDocuments, doc.id);
  const layers = parseLayersFromPayload(row!);
  const before = layers.length;
  const filtered = layers.filter((l) => l.id !== layerId);
  if (filtered.length === before) return false;

  await updateDocument(C.stageDocuments, String(doc.id), {
    payload: serializeLayers(filtered),
    updatedAt: new Date().toISOString(),
  });
  return true;
}

// ---------------------------------------------------------------------------
// prepare-repair: creates mask + guide bundle for the repair flow
// ---------------------------------------------------------------------------

export async function prepareRepair(
  userId: string,
  shotId: string,
  input: {
    layerId: string;
    repairType?: string;
  }
): Promise<{ maskFileId: string; guideBundleId: string }> {
  // Ensure stage document exists
  const doc = await getOrCreateStageDocument(userId, shotId);
  const row = await getDocument(C.stageDocuments, doc.id);
  const layers = parseLayersFromPayload(row!);
  const layer = layers.find((l) => l.id === input.layerId);
  if (!layer) {
    throw new Error(`Layer ${input.layerId} not found in shot ${shotId}`);
  }

  // Create a placeholder mask file in storage
  const maskContent = JSON.stringify({
    type: "mask",
    shotId,
    layerId: input.layerId,
    repairType: input.repairType || "inpaint",
    createdAt: new Date().toISOString(),
  });
  const maskFileId = await uploadJsonToStorage(
    `mask-${shotId}-${input.layerId}.json`,
    maskContent,
    userId
  );

  // Create a guide bundle entry
  const now = new Date().toISOString();
  const guideBundle = await createDocument(C.guideBundles, ID.unique(), {
    shotId,
    userId,
    maskFileId,
    layerId: input.layerId,
    repairType: input.repairType || "inpaint",
    sourceFileId: layer.fileId || null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    maskFileId,
    guideBundleId: String(guideBundle.id ?? guideBundle.$id ?? ""),
  };
}

async function uploadJsonToStorage(
  filename: string,
  content: string,
  userId: string
): Promise<string> {
  const bucketId = getStorageBucketId();
  const file = new File([content], filename, { type: "application/json" });
  const { Storage } = await import("node-appwrite");
  const { getDatabases } = await import("../_shared/appwrite-db");
  // Use storage upload via shared helper
  const uploaded = await uploadFileToStorage(file, filename, "application/json");
  return uploaded?.id || uploaded?.$id || "";
}
