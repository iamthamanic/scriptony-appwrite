/**
 * Script CRUD routes for scriptony-script.
 */

import { Hono } from "hono";
import { Client, Databases, Query } from "node-appwrite";
import process from "node:process";
import {
  canEditProject,
  canReadProject,
} from "../_shared/access";
import {
  createScriptSchema,
  updateScriptSchema,
} from "../_shared/validation";
import { requireAuthenticatedUser } from "../../_shared/auth";

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
const COLLECTION = "scripts";

const router = new Hono();

// GET /scripts?project_id=...
router.get("/", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.query("project_id");
  if (!projectId) return c.json({ error: "project_id is required" }, 400);

  const ok = await canReadProject(user.id, projectId);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const docs = await databases.listDocuments(DB_ID, COLLECTION, [
    Query.equal("project_id", projectId),
    Query.orderDesc("$updatedAt"),
  ]);

  return c.json({ scripts: docs.documents });
});

// GET /scripts/by-project/:projectId
router.get("/by-project/:projectId", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  const ok = await canReadProject(user.id, projectId);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const docs = await databases.listDocuments(DB_ID, COLLECTION, [
    Query.equal("project_id", projectId),
    Query.orderDesc("$updatedAt"),
  ]);

  return c.json({ scripts: docs.documents });
});

// POST /scripts
router.post("/", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const parsed = createScriptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const data = parsed.data;
  const ok = await canEditProject(user.id, data.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const doc = await databases.createDocument(DB_ID, COLLECTION, "unique()", {
    ...data,
    user_id: user.id,
    revision: 0,
  });

  return c.json({ script: doc }, 201);
});

// GET /scripts/:id
router.get("/:id", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const doc = await databases.getDocument(DB_ID, COLLECTION, id).catch(
    () => null,
  );
  if (!doc) return c.json({ error: "Script not found" }, 404);

  const ok = await canReadProject(user.id, doc.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  return c.json({ script: doc });
});

// PATCH /scripts/:id
router.patch("/:id", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await databases.getDocument(DB_ID, COLLECTION, id).catch(
    () => null,
  );
  if (!existing) return c.json({ error: "Script not found" }, 404);

  const ok = await canEditProject(user.id, existing.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = updateScriptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const update = parsed.data;
  const revision = typeof update.revision === "number"
    ? update.revision + 1
    : (existing.revision ?? 0) + 1;

  const doc = await databases.updateDocument(DB_ID, COLLECTION, id, {
    ...update,
    revision,
  });

  return c.json({ script: doc });
});

// DELETE /scripts/:id
router.delete("/:id", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await databases.getDocument(DB_ID, COLLECTION, id).catch(
    () => null,
  );
  if (!existing) return c.json({ error: "Script not found" }, 404);

  const ok = await canEditProject(user.id, existing.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  await databases.deleteDocument(DB_ID, COLLECTION, id);

  // Cascade delete blocks
  const blocks = await databases.listDocuments(DB_ID, "script_blocks", [
    Query.equal("script_id", id),
  ]);
  for (const block of blocks.documents) {
    await databases.deleteDocument(DB_ID, "script_blocks", block.$id);
  }

  return c.json({ success: true }, 204);
});

export default router;
