/**
 * scriptony-script — Appwrite Function Entrypoint
 *
 * Routes:
 *   GET  /scripts?project_id=...
 *   GET  /scripts/by-project/:projectId
 *   POST /scripts
 *   GET  /scripts/:id
 *   PATCH /scripts/:id
 *   DELETE /scripts/:id
 *   GET  /scripts/:id/blocks
 *   POST /scripts/:id/blocks
 *   GET  /script-blocks/:id
 *   PATCH /script-blocks/:id
 *   DELETE /script-blocks/:id
 *   POST /script-blocks/reorder
 *   GET  /nodes/:nodeId/script-blocks?project_id=...
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { createHonoAppwriteHandler } from "../_shared/hono-appwrite-handler";
import scriptsRouter from "./routes/scripts";
import blocksRouter from "./routes/blocks";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Appwrite-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    maxAge: 600,
  }),
);

// Health check
app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "scriptony-script",
    provider: "appwrite",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "scriptony-script" });
});

// Mount routers
app.route("/scripts", scriptsRouter);
app.route("/script-blocks", blocksRouter);

export default createHonoAppwriteHandler(app);
