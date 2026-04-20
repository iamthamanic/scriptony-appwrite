/**
 * Domain logic for Puppet-Layer style profiles.
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
import type { StyleProfileConfig } from "../_shared/style-profile-schema";
import {
  parseStyleProfileConfig,
  serializeStyleProfileConfig,
} from "../_shared/style-profile-schema";

export type StyleProfileRow = Record<string, any>;

export type StyleProfileApi = {
  id: string;
  userId: string;
  projectId: string | null;
  name: string;
  previewImageId: string | null;
  version: number;
  createdAt: string;
  updatedAt?: string;
  config: StyleProfileConfig;
};

export type ShotStyleResolutionStatus = "resolved" | "unassigned" | "missing";

export type ShotStyleResolutionApi = {
  shotId: string;
  projectId: string | null;
  styleProfileId: string | null;
  styleProfileRevision: number | null;
  resolutionStatus: ShotStyleResolutionStatus;
  profileVersion: number | null;
  profile: StyleProfileApi | null;
};

function normalizedProjectId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizedInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

function shotRowToStyleResolution(
  shotRow: Record<string, any>,
  profile: StyleProfileApi | null,
  resolutionStatus: ShotStyleResolutionStatus,
): ShotStyleResolutionApi {
  return {
    shotId: String(shotRow.id),
    projectId: normalizedProjectId(shotRow.project_id ?? shotRow.projectId),
    styleProfileId: normalizedProjectId(shotRow.styleProfileId),
    styleProfileRevision: normalizedInteger(shotRow.styleProfileRevision),
    resolutionStatus,
    profileVersion: profile?.version ?? null,
    profile,
  };
}

export function styleProfileRowToApi(row: StyleProfileRow): StyleProfileApi {
  return {
    id: String(row.id),
    userId: String(row.userId ?? ""),
    projectId: normalizedProjectId(row.projectId),
    name: String(row.name ?? "").trim(),
    previewImageId: normalizedProjectId(row.previewImageId),
    version: typeof row.version === "number"
      ? row.version
      : Number(row.version || 1) || 1,
    createdAt: String(
      row.createdAt ?? row.created_at ?? new Date().toISOString(),
    ),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
    config: parseStyleProfileConfig(row.configJson),
  };
}

export async function listStyleProfilesForUser(
  userId: string,
): Promise<StyleProfileApi[]> {
  const rows = await listDocumentsFull(C.styleProfiles, [
    Query.equal("userId", userId),
    Query.orderDesc("createdAt"),
  ]);
  return rows.map(styleProfileRowToApi);
}

export async function listStyleProfilesForProject(
  projectId: string,
): Promise<StyleProfileApi[]> {
  const rows = await listDocumentsFull(C.styleProfiles, [
    Query.equal("projectId", projectId),
    Query.orderDesc("createdAt"),
  ]);
  return rows.map(styleProfileRowToApi);
}

export async function getStyleProfileById(
  profileId: string,
): Promise<StyleProfileRow | null> {
  return getDocument(C.styleProfiles, profileId);
}

export async function userCanAccessStyleProfile(
  row: StyleProfileRow,
  userId: string,
  organizationIds: string[],
): Promise<boolean> {
  if (String(row.userId ?? "") === userId) {
    return true;
  }
  const projectId = normalizedProjectId(row.projectId);
  if (!projectId) {
    return false;
  }
  return Boolean(
    await getAccessibleProject(projectId, userId, organizationIds),
  );
}

export async function createStyleProfile(input: {
  userId: string;
  name: string;
  projectId?: string | null;
  previewImageId?: string | null;
  config: StyleProfileConfig;
}): Promise<StyleProfileApi> {
  const now = new Date().toISOString();
  const row = await createDocument(C.styleProfiles, ID.unique(), {
    userId: input.userId,
    projectId: input.projectId ?? null,
    name: input.name.trim(),
    previewImageId: input.previewImageId ?? null,
    configJson: serializeStyleProfileConfig(input.config),
    version: 1,
    createdAt: now,
  });
  return styleProfileRowToApi(row);
}

export async function updateStyleProfile(
  row: StyleProfileRow,
  patch: {
    name?: string;
    projectId?: string | null;
    previewImageId?: string | null;
    config?: StyleProfileConfig;
  },
): Promise<StyleProfileApi> {
  const nextVersion =
    (typeof row.version === "number"
      ? row.version
      : Number(row.version || 1) || 1) + 1;
  const update: Record<string, unknown> = {
    version: nextVersion,
  };
  if (patch.name !== undefined) {
    update.name = patch.name.trim();
  }
  if (patch.projectId !== undefined) {
    update.projectId = patch.projectId;
  }
  if (patch.previewImageId !== undefined) {
    update.previewImageId = patch.previewImageId;
  }
  if (patch.config !== undefined) {
    update.configJson = serializeStyleProfileConfig(patch.config);
  }
  const updated = await updateDocument(C.styleProfiles, String(row.id), update);
  return styleProfileRowToApi(updated);
}

export async function removeStyleProfile(profileId: string): Promise<void> {
  await deleteDocument(C.styleProfiles, profileId);
}

export async function getStyleShotById(
  shotId: string,
): Promise<Record<string, any> | null> {
  return getDocument(C.shots, shotId);
}

export async function userCanAccessShotStyle(
  shotRow: Record<string, any>,
  userId: string,
  organizationIds: string[],
): Promise<boolean> {
  const projectId = normalizedProjectId(
    shotRow.project_id ?? shotRow.projectId,
  );
  if (!projectId) {
    return false;
  }
  return Boolean(
    await getAccessibleProject(projectId, userId, organizationIds),
  );
}

export async function resolveShotStyleProfile(
  shotRow: Record<string, any>,
  userId: string,
  organizationIds: string[],
): Promise<ShotStyleResolutionApi> {
  const styleProfileId = normalizedProjectId(shotRow.styleProfileId);
  if (!styleProfileId) {
    return shotRowToStyleResolution(shotRow, null, "unassigned");
  }

  const profileRow = await getStyleProfileById(styleProfileId);
  if (!profileRow) {
    return shotRowToStyleResolution(shotRow, null, "missing");
  }
  if (!(await userCanAccessStyleProfile(profileRow, userId, organizationIds))) {
    return shotRowToStyleResolution(shotRow, null, "missing");
  }

  return shotRowToStyleResolution(
    shotRow,
    styleProfileRowToApi(profileRow),
    "resolved",
  );
}

export async function applyStyleProfileToShot(
  shotRow: Record<string, any>,
  profileRow: StyleProfileRow | null,
): Promise<ShotStyleResolutionApi> {
  const nextProfile = profileRow ? styleProfileRowToApi(profileRow) : null;
  const nextStyleProfileId = nextProfile?.id ?? null;
  const nextStyleProfileRevision = nextProfile?.version ?? null;
  const currentStyleProfileId = normalizedProjectId(shotRow.styleProfileId);
  const currentStyleProfileRevision = normalizedInteger(
    shotRow.styleProfileRevision,
  );

  if (
    currentStyleProfileId === nextStyleProfileId &&
    currentStyleProfileRevision === nextStyleProfileRevision
  ) {
    return shotRowToStyleResolution(
      shotRow,
      nextProfile,
      nextProfile ? "resolved" : "unassigned",
    );
  }

  const updatedShot = await updateDocument(C.shots, String(shotRow.id), {
    styleProfileId: nextStyleProfileId,
    styleProfileRevision: nextStyleProfileRevision,
  });

  return shotRowToStyleResolution(
    updatedShot,
    nextProfile,
    nextProfile ? "resolved" : "unassigned",
  );
}
