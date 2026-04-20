/**
 * Shared access-control and coercion helpers for puppet-layer services.
 *
 * DRY: extracted from stage2d-service, stage3d-service, sync-service
 * where they were duplicated verbatim.
 */

import { C, getDocument } from "./appwrite-db";
import { getAccessibleProject } from "./scriptony";

// ---------------------------------------------------------------------------
// Coercion helpers
// ---------------------------------------------------------------------------

export function toString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

export function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export function toInteger(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  }
  return fallback;
}

export function toIntegerOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  return null;
}

export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

/**
 * Check whether a user can access a shot (via project ownership or org membership).
 * Used by stage2d, stage3d, and sync services.
 */
export async function userCanAccessShot(
  shotId: string,
  userId: string,
  organizationIds: string[],
): Promise<boolean> {
  const shot = await getDocument(C.shots, shotId);
  if (!shot) return false;
  const projectId = toString(shot.project_id ?? shot.projectId);
  if (!projectId) return false;
  return Boolean(
    await getAccessibleProject(projectId, userId, organizationIds),
  );
}
