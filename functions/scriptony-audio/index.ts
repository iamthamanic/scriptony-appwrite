/**
 * Appwrite function entrypoint: scriptony-audio.
 *
 * Verantwortung (T07):
 *   Technische Audio-Engine: TTS, STT, Voice Discovery, Audio-Uploads.
 *   Audio-Production-Planung ist VERBOTEN hier — gehoert zu scriptony-audio-production.
 *
 * Verantwortung (T09):
 *   Shot-Audio-Routen sind LEGACY — Asset-/Timeline-Kontext.
 *   Neue Shot-Audio-Uploads sollten ueber scriptony-assets laufen.
 */

import "../_shared/fetch-polyfill";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import { dispatchHonoApp } from "../_shared/hono-appwrite-handler";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
} from "../_shared/http";
import shotAudioHandler from "./shots/[id]/audio";
import uploadAudioHandler from "./shots/[id]/upload-audio";
import shotAudioItemHandler from "./shots/audio/[id]";
import shotAudioBatchHandler from "./shots/audio/batch";
import { app as sttApp } from "./stt";
import { app as ttsApp } from "./tts";

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

function withPath(req: RequestLike, path: string): RequestLike {
  req.path = path;
  req.url = path;
  return req;
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-audio",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const uploadMatch = pathname.match(/^\/shots\/([^/]+)\/upload-audio$/);
  if (uploadMatch) {
    await uploadAudioHandler(withParams(req, { id: uploadMatch[1] }), res);
    return;
  }

  const shotAudioMatch = pathname.match(/^\/shots\/([^/]+)\/audio$/);
  if (shotAudioMatch) {
    await shotAudioHandler(withParams(req, { id: shotAudioMatch[1] }), res);
    return;
  }

  if (pathname === "/shots/audio/batch") {
    await shotAudioBatchHandler(req, res);
    return;
  }

  const shotAudioItemMatch = pathname.match(/^\/shots\/audio\/([^/]+)$/);
  if (shotAudioItemMatch) {
    await shotAudioItemHandler(
      withParams(req, { id: shotAudioItemMatch[1] }),
      res,
    );
    return;
  }

  if (pathname === "/stt" || pathname.startsWith("/stt/")) {
    const forwardedPath =
      pathname === "/stt" ? "/" : pathname.slice("/stt".length) || "/";
    await dispatchHonoApp(sttApp, withPath(req, forwardedPath), {
      json: (body, status) => res.status(status || 200).json(body),
      text: (text, status) => res.status(status || 200).end(text),
    });
    return;
  }

  if (pathname === "/tts" || pathname.startsWith("/tts/")) {
    const forwardedPath =
      pathname === "/tts" ? "/" : pathname.slice("/tts".length) || "/";
    await dispatchHonoApp(ttsApp, withPath(req, forwardedPath), {
      json: (body, status) => res.status(status || 200).json(body),
      text: (text, status) => res.status(status || 200).end(text),
    });
    return;
  }

  sendNotFound(res, `Route not found in scriptony-audio: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
