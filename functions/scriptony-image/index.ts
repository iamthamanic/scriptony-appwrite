/**
 * Appwrite function entrypoint: scriptony-image.
 *
 * T10 BEREINIGT:
 *   - Technische Bildoperationen: drawtoai, segment, image tasks, generate-cover.
 *   - AI Key Validation und Image Settings sind nach scriptony-ai migriert.
 *   - execute-render ist nach scriptony-stage migriert.
 *
 * Legacy routes (410 Gone mit Verweis):
 *   POST /ai/image/validate-key  → scriptony-ai /providers/:id/validate
 *   GET/PUT /ai/image/settings   → scriptony-ai /features/image_generation
 *   POST /ai/image/execute-render → scriptony-stage /stage/render-jobs/:id/execute
 *
 * Aktive routes:
 *   POST /ai/image/drawtoai       — exploratory: create draw-to-AI task
 *   POST /ai/image/segment        — exploratory: create segmentation task
 *   GET  /ai/image/tasks/:id      — get exploratory task status
 *   GET  /ai/image/tasks           — list tasks for user (optional ?projectId=)
 *   POST /ai/image/generate-cover  — generate cover image (technical)
 */

import "../_shared/fetch-polyfill";
import imageGenerateCoverHandler from "./ai/image-generate-cover";
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
  sendUnauthorized,
} from "../_shared/http";
import {
  createImageTask,
  getImageTaskById,
  imageTaskRowToApi,
  listImageTasksForUser,
  userCanAccessProject,
} from "./image-task-service";

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

function getQueryParam(req: RequestLike, key: string): string {
  const fromQuery = req?.query?.[key];
  if (typeof fromQuery === "string" && fromQuery.trim()) {
    return fromQuery.trim();
  }
  try {
    const raw = typeof req?.url === "string" ? req.url : "";
    const url = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw)
      : new URL(raw, "http://local");
    return url.searchParams.get(key)?.trim() || "";
  } catch {
    return "";
  }
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-image",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // -------------------------------------------------------------------------
  // T10: Migrierte Legacy-Routen — 410 Gone
  // -------------------------------------------------------------------------

  if (pathname === "/ai/image/validate-key") {
    sendJson(res, 410, {
      error: "Gone",
      message:
        "T10: AI Key Validation wurde zu scriptony-ai verschoben. " +
        "Nutze POST /providers/:provider/validate bei scriptony-ai.",
    });
    return;
  }

  if (pathname === "/ai/image/settings") {
    sendJson(res, 410, {
      error: "Gone",
      message:
        "T10: Image Settings wurden zu scriptony-ai verschoben. " +
        "Nutze GET/PUT /features/image_generation oder /settings bei scriptony-ai.",
    });
    return;
  }

  if (pathname === "/ai/image/execute-render") {
    sendJson(res, 410, {
      error: "Gone",
      message:
        "T10: Render Execution wurde zu scriptony-stage verschoben. " +
        "Nutze POST /stage/render-jobs/:id/execute bei scriptony-stage.",
    });
    return;
  }

  // -------------------------------------------------------------------------
  // Technische Bild-Routen (T10: bleiben in scriptony-image)
  // -------------------------------------------------------------------------

  if (pathname === "/ai/image/generate-cover") {
    await imageGenerateCoverHandler(req, res);
    return;
  }

  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }
  const userId = bootstrap.user.id;
  const organizationIds = await getUserOrganizationIds(userId);

  // POST /ai/image/drawtoai — exploratory draw-to-AI task
  if (pathname === "/ai/image/drawtoai") {
    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }
    const body = await readJsonBody<{
      projectId?: string;
      inputImageIds?: string[];
      prompt?: string;
      strength?: number;
    }>(req);

    if (
      !body.inputImageIds ||
      !Array.isArray(body.inputImageIds) ||
      body.inputImageIds.length === 0
    ) {
      sendBadRequest(res, "inputImageIds is required (non-empty array)");
      return;
    }

    if (
      body.projectId &&
      !(await userCanAccessProject(body.projectId, userId, organizationIds))
    ) {
      sendNotFound(res, "Project not found");
      return;
    }

    const task = await createImageTask({
      userId,
      projectId: body.projectId,
      type: "drawtoai",
      jobClass: "exploratory",
      inputImageIds: body.inputImageIds,
      prompt: body.prompt,
      strength: body.strength,
    });
    sendJson(res, 201, { task });
    return;
  }

  // POST /ai/image/segment — exploratory segmentation task
  if (pathname === "/ai/image/segment") {
    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }
    const body = await readJsonBody<{
      projectId?: string;
      inputImageIds?: string[];
      prompt?: string;
    }>(req);

    if (
      !body.inputImageIds ||
      !Array.isArray(body.inputImageIds) ||
      body.inputImageIds.length === 0
    ) {
      sendBadRequest(res, "inputImageIds is required (non-empty array)");
      return;
    }

    if (
      body.projectId &&
      !(await userCanAccessProject(body.projectId, userId, organizationIds))
    ) {
      sendNotFound(res, "Project not found");
      return;
    }

    const task = await createImageTask({
      userId,
      projectId: body.projectId,
      type: "segment",
      jobClass: "exploratory",
      inputImageIds: body.inputImageIds,
      prompt: body.prompt,
    });
    sendJson(res, 201, { task });
    return;
  }

  // GET /ai/image/tasks — list tasks for user
  if (pathname === "/ai/image/tasks") {
    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }
    const projectId = getQueryParam(req, "projectId") || null;
    sendJson(res, 200, {
      tasks: await listImageTasksForUser(userId, projectId),
    });
    return;
  }

  // GET /ai/image/tasks/:id — get task by ID
  const taskMatch = pathname.match(/^\/ai\/image\/tasks\/([^/]+)$/);
  if (taskMatch) {
    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }
    const row = await getImageTaskById(taskMatch[1]);
    if (!row) {
      sendNotFound(res, "Image task not found");
      return;
    }
    sendJson(res, 200, { task: imageTaskRowToApi(row) });
    return;
  }

  sendNotFound(res, `Route not found in scriptony-image: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
