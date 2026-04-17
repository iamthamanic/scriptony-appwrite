/**
 * Sync handler for the Local Bridge — DB-direct version.
 *
 * Updates shot fields directly in Appwrite DB instead of
 * calling HTTP endpoints. The bridge already has API-key
 * access and doesn't need user auth.
 *
 * Same forbidden-field guard as scriptony-sync:
 *   - acceptedRenderJobId, renderRevision, reviewStatus,
 *     styleProfileRevision, latestRenderJobId are FORBIDDEN
 *     (the bridge makes no product decisions).
 */

import { Databases } from "node-appwrite";
import { getDatabases, Collections } from "./appwrite-client.js";
import { getConfig } from "./config.js";
import { log } from "./logger.js";
import type { ShotStatePayload, PreviewPayload, GlbPreviewPayload } from "./types.js";

// ---------------------------------------------------------------------------
// Forbidden fields — the bridge must NEVER write these
// ---------------------------------------------------------------------------

const FORBIDDEN_FIELDS = new Set([
  "acceptedRenderJobId",
  "renderRevision",
  "reviewStatus",
  "styleProfileRevision",
  "latestRenderJobId",
]);

function assertNoForbiddenFields(data: Record<string, unknown>): void {
  for (const key of Object.keys(data)) {
    if (FORBIDDEN_FIELDS.has(key)) {
      throw new Error(
        `Bridge attempted to write forbidden field "${key}" — bridge makes no product decisions`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Sync: shot state (Blender version + revision)
// ---------------------------------------------------------------------------

export async function syncShotState(payload: ShotStatePayload): Promise<boolean> {
  const db: Databases = getDatabases();
  const config = getConfig();

  const data: Record<string, unknown> = {};
  if (payload.blenderSourceVersion) data.blenderSourceVersion = payload.blenderSourceVersion;
  if (payload.blenderSyncRevision !== undefined) data.blenderSyncRevision = payload.blenderSyncRevision;

  assertNoForbiddenFields(data);

  log.info("sync", "Syncing shot state to DB", { shotId: payload.shotId });

  try {
    await db.updateDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.shots,
      payload.shotId,
      { ...data, lastBlenderSyncAt: new Date().toISOString() },
    );
    log.info("sync", "Shot state synced", { shotId: payload.shotId });
    return true;
  } catch (err) {
    log.error("sync", "Shot state sync failed", {
      shotId: payload.shotId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sync: preview timestamp
// ---------------------------------------------------------------------------

export async function syncPreview(payload: PreviewPayload): Promise<boolean> {
  const db: Databases = getDatabases();
  const config = getConfig();

  const data: Record<string, unknown> = {};
  if (payload.lastPreviewAt) data.lastPreviewAt = payload.lastPreviewAt;
  else data.lastPreviewAt = new Date().toISOString();

  assertNoForbiddenFields(data);

  log.info("sync", "Syncing preview to DB", { shotId: payload.shotId });

  try {
    await db.updateDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.shots,
      payload.shotId,
      data,
    );
    log.info("sync", "Preview synced", { shotId: payload.shotId });
    return true;
  } catch (err) {
    log.error("sync", "Preview sync failed", {
      shotId: payload.shotId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sync: GLB preview file ID
// ---------------------------------------------------------------------------

export async function syncGlbPreview(payload: GlbPreviewPayload): Promise<boolean> {
  const db: Databases = getDatabases();
  const config = getConfig();

  const data: Record<string, unknown> = {
    glbPreviewFileId: payload.glbPreviewFileId,
  };

  assertNoForbiddenFields(data);

  log.info("sync", "Syncing GLB preview to DB", { shotId: payload.shotId });

  try {
    await db.updateDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.shots,
      payload.shotId,
      data,
    );
    log.info("sync", "GLB preview synced", { shotId: payload.shotId });
    return true;
  } catch (err) {
    log.error("sync", "GLB preview sync failed", {
      shotId: payload.shotId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}