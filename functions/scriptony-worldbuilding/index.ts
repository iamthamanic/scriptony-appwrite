/**
 * Appwrite function entrypoint for the worldbuilding service.
 */

import healthHandler from "./health";
import worldsHandler from "./worlds/index";
import worldByIdHandler from "./worlds/[id]";
import { sendNotFound, type RequestLike, type ResponseLike } from "../_shared/http";
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
    await healthHandler(req, res);
    return;
  }

  if (pathname === "/worlds") {
    await worldsHandler(req, res);
    return;
  }

  const byIdMatch = pathname.match(/^\/worlds\/([^/]+)$/);
  if (byIdMatch) {
    await worldByIdHandler(withParams(req, { id: byIdMatch[1] }), res);
    return;
  }

  sendNotFound(res, `Route not found in scriptony-worldbuilding: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
