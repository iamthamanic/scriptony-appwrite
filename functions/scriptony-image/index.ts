/**
 * Appwrite function entrypoint: scriptony-image (image key validation + cover generation).
 */

import "../_shared/fetch-polyfill";
import imageValidateKeyHandler from "./ai/image-validate-key";
import imageGenerateCoverHandler from "./ai/image-generate-cover";
import imageSettingsHandler from "./ai/image-settings";
import { sendJson, sendNotFound, type RequestLike, type ResponseLike } from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";

function getPathname(req: RequestLike): string {
  const direct = (typeof req?.path === "string" && req.path) || (typeof req?.url === "string" && req.url) || "/";
  try {
    if (direct.startsWith("http://") || direct.startsWith("https://")) return new URL(direct).pathname || "/";
  } catch {
    /* fallback */
  }
  const q = direct.indexOf("?");
  return q >= 0 ? direct.slice(0, q) : direct;
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-image",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (pathname === "/ai/image/validate-key") {
    await imageValidateKeyHandler(req, res);
    return;
  }

  if (pathname === "/ai/image/settings") {
    await imageSettingsHandler(req, res);
    return;
  }

  if (pathname === "/ai/image/generate-cover") {
    await imageGenerateCoverHandler(req, res);
    return;
  }

  sendNotFound(res, `Route not found in scriptony-image: ${pathname}`);
}

export default createAppwriteHandler(dispatch);

