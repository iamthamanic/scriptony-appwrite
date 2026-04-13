/**
 * Domain logic for Puppet-Layer image tasks (Ticket 4 — Execution).
 *
 * Exploratory tasks (imageTasks):
 *   - drawtoai, segment — no reviewStatus, no renderJobs
 *   - lightweight, user-driven, discardable
 *
 * Official render (execute-render):
 *   - triggered from a renderJob in scriptony-stage
 *   - calls back to scriptony-stage /stage/render-jobs/:id/complete on finish
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

export type ImageTaskStatus = "queued" | "processing" | "completed" | "failed";

export type ImageTaskRow = Record<string, any>;

export type ImageTaskApi = {
  id: string;
  userId: string;
  projectId: string | null;
  type: string;
  jobClass: string;
  status: ImageTaskStatus;
  inputImageIds: string[];
  prompt: string | null;
  strength: number | null;
  outputImageIds: string[];
  createdAt: string;
  completedAt: string | null;
};

// ---------------------------------------------------------------------------
// Row → API
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

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function imageTaskRowToApi(row: ImageTaskRow): ImageTaskApi {
  return {
    id: String(row.id ?? row.$id ?? ""),
    userId: toString(row.userId),
    projectId: toStringOrNull(row.projectId),
    type: toString(row.type),
    jobClass: toString(row.jobClass),
    status: (toString(row.status) || "queued") as ImageTaskStatus,
    inputImageIds: toStringArray(row.inputImageIds),
    prompt: toStringOrNull(row.prompt),
    strength: toNumberOrNull(row.strength),
    outputImageIds: toStringArray(row.outputImageIds),
    createdAt: toString(row.createdAt ?? row.created_at ?? ""),
    completedAt: toStringOrNull(row.completedAt ?? row.completed_at),
  };
}

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

export async function userCanAccessProject(
  projectId: string,
  userId: string,
  organizationIds: string[]
): Promise<boolean> {
  return Boolean(await getAccessibleProject(projectId, userId, organizationIds));
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createImageTask(input: {
  userId: string;
  projectId?: string | null;
  type: string;
  jobClass: string;
  inputImageIds: string[];
  prompt?: string | null;
  strength?: number | null;
}): Promise<ImageTaskApi> {
  const now = new Date().toISOString();
  const row = await createDocument(C.imageTasks, ID.unique(), {
    userId: input.userId,
    projectId: input.projectId ?? null,
    type: input.type,
    jobClass: input.jobClass,
    status: "queued",
    inputImageIds: input.inputImageIds,
    prompt: input.prompt ?? null,
    strength: input.strength ?? null,
    outputImageIds: [],
    createdAt: now,
    completedAt: null,
  });
  return imageTaskRowToApi(row);
}

export async function getImageTaskById(taskId: string): Promise<ImageTaskRow | null> {
  return getDocument(C.imageTasks, taskId);
}

export async function listImageTasksForUser(
  userId: string,
  projectId?: string | null
): Promise<ImageTaskApi[]> {
  const queries = [Query.equal("userId", userId), Query.orderDesc("createdAt")];
  if (projectId) {
    queries.push(Query.equal("projectId", projectId));
  }
  const rows = await listDocumentsFull(C.imageTasks, queries);
  return rows.map(imageTaskRowToApi);
}

export async function completeImageTask(
  row: ImageTaskRow,
  outputImageIds?: string[]
): Promise<ImageTaskApi> {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: "completed",
    completedAt: now,
  };
  if (outputImageIds && outputImageIds.length > 0) {
    update.outputImageIds = outputImageIds;
  }
  const updated = await updateDocument(C.imageTasks, String(row.id), update);
  return imageTaskRowToApi(updated);
}

export async function failImageTask(
  row: ImageTaskRow,
  error?: string
): Promise<ImageTaskApi> {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: "failed",
    completedAt: now,
  };
  if (error) {
    update.prompt = (toString(row.prompt) ? toString(row.prompt) + " | " : "") + `[error] ${error}`.slice(0, 2000);
  }
  const updated = await updateDocument(C.imageTasks, String(row.id), update);
  return imageTaskRowToApi(updated);
}

// ---------------------------------------------------------------------------
// execute-render callback to scriptony-stage
// ---------------------------------------------------------------------------

/**
 * Notifies scriptony-stage that a render job has completed.
 * Calls POST /stage/render-jobs/:jobId/complete on the stage service.
 */
export async function notifyStageRenderComplete(
  jobId: string,
  outputImageIds: string[],
  callbackBaseUrl: string
): Promise<{ ok: boolean; status: number; body?: string }> {
  const url = `${callbackBaseUrl.replace(/\/+$/, "")}/stage/render-jobs/${jobId}/complete`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputImageIds }),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : "callback fetch failed",
    };
  }
}
