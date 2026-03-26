/**
 * Appwrite function entrypoint for the project-nodes service.
 */

import initializeProjectHandler from "./initialize-project";
import nodesHandler from "./nodes/index";
import nodeByIdHandler from "./nodes/[id]";
import nodeChildrenHandler from "./nodes/[id]/children";
import nodePathHandler from "./nodes/[id]/path";
import batchLoadHandler from "./nodes/batch-load";
import ultraBatchLoadHandler from "./nodes/ultra-batch-load";
import bulkHandler from "./nodes/bulk";
import reorderHandler from "./nodes/reorder";
import { sendJson, sendNotFound, type RequestLike, type ResponseLike } from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";

function getPathname(req: RequestLike): string {
  const direct = (typeof req?.path === "string" && req.path) || (typeof req?.url === "string" && req.url) || "/";
  try {
    if (direct.startsWith("http://") || direct.startsWith("https://")) return new URL(direct).pathname || "/";
  } catch { /* fallback */ }
  const q = direct.indexOf("?");
  return q >= 0 ? direct.slice(0, q) : direct;
}

function withParams(req: RequestLike, params: Record<string, string>): RequestLike {
  req.params = { ...(req.params || {}), ...params };
  return req;
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-project-nodes",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (pathname === "/initialize-project") {
    await initializeProjectHandler(req, res);
    return;
  }

  if (pathname === "/nodes") {
    await nodesHandler(req, res);
    return;
  }

  if (pathname === "/nodes/batch-load") {
    await batchLoadHandler(req, res);
    return;
  }

  if (pathname === "/nodes/ultra-batch-load") {
    await ultraBatchLoadHandler(req, res);
    return;
  }

  if (pathname === "/nodes/bulk") {
    await bulkHandler(req, res);
    return;
  }

  if (pathname === "/nodes/reorder") {
    await reorderHandler(req, res);
    return;
  }

  const childrenMatch = pathname.match(/^\/nodes\/([^/]+)\/children$/);
  if (childrenMatch) {
    await nodeChildrenHandler(withParams(req, { id: childrenMatch[1] }), res);
    return;
  }

  const pathMatch = pathname.match(/^\/nodes\/([^/]+)\/path$/);
  if (pathMatch) {
    await nodePathHandler(withParams(req, { id: pathMatch[1] }), res);
    return;
  }

  const byIdMatch = pathname.match(/^\/nodes\/([^/]+)$/);
  if (byIdMatch) {
    await nodeByIdHandler(withParams(req, { id: byIdMatch[1] }), res);
    return;
  }

  sendNotFound(res, `Route not found in scriptony-project-nodes: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
