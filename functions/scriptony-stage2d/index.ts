/**
 * Appwrite function entrypoint: scriptony-stage2d.
 *
 * Puppet-Layer Stage2D service (Ticket 5).
 *
 * Routes:
 *   GET    /stage2d/documents/:shotId          — get or create stage document
 *   PUT    /stage2d/documents/:shotId          — update viewState / selectedTake / currentFrame
 *   POST   /stage2d/layers                     — add a layer
 *   PUT    /stage2d/layers/:layerId            — update a layer
 *   DELETE /stage2d/layers/:layerId?shotId=…   — delete a layer
 *   POST   /stage2d/prepare-repair             — create mask + guide bundle
 */

import { requireUserBootstrap } from "../_shared/auth";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import { getUserOrganizationIds } from "../_shared/scriptony";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
  type RequestLike,
  type ResponseLike,
} from "../_shared/http";
import {
  addLayer,
  deleteLayer,
  getOrCreateStageDocument,
  getStageDocument,
  listLayers,
  prepareRepair,
  stageDocumentRowToApi,
  updateLayer,
  updateStageDocument,
  userCanAccessShot,
} from "./stage2d-service";

function getPathname(req: RequestLike): string {
  const direct =
    (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string" && req.url) ||
    "/";
  try {
    if (direct.startsWith("http://") || direct.startsWith("https://"))
      return new URL(direct).pathname || "/";
  } catch {
    /* fallback */
  }
  const q = direct.indexOf("?");
  return q >= 0 ? direct.slice(0, q) : direct;
}

function getQueryParam(req: RequestLike, key: string): string {
  const fromQuery = req?.query?.[key];
  if (typeof fromQuery === "string" && fromQuery.trim()) return fromQuery.trim();
  try {
    const raw = typeof req?.url === "string" ? req.url : "";
    const url =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? new URL(raw)
        : new URL(raw, "http://local");
    return url.searchParams.get(key)?.trim() || "";
  } catch {
    return "";
  }
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const pathname = getPathname(req);

    if (pathname === "/" || pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "scriptony-stage2d",
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
    // POST /stage2d/prepare-repair
    // -------------------------------------------------------------------------
    if (pathname === "/stage2d/prepare-repair") {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }
      const body = await readJsonBody<{
        shotId?: string;
        layerId?: string;
        repairType?: string;
      }>(req);

      if (!body.shotId || !body.layerId) {
        sendBadRequest(res, "shotId and layerId are required");
        return;
      }

      if (!(await userCanAccessShot(body.shotId, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      try {
        const result = await prepareRepair(userId, body.shotId, {
          layerId: body.layerId,
          repairType: body.repairType,
        });
        sendJson(res, 200, result);
      } catch (error) {
        sendServerError(res, error);
      }
      return;
    }

    // -------------------------------------------------------------------------
    // POST /stage2d/layers
    // -------------------------------------------------------------------------
    if (pathname === "/stage2d/layers") {
      if (req.method === "GET") {
        const shotId = getQueryParam(req, "shotId");
        if (!shotId) {
          sendBadRequest(res, "shotId query parameter is required");
          return;
        }
        if (!(await userCanAccessShot(shotId, userId, organizationIds))) {
          sendNotFound(res, "Shot not found");
          return;
        }
        sendJson(res, 200, { layers: await listLayers(shotId) });
        return;
      }

      if (req.method === "POST") {
        const body = await readJsonBody<{
          shotId?: string;
          layerType?: string;
          name?: string;
          visible?: boolean;
          opacity?: number;
          orderIndex?: number;
          fileId?: string | null;
          metadata?: string | null;
        }>(req);

        if (!body.shotId) {
          sendBadRequest(res, "shotId is required");
          return;
        }

        if (!(await userCanAccessShot(body.shotId, userId, organizationIds))) {
          sendNotFound(res, "Shot not found");
          return;
        }

        const layer = await addLayer(userId, body.shotId, {
          layerType: body.layerType,
          name: body.name,
          visible: body.visible,
          opacity: body.opacity,
          orderIndex: body.orderIndex,
          fileId: body.fileId,
          metadata: body.metadata,
        });
        sendJson(res, 201, { layer });
        return;
      }

      sendMethodNotAllowed(res, ["GET", "POST"]);
      return;
    }

    // -------------------------------------------------------------------------
    // PUT /stage2d/layers/:layerId
    // -------------------------------------------------------------------------
    const layerUpdateMatch = pathname.match(/^\/stage2d\/layers\/([^/]+)$/);
    if (layerUpdateMatch) {
      if (req.method !== "PUT") {
        sendMethodNotAllowed(res, ["PUT"]);
        return;
      }
      const layerId = layerUpdateMatch[1];
      const shotId = getQueryParam(req, "shotId");
      if (!shotId) {
        sendBadRequest(res, "shotId query parameter is required");
        return;
      }

      if (!(await userCanAccessShot(shotId, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      const body = await readJsonBody<{
        name?: string;
        visible?: boolean;
        opacity?: number;
        orderIndex?: number;
        fileId?: string | null;
        metadata?: string | null;
      }>(req);

      const layer = await updateLayer(shotId, layerId, body);
      if (!layer) {
        sendNotFound(res, "Layer not found");
        return;
      }
      sendJson(res, 200, { layer });
      return;
    }

    // -------------------------------------------------------------------------
    // DELETE /stage2d/layers/:layerId?shotId=…
    // -------------------------------------------------------------------------
    const layerDeleteMatch = pathname.match(/^\/stage2d\/layers\/([^/]+)$/);
    if (layerDeleteMatch && req.method === "DELETE") {
      const layerId = layerDeleteMatch[1];
      const shotId = getQueryParam(req, "shotId");
      if (!shotId) {
        sendBadRequest(res, "shotId query parameter is required");
        return;
      }

      if (!(await userCanAccessShot(shotId, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      const deleted = await deleteLayer(shotId, layerId);
      if (!deleted) {
        sendNotFound(res, "Layer not found");
        return;
      }
      sendJson(res, 200, { success: true });
      return;
    }

    // -------------------------------------------------------------------------
    // GET/PUT /stage2d/documents/:shotId
    // -------------------------------------------------------------------------
    const docMatch = pathname.match(/^\/stage2d\/documents\/([^/]+)$/);
    if (docMatch) {
      const shotId = docMatch[1];

      if (!(await userCanAccessShot(shotId, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      if (req.method === "GET") {
        const doc = await getStageDocument(shotId);
        if (!doc) {
          // Auto-create on GET
          const created = await getOrCreateStageDocument(userId, shotId);
          sendJson(res, 200, { document: created });
          return;
        }
        sendJson(res, 200, { document: stageDocumentRowToApi(doc) });
        return;
      }

      if (req.method === "PUT") {
        const body = await readJsonBody<{
          payload?: string | null;
          viewState?: string | null;
          selectedTakeId?: string | null;
          currentFrame?: number | null;
        }>(req);

        try {
          const doc = await updateStageDocument(shotId, {
            payload: body.payload,
            viewState: body.viewState,
            selectedTakeId: body.selectedTakeId,
            currentFrame: body.currentFrame,
          });
          sendJson(res, 200, { document: doc });
        } catch (error) {
          sendBadRequest(res, error instanceof Error ? error.message : "Update failed");
        }
        return;
      }

      sendMethodNotAllowed(res, ["GET", "PUT"]);
      return;
    }

    sendNotFound(res, `Route not found in scriptony-stage2d: ${pathname}`);
  } catch (error) {
    sendServerError(res, error);
  }
}

export default createAppwriteHandler(dispatch);
