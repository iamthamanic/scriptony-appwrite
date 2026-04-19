/**
 * Appwrite function entrypoint: scriptony-sync.
 *
 * Puppet-Layer Sync service (Ticket 7 — Blender Ingress + Ticket 11 — Freshness).
 *
 * This service is a STRICT sync surface: it only updates sync-metadata
 * fields on `shots`. It must NEVER touch product-decision fields
 * (acceptedRenderJobId, renderRevision, reviewStatus, styleProfileRevision).
 *
 * Routes:
 *   POST /sync/shot-state   — Blender publishes version + revision
 *   POST /sync/guides        — Bridge publishes guide bundle
 *   POST /sync/preview       — Bridge publishes 2D preview timestamp
 *   POST /sync/glb-preview   — Bridge publishes GLB preview file ID
 *   GET  /sync/freshness/:shotId — compute freshness status for a shot
 */

import { requireUserBootstrap } from "../_shared/auth";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import { getUserOrganizationIds } from "../_shared/scriptony";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../_shared/http";
import {
  getShotFreshness,
  syncGlbPreview,
  syncGuides,
  syncPreview,
  syncShotState,
} from "./sync-service";
import { userCanAccessShot } from "../_shared/puppet-helpers";

function getPathname(req: RequestLike): string {
  const direct = (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string" && req.url) ||
    "/";
  try {
    if (direct.startsWith("http://") || direct.startsWith("https://")) {
      return new URL(direct).pathname || "/";
    }
  } catch {
    /* fallback */
  }
  const q = direct.indexOf("?");
  return q >= 0 ? direct.slice(0, q) : direct;
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const pathname = getPathname(req);

    if (pathname === "/" || pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "scriptony-sync",
        provider: "appwrite",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }
    const userId = bootstrap.user.id;
    const organizationIds = await getUserOrganizationIds(userId);

    // -------------------------------------------------------------------------
    // GET /sync/freshness/:shotId — compute freshness status (Ticket 11)
    // -------------------------------------------------------------------------
    const freshnessMatch = pathname.match(/^\/sync\/freshness\/([^/]+)$/);
    if (freshnessMatch) {
      if (req.method !== "GET") {
        sendMethodNotAllowed(res, ["GET"]);
        return;
      }
      const shotId = freshnessMatch[1];

      if (!(await userCanAccessShot(shotId, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      try {
        const freshness = await getShotFreshness(
          shotId,
          userId,
          organizationIds,
        );
        sendJson(res, 200, { shotId, freshness });
      } catch (error) {
        sendServerError(res, error);
      }
      return;
    }

    // -------------------------------------------------------------------------
    // POST /sync/shot-state — Blender publishes version + revision
    // -------------------------------------------------------------------------
    if (pathname === "/sync/shot-state") {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }

      const body = await readJsonBody<{
        shotId?: string;
        blenderSourceVersion?: string;
        blenderSyncRevision?: number;
      }>(req);

      if (!body.shotId) {
        sendBadRequest(res, "shotId is required");
        return;
      }

      if (!(await userCanAccessShot(body.shotId, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      try {
        const result = await syncShotState(
          {
            shotId: body.shotId,
            blenderSourceVersion: body.blenderSourceVersion,
            blenderSyncRevision: body.blenderSyncRevision,
          },
          userId,
          organizationIds,
        );
        sendJson(res, 200, result);
      } catch (error) {
        sendServerError(res, error);
      }
      return;
    }

    // -------------------------------------------------------------------------
    // POST /sync/guides — Bridge publishes guide bundle
    // -------------------------------------------------------------------------
    if (pathname === "/sync/guides") {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }

      const body = await readJsonBody<{
        shotId?: string;
        guideBundleRevision?: number;
        files?: string;
        metadata?: string;
      }>(req);

      if (!body.shotId) {
        sendBadRequest(res, "shotId is required");
        return;
      }

      if (!(await userCanAccessShot(body.shotId, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      try {
        const result = await syncGuides(
          {
            shotId: body.shotId,
            guideBundleRevision: body.guideBundleRevision,
            files: body.files,
            metadata: body.metadata,
          },
          userId,
          organizationIds,
        );
        sendJson(res, 200, result);
      } catch (error) {
        sendServerError(res, error);
      }
      return;
    }

    // -------------------------------------------------------------------------
    // POST /sync/preview — Bridge publishes 2D preview timestamp
    // -------------------------------------------------------------------------
    if (pathname === "/sync/preview") {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }

      const body = await readJsonBody<{
        shotId?: string;
        lastPreviewAt?: string;
      }>(req);

      if (!body.shotId) {
        sendBadRequest(res, "shotId is required");
        return;
      }

      if (!(await userCanAccessShot(body.shotId, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      try {
        const result = await syncPreview(
          {
            shotId: body.shotId,
            lastPreviewAt: body.lastPreviewAt,
          },
          userId,
          organizationIds,
        );
        sendJson(res, 200, result);
      } catch (error) {
        sendServerError(res, error);
      }
      return;
    }

    // -------------------------------------------------------------------------
    // POST /sync/glb-preview — Bridge publishes GLB preview file ID
    // -------------------------------------------------------------------------
    if (pathname === "/sync/glb-preview") {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }

      const body = await readJsonBody<{
        shotId?: string;
        glbPreviewFileId?: string;
      }>(req);

      if (!body.shotId) {
        sendBadRequest(res, "shotId is required");
        return;
      }

      if (!(await userCanAccessShot(body.shotId, userId, organizationIds))) {
        sendNotFound(res, "NotFound");
        return;
      }

      try {
        const result = await syncGlbPreview(
          {
            shotId: body.shotId,
            glbPreviewFileId: body.glbPreviewFileId,
          },
          userId,
          organizationIds,
        );
        sendJson(res, 200, result);
      } catch (error) {
        sendServerError(res, error);
      }
      return;
    }

    sendNotFound(res, `Route not found in scriptony-sync: ${pathname}`);
  } catch (error) {
    sendServerError(res, error);
  }
}

export default createAppwriteHandler(dispatch);
