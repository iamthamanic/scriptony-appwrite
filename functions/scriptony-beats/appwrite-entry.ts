import { createAppwriteHandler, getPathname, sendRouteNotFound, withParams } from "../_shared/appwrite-handler";
import healthHandler from "./health";
import beatsHandler from "./beats/index";
import beatByIdHandler from "./beats/[id]";
import type { RequestLike, ResponseLike } from "../_shared/http";

async function dispatch(req: RequestLike, res: ResponseLike) {
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

  sendRouteNotFound("scriptony-beats", req, res);
}

export default createAppwriteHandler(dispatch);
