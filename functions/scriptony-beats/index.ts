/**
 * Appwrite function entrypoint for the beats service.
 */

import healthHandler from "./health";
import beatsHandler from "./beats/index";
import beatByIdHandler from "./beats/[id]";
import {
  type RequestLike,
  type ResponseLike,
  sendNotFound,
} from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";

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
    await healthHandler(req, res);
    return;
  }

  if (pathname === "/beats") {
    await beatsHandler(req, res);
    return;
  }

  const byIdMatch = pathname.match(/^\/beats\/([^/]+)$/);
  if (byIdMatch) {
    await beatByIdHandler(withParams(req, { id: byIdMatch[1] }), res);
    return;
  }

  sendNotFound(res, `Route not found in scriptony-beats: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
