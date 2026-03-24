/**
 * Appwrite function entrypoint for the shots service.
 */

import shotsHandler from "./shots/index";
import shotBySceneHandler from "./shots/[sceneId]";
import shotByIdHandler from "./shots/[id]/index";
import shotReorderHandler from "./shots/reorder";
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
      service: "scriptony-shots",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (pathname === "/shots") {
    await shotsHandler(req, res);
    return;
  }

  if (pathname === "/shots/reorder") {
    await shotReorderHandler(req, res);
    return;
  }

  // /shots/by-scene/:sceneId
  const bySceneMatch = pathname.match(/^\/shots\/by-scene\/([^/]+)$/);
  if (bySceneMatch) {
    await shotBySceneHandler(withParams(req, { sceneId: bySceneMatch[1] }), res);
    return;
  }

  // /shots/:id
  const byIdMatch = pathname.match(/^\/shots\/([^/]+)$/);
  if (byIdMatch) {
    await shotByIdHandler(withParams(req, { id: byIdMatch[1] }), res);
    return;
  }

  sendNotFound(res, `Route not found in scriptony-shots: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
