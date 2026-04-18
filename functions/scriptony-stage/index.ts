/**
 * Appwrite function entrypoint: scriptony-stage.
 *
 * Puppet-Layer render-job orchestrator (Ticket 3).
 *
 * Routes:
 *   POST   /stage/render-jobs              — create a new render job
 *   GET    /stage/render-jobs/:id           — get job by ID
 *   GET    /stage/render-jobs?shotId=…      — list jobs for a shot
 *   POST   /stage/render-jobs/:id/complete — mark job as completed
 *   POST   /stage/render-jobs/:id/fail     — mark job as failed
 *   PUT    /stage/render-jobs/:id/accept    — accept job (official shot render)
 *   PUT    /stage/render-jobs/:id/reject    — reject job (acceptedRenderJobId stays)
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
  acceptRenderJob,
  completeRenderJob,
  createRenderJob,
  failRenderJob,
  getRenderJobById,
  listRenderJobsForShot,
  rejectRenderJob,
  renderJobRowToApi,
  userCanAccessProject,
} from "./stage-service";

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
  try {
    const pathname = getPathname(req);

    if (pathname === "/" || pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "scriptony-stage",
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

    // POST /stage/render-jobs — create
    if (pathname === "/stage/render-jobs") {
      if (req.method === "GET") {
        const shotId = getQueryParam(req, "shotId");
        if (!shotId) {
          sendBadRequest(res, "shotId query parameter is required for listing");
          return;
        }
        sendJson(res, 200, { jobs: await listRenderJobsForShot(shotId) });
        return;
      }

      if (req.method === "POST") {
        const body = await readJsonBody<{
          projectId?: string;
          shotId?: string;
          type?: string;
          jobClass?: string;
          guideBundleId?: string;
          styleProfileId?: string;
          repairConfig?: string | null;
        }>(req);

        if (!body.projectId || !body.shotId || !body.type || !body.jobClass) {
          sendBadRequest(
            res,
            "projectId, shotId, type, and jobClass are required",
          );
          return;
        }

        if (
          !(await userCanAccessProject(body.projectId, userId, organizationIds))
        ) {
          sendNotFound(res, "Project not found");
          return;
        }

        const job = await createRenderJob({
          userId,
          projectId: body.projectId,
          shotId: body.shotId,
          type: body.type,
          jobClass: body.jobClass,
          guideBundleId: body.guideBundleId || "",
          styleProfileId: body.styleProfileId || "",
          repairConfig: body.repairConfig ?? null,
        });
        sendJson(res, 201, { job });
        return;
      }

      sendMethodNotAllowed(res, ["GET", "POST"]);
      return;
    }

    // POST /stage/render-jobs/:id/complete
    const completeMatch = pathname.match(
      /^\/stage\/render-jobs\/([^/]+)\/complete$/,
    );
    if (completeMatch) {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }
      const jobId = completeMatch[1];
      const row = await getRenderJobById(jobId);
      if (!row) {
        sendNotFound(res, "Render job not found");
        return;
      }
      const body = await readJsonBody<{ outputImageIds?: string[] }>(req).catch(
        () => ({}),
      );
      try {
        const job = await completeRenderJob(row, body.outputImageIds);
        sendJson(res, 200, { job });
      } catch (error) {
        sendBadRequest(
          res,
          error instanceof Error ? error.message : "Cannot complete job",
        );
      }
      return;
    }

    // POST /stage/render-jobs/:id/fail
    const failMatch = pathname.match(
      /^\/stage\/render-jobs\/([^/]+)\/fail$/,
    );
    if (failMatch) {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }
      const jobId = failMatch[1];
      const row = await getRenderJobById(jobId);
      if (!row) {
        sendNotFound(res, "Render job not found");
        return;
      }
      const body = await readJsonBody<{ error?: string }>(req).catch(
        () => ({}),
      );
      try {
        const job = await failRenderJob(row, body.error);
        sendJson(res, 200, { job });
      } catch (error) {
        sendBadRequest(
          res,
          error instanceof Error ? error.message : "Cannot fail job",
        );
      }
      return;
    }

    // PUT /stage/render-jobs/:id/accept
    const acceptMatch = pathname.match(
      /^\/stage\/render-jobs\/([^/]+)\/accept$/,
    );
    if (acceptMatch) {
      if (req.method !== "PUT") {
        sendMethodNotAllowed(res, ["PUT"]);
        return;
      }
      const jobId = acceptMatch[1];
      const row = await getRenderJobById(jobId);
      if (!row) {
        sendNotFound(res, "Render job not found");
        return;
      }
      try {
        const job = await acceptRenderJob(row, userId);
        sendJson(res, 200, { job });
      } catch (error) {
        sendBadRequest(
          res,
          error instanceof Error ? error.message : "Cannot accept job",
        );
      }
      return;
    }

    // PUT /stage/render-jobs/:id/reject
    const rejectMatch = pathname.match(
      /^\/stage\/render-jobs\/([^/]+)\/reject$/,
    );
    if (rejectMatch) {
      if (req.method !== "PUT") {
        sendMethodNotAllowed(res, ["PUT"]);
        return;
      }
      const jobId = rejectMatch[1];
      const row = await getRenderJobById(jobId);
      if (!row) {
        sendNotFound(res, "Render job not found");
        return;
      }
      try {
        const job = await rejectRenderJob(row, userId);
        sendJson(res, 200, { job });
      } catch (error) {
        sendBadRequest(
          res,
          error instanceof Error ? error.message : "Cannot reject job",
        );
      }
      return;
    }

    // GET /stage/render-jobs/:id
    const jobMatch = pathname.match(/^\/stage\/render-jobs\/([^/]+)$/);
    if (jobMatch) {
      if (req.method !== "GET") {
        sendMethodNotAllowed(res, ["GET"]);
        return;
      }
      const jobId = jobMatch[1];
      const row = await getRenderJobById(jobId);
      if (!row) {
        sendNotFound(res, "Render job not found");
        return;
      }
      sendJson(res, 200, { job: renderJobRowToApi(row) });
      return;
    }

    sendNotFound(res, `Route not found in scriptony-stage: ${pathname}`);
  } catch (error) {
    sendServerError(res, error);
  }
}

export default createAppwriteHandler(dispatch);
