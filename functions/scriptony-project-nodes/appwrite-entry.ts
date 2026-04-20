import {
  createAppwriteHandler,
  getPathname,
  sendRouteNotFound,
  withParams,
} from "../_shared/appwrite-handler";
import { type RequestLike, type ResponseLike, sendJson } from "../_shared/http";
import initializeProjectHandler from "./initialize-project";
import nodesHandler from "./nodes/index";
import nodeByIdHandler from "./nodes/[id]";
import nodeChildrenHandler from "./nodes/[id]/children";
import nodePathHandler from "./nodes/[id]/path";
import nodesBatchLoadHandler from "./nodes/batch-load";
import nodesBulkHandler from "./nodes/bulk";
import nodesReorderHandler from "./nodes/reorder";
import nodesUltraBatchLoadHandler from "./nodes/ultra-batch-load";

async function dispatch(req: RequestLike, res: ResponseLike) {
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
    await nodesBatchLoadHandler(req, res);
    return;
  }
  if (pathname === "/nodes/ultra-batch-load") {
    await nodesUltraBatchLoadHandler(req, res);
    return;
  }
  if (pathname === "/nodes/bulk") {
    await nodesBulkHandler(req, res);
    return;
  }
  if (pathname === "/nodes/reorder") {
    await nodesReorderHandler(req, res);
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

  sendRouteNotFound("scriptony-project-nodes", req, res);
}

export default createAppwriteHandler(dispatch);
