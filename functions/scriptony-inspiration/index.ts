/**
 * Appwrite function entrypoint for the inspiration service.
 * Stub: returns empty results until the full implementation is built.
 */

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

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-inspiration",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (pathname === "/inspirations") {
    sendJson(res, 200, { inspirations: [] });
    return;
  }

  sendNotFound(res, `Route not found in scriptony-inspiration: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
