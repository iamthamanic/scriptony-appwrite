import {
  createAppwriteHandler,
  getPathname,
  sendRouteNotFound,
  withParams,
} from "../_shared/appwrite-handler";
import { type RequestLike, type ResponseLike, sendJson } from "../_shared/http";
import timelineCharactersHandler from "./timeline-characters/index";
import timelineCharacterByIdHandler from "./timeline-characters/[id]";

async function dispatch(req: RequestLike, res: ResponseLike) {
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
  if (pathname === "/characters" || pathname === "/timeline-characters") {
    await timelineCharactersHandler(req, res);
    return;
  }

  const byIdMatch = pathname.match(
    /^\/(?:characters|timeline-characters)\/([^/]+)$/,
  );
  if (byIdMatch) {
    await timelineCharacterByIdHandler(
      withParams(req, { id: byIdMatch[1] }),
      res,
    );
    return;
  }

  sendRouteNotFound("scriptony-characters", req, res);
}

export default createAppwriteHandler(dispatch);
