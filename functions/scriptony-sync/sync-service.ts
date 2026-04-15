/**
 * Domain logic for Puppet-Layer Sync (Ticket 7 — Blender Ingress).
 *
 * Sync is a write-only ingress surface for Blender/Bridge metadata.
 * It may ONLY update sync-related fields on `shots`:
 *   - blenderSourceVersion
 *   - blenderSyncRevision
 *   - lastBlenderSyncAt
 *   - guideBundleRevision  (when publishing guides)
 *   - latestGuideBundleId   (when publishing guides)
 *   - lastPreviewAt         (when publishing preview)
 *   - glbPreviewFileId      (when publishing GLB preview)
 *
 * It must NEVER touch product-decision fields:
 *   - acceptedRenderJobId
 *   - renderRevision
 *   - reviewStatus
 *   - styleProfileRevision
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
import { computeFreshness, type ShotFreshnessInput, type ShotFreshnessResult } from "../_shared/freshness";
import { toString, toInteger, userCanAccessShot } from "../_shared/puppet-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncShotStateInput = {
  shotId: string;
  blenderSourceVersion?: string;
  blenderSyncRevision?: number;
};

export type SyncGuidesInput = {
  shotId: string;
  guideBundleRevision?: number;
  files?: string;
  metadata?: string;
};

export type SyncPreviewInput = {
  shotId: string;
  lastPreviewAt?: string;
};

export type SyncGlbPreviewInput = {
  shotId: string;
  glbPreviewFileId?: string;
};

export type ShotRow = Record<string, any>;

export type SyncResult = {
  shotId: string;
  updated: boolean;
  fields: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Forbidden field guard
// ---------------------------------------------------------------------------

const FORBIDDEN_SYNC_FIELDS = new Set([
  "acceptedRenderJobId",
  "renderRevision",
  "reviewStatus",
  "styleProfileRevision",
  "latestRenderJobId",
]);

function assertNoForbiddenFields(patch: Record<string, unknown>): void {
  for (const key of Object.keys(patch)) {
    if (FORBIDDEN_SYNC_FIELDS.has(key)) {
      throw new Error(
        `sync must not write product-decision field "${key}". ` +
          "This field belongs to scriptony-stage or scriptony-style."
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Freshness: compute stale status for a shot
// ---------------------------------------------------------------------------

export async function getShotFreshness(
  shotId: string,
  userId: string,
  organizationIds: string[]
): Promise<ShotFreshnessResult> {
  const shot = await getDocument(C.shots, shotId);
  if (!shot) {
    throw new Error(`Shot not found: ${shotId}`);
  }

  const projectId = toString(shot.project_id ?? shot.projectId);
  if (!projectId || !(await getAccessibleProject(projectId, userId, organizationIds))) {
    throw new Error("Shot not found or access denied");
  }

  const input: ShotFreshnessInput = {
    blenderSyncRevision: shot.blenderSyncRevision,
    guideBundleRevision: shot.guideBundleRevision,
    styleProfileRevision: shot.styleProfileRevision,
    renderRevision: shot.renderRevision,
    lastBlenderSyncAt: shot.lastBlenderSyncAt,
    lastPreviewAt: shot.lastPreviewAt,
  };

  return computeFreshness(input);
}

// ---------------------------------------------------------------------------
// Sync: shot-state (Blender publishes version + revision)
// ---------------------------------------------------------------------------

export async function syncShotState(
  input: SyncShotStateInput,
  userId: string,
  organizationIds: string[]
): Promise<SyncResult> {
  const shot = await getDocument(C.shots, input.shotId);
  if (!shot) {
    throw new Error(`Shot not found: ${input.shotId}`);
  }

  const projectId = toString(shot.project_id ?? shot.projectId);
  if (!projectId || !(await getAccessibleProject(projectId, userId, organizationIds))) {
    throw new Error("Shot not found or access denied");
  }

  const patch: Record<string, unknown> = {};
  const now = new Date().toISOString();

  if (input.blenderSourceVersion !== undefined) {
    patch.blenderSourceVersion = String(input.blenderSourceVersion);
  }
  if (input.blenderSyncRevision !== undefined) {
    const current = toInteger(shot.blenderSyncRevision);
    patch.blenderSyncRevision = Math.max(current, toInteger(input.blenderSyncRevision));
  }
  // Always bump lastBlenderSyncAt when any shot-state sync happens
  patch.lastBlenderSyncAt = now;

  assertNoForbiddenFields(patch);

  if (Object.keys(patch).length === 0) {
    return { shotId: input.shotId, updated: false, fields: {} };
  }

  await updateDocument(C.shots, String(shot.id), patch);
  return { shotId: input.shotId, updated: true, fields: patch };
}

// ---------------------------------------------------------------------------
// Sync: guides (Bridge publishes guide bundle)
// ---------------------------------------------------------------------------

export async function syncGuides(
  input: SyncGuidesInput,
  userId: string,
  organizationIds: string[]
): Promise<SyncResult> {
  const shot = await getDocument(C.shots, input.shotId);
  if (!shot) {
    throw new Error(`Shot not found: ${input.shotId}`);
  }

  const projectId = toString(shot.project_id ?? shot.projectId);
  if (!projectId || !(await getAccessibleProject(projectId, userId, organizationIds))) {
    throw new Error("Shot not found or access denied");
  }

  const now = new Date().toISOString();

  // Create a guideBundle document
  const guideBundle = await createDocument(C.guideBundles, ID.unique(), {
    shotId: input.shotId,
    userId,
    revision: input.guideBundleRevision ?? toInteger(shot.guideBundleRevision) + 1,
    files: input.files ?? "{}",
    metadata: input.metadata ?? "{}",
    maskFileId: null,
    layerId: null,
    sourceFileId: null,
    repairType: null,
    createdAt: now,
    updatedAt: now,
  });

  const guideBundleId = String(guideBundle.id ?? guideBundle.$id ?? "");
  const nextRevision = input.guideBundleRevision ?? toInteger(shot.guideBundleRevision) + 1;

  const patch: Record<string, unknown> = {
    guideBundleRevision: nextRevision,
    latestGuideBundleId: guideBundleId,
    lastBlenderSyncAt: now,
  };

  assertNoForbiddenFields(patch);

  await updateDocument(C.shots, String(shot.id), patch);
  return {
    shotId: input.shotId,
    updated: true,
    fields: { ...patch, guideBundleId },
  };
}

// ---------------------------------------------------------------------------
// Sync: preview (Bridge publishes 2D preview timestamp)
// ---------------------------------------------------------------------------

export async function syncPreview(
  input: SyncPreviewInput,
  userId: string,
  organizationIds: string[]
): Promise<SyncResult> {
  const shot = await getDocument(C.shots, input.shotId);
  if (!shot) {
    throw new Error(`Shot not found: ${input.shotId}`);
  }

  const projectId = toString(shot.project_id ?? shot.projectId);
  if (!projectId || !(await getAccessibleProject(projectId, userId, organizationIds))) {
    throw new Error("Shot not found or access denied");
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    lastPreviewAt: input.lastPreviewAt ?? now,
  };

  assertNoForbiddenFields(patch);

  await updateDocument(C.shots, String(shot.id), patch);
  return { shotId: input.shotId, updated: true, fields: patch };
}

// ---------------------------------------------------------------------------
// Sync: GLB preview (Bridge publishes 3D preview file)
// ---------------------------------------------------------------------------

export async function syncGlbPreview(
  input: SyncGlbPreviewInput,
  userId: string,
  organizationIds: string[]
): Promise<SyncResult> {
  const shot = await getDocument(C.shots, input.shotId);
  if (!shot) {
    throw new Error(`Shot not found: ${input.shotId}`);
  }

  const projectId = toString(shot.project_id ?? shot.projectId);
  if (!projectId || !(await getAccessibleProject(projectId, userId, organizationIds))) {
    throw new Error("Shot not found or access denied");
  }

  const patch: Record<string, unknown> = {};

  if (input.glbPreviewFileId !== undefined) {
    patch.glbPreviewFileId = String(input.glbPreviewFileId);
  }

  assertNoForbiddenFields(patch);

  if (Object.keys(patch).length === 0) {
    return { shotId: input.shotId, updated: false, fields: {} };
  }

  await updateDocument(C.shots, String(shot.id), patch);
  return { shotId: input.shotId, updated: true, fields: patch };
}
