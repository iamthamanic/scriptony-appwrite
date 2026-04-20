/**
 * Appwrite function entrypoint for the projects service.
 *
 * Routes incoming HTTP paths to existing handlers in this folder.
 * Location: functions/scriptony-projects/index.ts
 */

import healthHandler from "./health";
import projectsHandler from "./projects/index";
import projectByIdHandler from "./projects/[id]";
import projectUploadImageHandler from "./projects/[id]/upload-image";
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
    // keep fallback below
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

  if (pathname === "/projects") {
    await projectsHandler(req, res);
    return;
  }

  const uploadMatch = pathname.match(/^\/projects\/([^/]+)\/upload-image$/);
  if (uploadMatch) {
    await projectUploadImageHandler(
      withParams(req, { id: uploadMatch[1] }),
      res,
    );
    return;
  }

  const byIdMatch = pathname.match(/^\/projects\/([^/]+)$/);
  if (byIdMatch) {
    await projectByIdHandler(withParams(req, { id: byIdMatch[1] }), res);
    return;
  }

  sendNotFound(res, `Route not found in scriptony-projects: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
