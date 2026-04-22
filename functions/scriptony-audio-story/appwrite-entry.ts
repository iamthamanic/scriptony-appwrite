/**
 * Appwrite Function Entry: scriptony-audio-story
 * Hörbuch/Hörspiel Audio Production Management
 * - Recording Sessions
 * - TTS Voice Management
 * - Multi-Track Audio
 * - Stem Mixing & Export
 */

import { createAppwriteHandler } from "../_shared/appwrite-handler.ts";
import { dispatchHonoApp } from "../_shared/hono-appwrite-handler.ts";
import type { RequestLike, ResponseLike } from "../_shared/http.ts";
import { app } from "./index.ts";

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  // Health check vor dem Dispatch
  const pathname = typeof req.path === "string"
    ? req.path
    : typeof req.url === "string"
    ? new URL(req.url).pathname
    : "/";

  if (pathname === "/" || pathname === "/health") {
    res.status(200).json({
      status: "ok",
      service: "scriptony-audio-story",
      version: "1.0.0",
      features: [
        "recording-sessions",
        "audio-tracks",
        "voice-casting",
        "stem-mixing",
        "chapter-export",
      ],
    });
    return;
  }

  await dispatchHonoApp(app, req, {
    json: (body, status) => res.status(status || 200).json(body),
    text: (text, status) => res.status(status || 200).end(text),
  });
}

export default createAppwriteHandler(dispatch);
