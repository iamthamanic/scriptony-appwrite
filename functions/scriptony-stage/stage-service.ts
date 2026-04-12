/**
 * Domain logic for Puppet-Layer render jobs (Ticket 3 — Orchestrator).
 *
 * Lifecycle:
 *   queued → (executing) → completed → accepted | rejected
 *
 * Rules:
 *   - `accept` sets shots.acceptedRenderJobId + shots.renderRevision++
 *   - `reject` does NOT touch shots.acceptedRenderJobId (only shots.latestRenderJobId)
 *   - Only one accept per shot is canonical; re-accepting a different job updates.
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

export type RenderJobStatus = "queued" | "executing" | "completed" | "failed";
export type ReviewStatus = "pending" | "accepted" | "rejected";

export type RenderJobRow = Record<string, any>;

export type RenderJobApi = {
  id: string;
  userId: string;
  projectId: string;
  shotId: string;
  type: string;
  jobClass: string;
  status: RenderJobStatus;
  reviewStatus: ReviewStatus;
  acceptedAt: string | null;
  acceptedBy: string | null;
  guideBundleId: string;
  styleProfileId: string;
  repairConfig: string | null;
  outputImageIds: string[];
  createdAt: string;
  completedAt: string | null;
};

// ---------------------------------------------------------------------------
// Row → API mapping
// ---------------------------------------------------------------------------

function toString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

function toInteger(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return 0;
}

export function renderJobRowToApi(row: RenderJobRow): RenderJobApi {
  return {
    id: String(row.id ?? row.$id ?? ""),
    userId: toString(row.userId),
    projectId: toString(row.projectId),
    shotId: toString(row.shotId),
    type: toString(row.type),
    jobClass: toString(row.jobClass),
    status: (toString(row.status) || "queued") as RenderJobStatus,
    reviewStatus: (toString(row.reviewStatus) || "pending") as ReviewStatus,
    acceptedAt: toStringOrNull(row.acceptedAt),
    acceptedBy: toStringOrNull(row.acceptedBy),
    guideBundleId: toString(row.guideBundleId),
    styleProfileId: toString(row.styleProfileId),
    repairConfig: toStringOrNull(row.repairConfig),
    outputImageIds: toStringArray(row.outputImageIds),
    createdAt: toString(row.createdAt ?? row.created_at ?? ""),
    completedAt: toStringOrNull(row.completedAt ?? row.completed_at),
  };
}

// ---------------------------------------------------------------------------
// Access helpers
// ---------------------------------------------------------------------------

export async function userCanAccessProject(
  projectId: string,
  userId: string,
  organizationIds: string[]
): Promise<boolean> {
  return Boolean(await getAccessibleProject(projectId, userId, organizationIds));
}

export async function getShotById(shotId: string): Promise<RenderJobRow | null> {
  return getDocument(C.shots, shotId);
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createRenderJob(input: {
  userId: string;
  projectId: string;
  shotId: string;
  type: string;
  jobClass: string;
  guideBundleId: string;
  styleProfileId: string;
  repairConfig?: string | null;
}): Promise<RenderJobApi> {
  const now = new Date().toISOString();
  const row = await createDocument(C.renderJobs, ID.unique(), {
    userId: input.userId,
    projectId: input.projectId,
    shotId: input.shotId,
    type: input.type,
    jobClass: input.jobClass,
    status: "queued",
    reviewStatus: "pending",
    acceptedAt: null,
    acceptedBy: null,
    guideBundleId: input.guideBundleId,
    styleProfileId: input.styleProfileId,
    repairConfig: input.repairConfig ?? null,
    outputImageIds: [],
    createdAt: now,
    completedAt: null,
  });
  return renderJobRowToApi(row);
}

export async function getRenderJobById(jobId: string): Promise<RenderJobRow | null> {
  return getDocument(C.renderJobs, jobId);
}

export async function listRenderJobsForShot(shotId: string): Promise<RenderJobApi[]> {
  const rows = await listDocumentsFull(C.renderJobs, [
    Query.equal("shotId", shotId),
    Query.orderDesc("createdAt"),
  ]);
  return rows.map(renderJobRowToApi);
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

export async function completeRenderJob(
  row: RenderJobRow,
  outputImageIds?: string[]
): Promise<RenderJobApi> {
  const current = toString(row.status);
  if (current !== "queued" && current !== "executing") {
    throw new Error(`Cannot complete job in status "${current}"`);
  }
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: "completed",
    completedAt: now,
  };
  if (outputImageIds && outputImageIds.length > 0) {
    update.outputImageIds = outputImageIds;
  }
  const updated = await updateDocument(C.renderJobs, String(row.id), update);
  return renderJobRowToApi(updated);
}

export async function acceptRenderJob(
  row: RenderJobRow,
  userId: string
): Promise<RenderJobApi> {
  const current = toString(row.reviewStatus);
  if (current === "accepted") {
    // Already accepted — idempotent return
    return renderJobRowToApi(row);
  }
  if (toString(row.status) !== "completed") {
    throw new Error("Only completed jobs can be accepted");
  }

  const now = new Date().toISOString();
  const jobId = String(row.id);
  const shotId = toString(row.shotId);

  // Update render job
  const updated = await updateDocument(C.renderJobs, jobId, {
    reviewStatus: "accepted",
    acceptedAt: now,
    acceptedBy: userId,
  });

  // Update shot: set accepted + bump revision
  const shotRow = await getShotById(shotId);
  if (shotRow) {
    const currentRevision = toInteger(shotRow.renderRevision);
    await updateDocument(C.shots, String(shotRow.id), {
      latestRenderJobId: jobId,
      acceptedRenderJobId: jobId,
      renderRevision: currentRevision + 1,
    });
  }

  return renderJobRowToApi(updated);
}

export async function rejectRenderJob(
  row: RenderJobRow,
  userId: string
): Promise<RenderJobApi> {
  const current = toString(row.reviewStatus);
  if (current === "rejected") {
    // Already rejected — idempotent return
    return renderJobRowToApi(row);
  }
  if (toString(row.status) !== "completed") {
    throw new Error("Only completed jobs can be rejected");
  }

  const now = new Date().toISOString();
  const jobId = String(row.id);
  const shotId = toString(row.shotId);

  // Update render job
  const updated = await updateDocument(C.renderJobs, jobId, {
    reviewStatus: "rejected",
  });

  // Update shot: only set latestRenderJobId — acceptedRenderJobId stays unchanged!
  const shotRow = await getShotById(shotId);
  if (shotRow) {
    await updateDocument(C.shots, String(shotRow.id), {
      latestRenderJobId: jobId,
    });
  }

  return renderJobRowToApi(updated);
}
