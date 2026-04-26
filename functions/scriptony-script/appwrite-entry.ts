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
import { Client, Databases, Query } from "node-appwrite";
import process from "node:process";
import { createHonoAppwriteHandler } from "../_shared/hono-appwrite-handler";
import { canReadProject } from "./_shared/access";
import { authMiddleware } from "./_shared/hono-auth";
import { nodeBlocksQuerySchema } from "./_shared/validation";
import { validateNodeInProject } from "./_shared/project-context";
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

// GET /nodes/:nodeId/script-blocks
app.use("/nodes/*", authMiddleware);
app.get("/nodes/:nodeId/script-blocks", async (c) => {
  const user = c.get("user");
  const nodeId = c.req.param("nodeId");
  const projectId = c.req.query("project_id");

  const parsed = nodeBlocksQuerySchema.safeParse({
    nodeId,
    project_id: projectId,
  });
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const ok = await canReadProject(user.id, parsed.data.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  // Validate node belongs to project
  const nodeValid = await validateNodeInProject(
    parsed.data.nodeId,
    parsed.data.project_id,
  );
  if (!nodeValid) {
    return c.json({ error: "node_id does not belong to project" }, 400);
  }

  const client = new Client()
    .setEndpoint(
      process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
        process.env.APPWRITE_ENDPOINT ||
        "",
    )
    .setProject(
      process.env.APPWRITE_FUNCTION_PROJECT_ID ||
        process.env.APPWRITE_PROJECT_ID ||
        "",
    )
    .setKey(process.env.APPWRITE_API_KEY || "");
  const databases = new Databases(client);
  const DB_ID = process.env.APPWRITE_DATABASE_ID || "scriptony";

  const docs = await databases.listDocuments(DB_ID, "script_blocks", [
    Query.equal("node_id", parsed.data.nodeId),
    Query.equal("project_id", parsed.data.project_id),
    Query.orderAsc("order_index"),
  ]);

  return c.json({ blocks: docs.documents });
});

export default createHonoAppwriteHandler(app);
