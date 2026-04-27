/**
 * T14 ACTIVE JOB CONTROL PLANE — Node.js Appwrite Function.
 *
 * Einzige aktive Job-Queue für Scriptony.
 * Schema: docs/job-schema.md
 * Legacy: jobs-handler/ (Deno-only, nicht deployed)
 *
 * Endpoints:
 *   POST /v1/jobs/:functionName   — Job erstellen
 *   GET  /v1/jobs/:jobId/status   — Status abfragen
 *   GET  /v1/jobs/:jobId/result   — Ergebnis holen
 *   POST /v1/jobs/:jobId/cancel  — Job abbrechen
 *   POST /v1/jobs/:jobId/retry   — Job wiederholen
 *   POST /v1/jobs/cleanup         — Alte Jobs aufräumen
 */

import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
} from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import {
  handleCreateJob,
  handleGetResult,
  handleGetStatus,
} from "./handlers/read";
import { handleCancel, handleRetry } from "./handlers/lifecycle";
import { handleCleanup } from "./handlers/cleanup";

import { SUPPORTED_JOBS } from "./config/supported-jobs";

const HEALTH_DATA = {
  status: "ok",
  service: "scriptony-jobs",
  version: "1.0.0",
  supported_jobs: Object.keys(SUPPORTED_JOBS),
};

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname =
    (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string"
      ? new URL(req.url, "http://localhost").pathname
      : "/");

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, HEALTH_DATA);
    return;
  }

  try {
    const createMatch = pathname.match(/^\/v1\/jobs\/([^/]+)$/);
    if (createMatch && req.method === "POST") {
      await handleCreateJob(req, res, createMatch[1]);
      return;
    }

    const statusMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/status$/);
    if (statusMatch && req.method === "GET") {
      await handleGetStatus(req, res, statusMatch[1]);
      return;
    }

    const resultMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/result$/);
    if (resultMatch && req.method === "GET") {
      await handleGetResult(req, res, resultMatch[1]);
      return;
    }

    const cancelMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/cancel$/);
    if (cancelMatch && req.method === "POST") {
      await handleCancel(req, res, cancelMatch[1]);
      return;
    }

    const retryMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/retry$/);
    if (retryMatch && req.method === "POST") {
      await handleRetry(req, res, retryMatch[1]);
      return;
    }

    if (pathname === "/v1/jobs/cleanup" && req.method === "POST") {
      await handleCleanup(req, res);
      return;
    }

    sendNotFound(res, `Route not found: ${pathname}`);
  } catch (e) {
    sendServerError(res, e);
  }
}

export default createAppwriteHandler(dispatch);
