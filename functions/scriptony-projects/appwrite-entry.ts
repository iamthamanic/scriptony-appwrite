import {
  createAppwriteHandler,
  getPathname,
  sendRouteNotFound,
  withParams,
} from "../_shared/appwrite-handler";
import healthHandler from "./health";
import projectsHandler from "./projects/index";
import projectByIdHandler from "./projects/[id]";
import projectUploadImageHandler from "./projects/[id]/upload-image";
import type { RequestLike, ResponseLike } from "../_shared/http";

async function dispatch(req: RequestLike, res: ResponseLike) {
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

  sendRouteNotFound("scriptony-projects", req, res);
}

export default createAppwriteHandler(dispatch);
