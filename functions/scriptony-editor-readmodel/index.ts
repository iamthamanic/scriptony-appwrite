/**
 * Appwrite function entrypoint: scriptony-editor-readmodel.
 *
 * T12: Read-only Editor View-Model.
 * Aggregiert Project, Structure, Characters, Script Blocks, Shots, Clips,
 * Assets, Scene Audio Tracks und Style Summary.
 *
 * Verboten: Schreiboperationen, Provider-Calls, Job-Erstellung.
 */

import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
} from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import editorStateHandler from "./routes/editor-state";

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
      service: "scriptony-editor-readmodel",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const stateMatch = pathname.match(/^\/editor\/projects\/([^/]+)\/state$/);
  if (stateMatch && req.method === "GET") {
    await editorStateHandler(
      withParams(req, { projectId: stateMatch[1] }),
      res,
    );
    return;
  }

  sendNotFound(
    res,
    `Route not found in scriptony-editor-readmodel: ${pathname}`,
  );
}

export default createAppwriteHandler(dispatch);
