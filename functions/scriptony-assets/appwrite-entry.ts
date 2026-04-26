/**
 * scriptony-assets — Asset-Metadaten API (T06)
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAppwriteHandler, authMiddleware } from "./_shared/hono-auth";
import assetsRouter from "./routes/assets";

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

app.get("/health", (c) =>
  c.json({ status: "ok", service: "scriptony-assets" }),
);

app.use("/assets/*", authMiddleware);
app.route("/assets", assetsRouter);

export default createAppwriteHandler(app);
