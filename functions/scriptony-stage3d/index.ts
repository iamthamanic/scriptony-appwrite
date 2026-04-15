/**
 * Appwrite function entrypoint: scriptony-stage3d.
 *
 * Puppet-Layer Stage3D service (Ticket 8).
 *
 * Routes:
 *   GET  /stage3d/documents/:shotId          — get or create stage3d document
 *   PUT  /stage3d/documents/:shotId/view-state — update 3D view state
 *
 * Only view state, never authoring.
 */

import { requireUserBootstrap } from "../_shared/auth";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import { getUserOrganizationIds } from "../_shared/scriptony";
import { userCanAccessShot } from "../_shared/puppet-helpers";
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
  getOrCreateStage3dDocument,
  getStage3dDocument,
  stage3dDocumentRowToApi,
  updateStage3dViewState,
  updateViewStateBodySchema,
} from "./stage3d-service";

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

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const pathname = getPathname(req);

    if (pathname === "/" || pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "scriptony-stage3d",
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
    // PUT /stage3d/documents/:shotId/view-state
    // -------------------------------------------------------------------------
    const viewStateMatch = pathname.match(/^\/stage3d\/documents\/([^/]+)\/view-state$/);
    if (viewStateMatch) {
      if (req.method !== "PUT") {
        sendMethodNotAllowed(res, ["PUT"]);
        return;
      }
      const shotId = viewStateMatch[1];

      if (!(await userCanAccessShot(shotId, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      const rawBody = await readJsonBody(req);
      const parsed = updateViewStateBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        sendBadRequest(res, parsed.error.flatten().formErrors.join("; ") || "Invalid viewState");
        return;
      }

      try {
        const doc = await updateStage3dViewState(shotId, {
          viewState: parsed.data.viewState,
        });
        sendJson(res, 200, { document: doc });
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          sendNotFound(res, "Stage3D document not found — call GET /stage3d/documents/:shotId first");
          return;
        }
        throw error;
      }
      return;
    }

    // -------------------------------------------------------------------------
    // GET /stage3d/documents/:shotId
    // -------------------------------------------------------------------------
    const docMatch = pathname.match(/^\/stage3d\/documents\/([^/]+)$/);
    if (docMatch) {
      const shotId = docMatch[1];

      if (!(await userCanAccessShot(shotId, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      if (req.method === "GET") {
        const doc = await getStage3dDocument(shotId);
        if (!doc) {
          const created = await getOrCreateStage3dDocument(userId, shotId);
          sendJson(res, 200, { document: created });
          return;
        }
        sendJson(res, 200, { document: stage3dDocumentRowToApi(doc) });
        return;
      }

      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    sendNotFound(res, `Route not found in scriptony-stage3d: ${pathname}`);
  } catch (error) {
    sendServerError(res, error);
  }
}

export default createAppwriteHandler(dispatch);