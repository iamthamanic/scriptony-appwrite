/**
 * Appwrite function entrypoint for the clips service (editorial timeline).
 */

/**
 * Appwrite function entrypoint: scriptony-clips — T13 Timeline Domain.
 *   Ziel: scriptony-timeline. Keine neuen Timeline-Features ohne
 *   Zielentscheidung. Siehe docs/timeline-domain-decision.md
 */

import clipsCollectionHandler from "./clips/index";
import clipByIdHandler from "./clips/[id]";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
} from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";

function getPathname(req: RequestLike): string {
  const direct =
    (typeof req?.path === "string" && req.path) ||
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

function withParams(
  req: RequestLike,
  params: Record<string, string>,
): RequestLike {
  req.params = { ...(req.params || {}), ...params };
  return req;
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-clips",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (pathname === "/clips") {
    await clipsCollectionHandler(req, res);
    return;
  }

  const byIdMatch = pathname.match(/^\/clips\/([^/]+)$/);
  if (byIdMatch) {
    await clipByIdHandler(withParams(req, { id: byIdMatch[1] }), res);
    return;
  }

  sendNotFound(res, `Route not found in scriptony-clips: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
