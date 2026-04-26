/**
 * Appwrite Function Entry: scriptony-audio-story (Node.js)
 * Hörbuch/Hörspiel Audio Production Management
 * - Recording Sessions
 * - Audio Tracks (Dialog/Musik/SFX/Atmo)
 * - Voice Casting (Human/TTS)
 * - Stem Mixing & Export
 */

import {
  createAppwriteHandler,
  getPathname,
  sendRouteNotFound,
  withParams,
} from "../_shared/appwrite-handler";
import type { RequestLike, ResponseLike } from "../_shared/http";

// Import route handlers
import sessionsHandler from "./routes/sessions";
import tracksHandler from "./routes/tracks";
import voicesHandler from "./routes/voices";
import mixingHandler from "./routes/mixing";
import audioProductionHandler from "./routes/audio-production";

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  // Health check
  if (pathname === "/" || pathname === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "ok",
        service: "scriptony-audio-story",
        version: "1.0.0",
        message: "Hörspiel Audio Production API",
        endpoints: {
          sessions: "/sessions - Recording Sessions",
          tracks: "/tracks - Audio Track Management",
          voices: "/voices - Voice Casting & TTS",
          mixing: "/mixing - Stem Mixing & Export",
          audioProduction: "/audio-production - T08 Orchestration",
        },
      }),
    );
    return;
  }

  // Sessions routes
  if (pathname.startsWith("/sessions")) {
    await sessionsHandler(req, res);
    return;
  }

  // Tracks routes
  if (pathname.startsWith("/tracks")) {
    await tracksHandler(req, res);
    return;
  }

  // Voices routes
  if (pathname.startsWith("/voices")) {
    await voicesHandler(req, res);
    return;
  }

  // Mixing routes
  if (pathname.startsWith("/mixing")) {
    await mixingHandler(req, res);
    return;
  }

  // Audio Production Orchestration (T08)
  if (pathname.startsWith("/audio-production")) {
    await audioProductionHandler(req, res);
    return;
  }

  sendRouteNotFound("scriptony-audio-story", req, res);
}

export default createAppwriteHandler(dispatch);
