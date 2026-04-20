/**
 * Appwrite function entrypoint for the characters service.
 */

import timelineCharactersHandler from "./timeline-characters/index";
import timelineCharacterByIdHandler from "./timeline-characters/[id]";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
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
    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-characters",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Both /characters and /timeline-characters route to the same handler
  if (pathname === "/characters" || pathname === "/timeline-characters") {
    await timelineCharactersHandler(req, res);
    return;
  }

  const charByIdMatch = pathname.match(
    /^\/(?:characters|timeline-characters)\/([^/]+)$/,
  );
  if (charByIdMatch) {
    await timelineCharacterByIdHandler(
      withParams(req, { id: charByIdMatch[1] }),
      res,
    );
    return;
  }

  sendNotFound(res, `Route not found in scriptony-characters: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
