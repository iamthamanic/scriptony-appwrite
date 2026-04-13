/**
 * Appwrite function entrypoint: scriptony-image.
 *
 * Legacy routes (kept for backward compatibility):
 *   POST /ai/image/validate-key
 *   GET/PUT /ai/image/settings
 *   POST /ai/image/generate-cover
 *
 * Puppet-Layer routes (Ticket 4):
 *   POST /ai/image/drawtoai       — exploratory: create draw-to-AI task
 *   POST /ai/image/segment        — exploratory: create segmentation task
 *   GET  /ai/image/tasks/:id      — get exploratory task status
 *   GET  /ai/image/tasks           — list tasks for user (optional ?projectId=)
 *   POST /ai/image/execute-render — official: execute render job, callback to stage
 */

import "../_shared/fetch-polyfill";
import imageValidateKeyHandler from "./ai/image-validate-key";
import imageGenerateCoverHandler from "./ai/image-generate-cover";
import imageSettingsHandler from "./ai/image-settings";
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
  completeImageTask,
  createImageTask,
  failImageTask,
  getImageTaskById,
  imageTaskRowToApi,
  listImageTasksForUser,
  notifyStageRenderComplete,
  userCanAccessProject,
} from "./image-task-service";
import { getDocument, C } from "../_shared/appwrite-db";

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
  // Legacy routes
  // -------------------------------------------------------------------------

  if (pathname === "/ai/image/validate-key") {
    await imageValidateKeyHandler(req, res);
    return;
  }

  if (pathname === "/ai/image/settings") {
    await imageSettingsHandler(req, res);
    return;
  }

  if (pathname === "/ai/image/generate-cover") {
    await imageGenerateCoverHandler(req, res);
    return;
  }

  // -------------------------------------------------------------------------
  // Puppet-Layer routes (Ticket 4)
  // -------------------------------------------------------------------------

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

    if (!body.inputImageIds || !Array.isArray(body.inputImageIds) || body.inputImageIds.length === 0) {
      sendBadRequest(res, "inputImageIds is required (non-empty array)");
      return;
    }

    if (body.projectId && !(await userCanAccessProject(body.projectId, userId, organizationIds))) {
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

    if (!body.inputImageIds || !Array.isArray(body.inputImageIds) || body.inputImageIds.length === 0) {
      sendBadRequest(res, "inputImageIds is required (non-empty array)");
      return;
    }

    if (body.projectId && !(await userCanAccessProject(body.projectId, userId, organizationIds))) {
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
    sendJson(res, 200, { tasks: await listImageTasksForUser(userId, projectId) });
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

  // POST /ai/image/execute-render — official render execution with stage callback
  if (pathname === "/ai/image/execute-render") {
    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }
    const body = await readJsonBody<{
      jobId: string;
      payload?: Record<string, unknown>;
      callbackBaseUrl?: string;
    }>(req);

    if (!body.jobId) {
      sendBadRequest(res, "jobId is required");
      return;
    }

    // Verify the render job exists
    const renderJob = await getDocument(C.renderJobs, body.jobId);
    if (!renderJob) {
      sendNotFound(res, "Render job not found");
      return;
    }

    // Verify user has access to the job's project
    const jobProjectId = typeof renderJob.projectId === "string" ? renderJob.projectId.trim() : "";
    if (jobProjectId && !(await userCanAccessProject(jobProjectId, userId, organizationIds))) {
      sendNotFound(res, "Render job not found");
      return;
    }

    // Update render job status to executing
    const { updateDocument: updateDoc } = await import("../_shared/appwrite-db");
    await updateDoc(C.renderJobs, body.jobId, { status: "executing" });

    // In a real implementation, this is where the actual image generation happens.
    // For now, we create the orchestration flow: mark as executing and return.
    // The actual executor (ComfyUI, local bridge, etc.) will call back when done.

    sendJson(res, 200, {
      jobId: body.jobId,
      status: "executing",
      message: "Render job is now executing. Callback will be sent to stage on completion.",
      callbackBaseUrl: body.callbackBaseUrl || null,
    });
    return;
  }

  sendNotFound(res, `Route not found in scriptony-image: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
