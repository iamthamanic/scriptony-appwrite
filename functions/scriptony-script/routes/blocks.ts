/**
 * Script Block CRUD + Reorder routes for scriptony-script.
 */

import { Hono } from "hono";
import { Client, Databases, Query } from "node-appwrite";
import process from "node:process";
import {
  canEditProject,
  canReadProject,
} from "../_shared/access";
import {
  createBlockSchema,
  reorderBlockSchema,
  updateBlockSchema,
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
const BLOCKS_COLLECTION = "script_blocks";

const router = new Hono();

// GET /scripts/:id/blocks
router.get("/scripts/:id/blocks", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const scriptId = c.req.param("id");
  const script = await databases.getDocument(DB_ID, "scripts", scriptId).catch(
    () => null,
  );
  if (!script) return c.json({ error: "Script not found" }, 404);

  const ok = await canReadProject(user.id, script.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const docs = await databases.listDocuments(DB_ID, BLOCKS_COLLECTION, [
    Query.equal("script_id", scriptId),
    Query.orderAsc("order_index"),
  ]);

  return c.json({ blocks: docs.documents });
});

// POST /scripts/:id/blocks
router.post("/scripts/:id/blocks", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const scriptId = c.req.param("id");
  const script = await databases.getDocument(DB_ID, "scripts", scriptId).catch(
    () => null,
  );
  if (!script) return c.json({ error: "Script not found" }, 404);

  const ok = await canEditProject(user.id, script.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = createBlockSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const data = parsed.data;
  const doc = await databases.createDocument(
    DB_ID,
    BLOCKS_COLLECTION,
    "unique()",
    {
      ...data,
      script_id: scriptId,
      revision: 0,
    },
  );

  return c.json({ block: doc }, 201);
});

// GET /script-blocks/:id
router.get("/:id", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const doc = await databases.getDocument(DB_ID, BLOCKS_COLLECTION, id).catch(
    () => null,
  );
  if (!doc) return c.json({ error: "Block not found" }, 404);

  const ok = await canReadProject(user.id, doc.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  return c.json({ block: doc });
});

// PATCH /script-blocks/:id
router.patch("/:id", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await databases.getDocument(
    DB_ID,
    BLOCKS_COLLECTION,
    id,
  ).catch(() => null);
  if (!existing) return c.json({ error: "Block not found" }, 404);

  const ok = await canEditProject(user.id, existing.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = updateBlockSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const update = parsed.data;
  const revision = typeof update.revision === "number"
    ? update.revision + 1
    : (existing.revision ?? 0) + 1;

  const doc = await databases.updateDocument(DB_ID, BLOCKS_COLLECTION, id, {
    ...update,
    revision,
  });

  return c.json({ block: doc });
});

// DELETE /script-blocks/:id
router.delete("/:id", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await databases.getDocument(
    DB_ID,
    BLOCKS_COLLECTION,
    id,
  ).catch(() => null);
  if (!existing) return c.json({ error: "Block not found" }, 404);

  const ok = await canEditProject(user.id, existing.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  await databases.deleteDocument(DB_ID, BLOCKS_COLLECTION, id);

  return c.json({ success: true }, 204);
});

// POST /script-blocks/reorder
router.post("/reorder", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const parsed = reorderBlockSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const { project_id, script_id, block_ids } = parsed.data;
  const ok = await canEditProject(user.id, project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const updated: any[] = [];
  for (let i = 0; i < block_ids.length; i++) {
    const blockId = block_ids[i];
    const existing = await databases.getDocument(
      DB_ID,
      BLOCKS_COLLECTION,
      blockId,
    ).catch(() => null);
    if (!existing) continue;
    if (existing.project_id !== project_id) continue;
    if (script_id && existing.script_id !== script_id) continue;

    const doc = await databases.updateDocument(
      DB_ID,
      BLOCKS_COLLECTION,
      blockId,
      { order_index: i },
    );
    updated.push(doc);
  }

  return c.json({ blocks: updated });
});

// GET /nodes/:nodeId/script-blocks
router.get("/nodes/:nodeId/script-blocks", async (c) => {
  const user = await requireAuthenticatedUser(c.req.raw as any);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const nodeId = c.req.param("nodeId");
  const projectId = c.req.query("project_id");
  if (!projectId) return c.json({ error: "project_id is required" }, 400);

  const ok = await canReadProject(user.id, projectId);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const docs = await databases.listDocuments(DB_ID, BLOCKS_COLLECTION, [
    Query.equal("node_id", nodeId),
    Query.equal("project_id", projectId),
    Query.orderAsc("order_index"),
  ]);

  return c.json({ blocks: docs.documents });
});

export default router;
