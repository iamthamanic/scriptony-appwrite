import {
  createAppwriteHandler,
  getPathname,
  sendRouteNotFound,
  withParams,
} from "../_shared/appwrite-handler";
import { type RequestLike, type ResponseLike, sendJson } from "../_shared/http";
import shotsHandler from "./shots/index";
import shotsBySceneHandler from "./shots/[sceneId]";
import shotByIdHandler from "./shots/by-id/[id]";
import shotUpdateHandler from "./shots/[id]/index";
import shotReorderHandler from "./shots/reorder";
import shotUploadImageHandler from "./shots/[id]/upload-image";
import shotCharactersHandler from "./shots/[id]/characters/index";
import shotCharacterDeleteHandler from "./shots/[id]/characters/[characterId]";

async function dispatch(req: RequestLike, res: ResponseLike) {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-shots",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }
  if (pathname === "/shots") {
    await shotsHandler(req, res);
    return;
  }
  if (pathname === "/shots/reorder") {
    await shotReorderHandler(req, res);
    return;
  }

  const bySceneMatch = pathname.match(/^\/shots\/by-scene\/([^/]+)$/);
  if (bySceneMatch) {
    await shotsBySceneHandler(
      withParams(req, { sceneId: bySceneMatch[1] }),
      res,
    );
    return;
  }
  const uploadMatch = pathname.match(/^\/shots\/([^/]+)\/upload-image$/);
  if (uploadMatch) {
    await shotUploadImageHandler(withParams(req, { id: uploadMatch[1] }), res);
    return;
  }
  const addCharacterMatch = pathname.match(/^\/shots\/([^/]+)\/characters$/);
  if (addCharacterMatch) {
    await shotCharactersHandler(
      withParams(req, { id: addCharacterMatch[1] }),
      res,
    );
    return;
  }
  const removeCharacterMatch = pathname.match(
    /^\/shots\/([^/]+)\/characters\/([^/]+)$/,
  );
  if (removeCharacterMatch) {
    await shotCharacterDeleteHandler(
      withParams(req, {
        id: removeCharacterMatch[1],
        characterId: removeCharacterMatch[2],
      }),
      res,
    );
    return;
  }
  const byIdMatch = pathname.match(/^\/shots\/by-id\/([^/]+)$/);
  if (byIdMatch) {
    await shotByIdHandler(withParams(req, { id: byIdMatch[1] }), res);
    return;
  }
  const shotMatch = pathname.match(/^\/shots\/([^/]+)$/);
  if (shotMatch) {
    await shotUpdateHandler(withParams(req, { id: shotMatch[1] }), res);
    return;
  }

  sendRouteNotFound("scriptony-shots", req, res);
}

export default createAppwriteHandler(dispatch);
