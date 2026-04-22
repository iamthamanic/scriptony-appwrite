/**
 * Hörspiel Audio Production API
 * Strategy-Pattern Implementation für Audio-Projekte
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireAuthenticatedUser } from "../_shared/auth.ts";
import sessionsRouter from "./routes/sessions.ts";
import tracksRouter from "./routes/tracks.ts";
import voicesRouter from "./routes/voices.ts";
import mixingRouter from "./routes/mixing.ts";

export const app = new Hono();

// CORS Middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Appwrite-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Auth Middleware
app.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const user = await requireAuthenticatedUser({
      headers: { authorization: authHeader },
    });
    c.set("user", user);
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
});

// Root Info
app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "scriptony-audio-story",
    message: "Hörspiel Audio Production API",
    endpoints: {
      sessions: "/sessions - Recording Sessions",
      tracks: "/tracks - Audio Track Management",
      voices: "/voices - Voice Casting & TTS",
      mixing: "/mixing - Stem Mixing & Export",
    },
  });
});

// Mount Routes
app.route("/sessions", sessionsRouter);
app.route("/tracks", tracksRouter);
app.route("/voices", voicesRouter);
app.route("/mixing", mixingRouter);

export default app;
