/**
 * Script CRUD routes for scriptony-script.
 */

import { Hono } from "hono";
import { Client, Databases, Query } from "node-appwrite";
import process from "node:process";
import {
  canEditProject,
  canManageProject,
  canReadProject,
} from "../_shared/access";
import { authMiddleware } from "../_shared/hono-auth";
import {
  createBlockSchema,
  createScriptSchema,
  updateScriptSchema,
} from "../_shared/validation";
import {
  validateCharacterInProject,
  validateNodeInProject,
} from "../_shared/project-context";

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
const BLOCKS_COLLECTION = "script_blocks";

const router = new Hono();

// Apply auth middleware to all routes
router.use("*", authMiddleware);

// GET /scripts?project_id=...
router.get("/", async (c) => {
  const user = c.get("user");
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
  const user = c.get("user");
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
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const parsed = createScriptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const data = parsed.data;
  const ok = await canEditProject(user.id, data.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  if (data.node_id) {
    const nodeValid = await validateNodeInProject(
      data.node_id,
      data.project_id,
    );
    if (!nodeValid) {
      return c.json({ error: "node_id does not belong to project" }, 400);
    }
  }

  const doc = await databases.createDocument(DB_ID, COLLECTION, "unique()", {
    ...data,
    user_id: user.id,
    revision: 0,
  });

  return c.json({ script: doc }, 201);
});

// GET /scripts/:id
router.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const doc = await databases
    .getDocument(DB_ID, COLLECTION, id)
    .catch(() => null);
  if (!doc) return c.json({ error: "Script not found" }, 404);

  const ok = await canReadProject(user.id, doc.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  return c.json({ script: doc });
});

// PATCH /scripts/:id
router.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const existing = await databases
    .getDocument(DB_ID, COLLECTION, id)
    .catch(() => null);
  if (!existing) return c.json({ error: "Script not found" }, 404);

  const ok = await canEditProject(user.id, existing.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = updateScriptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const data = parsed.data;

  if (data.node_id) {
    const nodeValid = await validateNodeInProject(
      data.node_id,
      existing.project_id,
    );
    if (!nodeValid) {
      return c.json({ error: "node_id does not belong to project" }, 400);
    }
  }

  // Optimistic concurrency check
  if (typeof data.expected_revision === "number") {
    const current = existing.revision ?? 0;
    if (current !== data.expected_revision) {
      return c.json(
        {
          error: "Conflict: script has been modified",
          current_revision: current,
          expected_revision: data.expected_revision,
        },
        409,
      );
    }
  }

  // Strip fields that should not be user-updatable
  const { expected_revision: _er, ...update } = data;
  const revision = (existing.revision ?? 0) + 1;

  const doc = await databases.updateDocument(DB_ID, COLLECTION, id, {
    ...update,
    revision,
  });

  return c.json({ script: doc });
});

// DELETE /scripts/:id
router.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const existing = await databases
    .getDocument(DB_ID, COLLECTION, id)
    .catch(() => null);
  if (!existing) return c.json({ error: "Script not found" }, 404);

  const ok = await canManageProject(user.id, existing.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  await databases.deleteDocument(DB_ID, COLLECTION, id);

  // Cascade delete blocks
  const blocks = await databases.listDocuments(DB_ID, BLOCKS_COLLECTION, [
    Query.equal("script_id", id),
  ]);
  for (const block of blocks.documents) {
    await databases.deleteDocument(DB_ID, BLOCKS_COLLECTION, block.$id);
  }

  return c.body(null, 204);
});

// ============================ Script Blocks Sub-Routes ============================

// GET /scripts/:id/blocks
router.get("/:id/blocks", async (c) => {
  const user = c.get("user");
  const scriptId = c.req.param("id");
  const script = await databases
    .getDocument(DB_ID, COLLECTION, scriptId)
    .catch(() => null);
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
router.post("/:id/blocks", async (c) => {
  const user = c.get("user");
  const scriptId = c.req.param("id");
  const script = await databases
    .getDocument(DB_ID, COLLECTION, scriptId)
    .catch(() => null);
  if (!script) return c.json({ error: "Script not found" }, 404);

  const ok = await canEditProject(user.id, script.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = createBlockSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const data = parsed.data;

  if (data.project_id && data.project_id !== script.project_id) {
    return c.json({ error: "project_id mismatch with parent script" }, 400);
  }

  if (data.node_id) {
    const nodeValid = await validateNodeInProject(
      data.node_id,
      script.project_id,
    );
    if (!nodeValid) {
      return c.json({ error: "node_id does not belong to project" }, 400);
    }
  }

  if (data.speaker_character_id) {
    const charValid = await validateCharacterInProject(
      data.speaker_character_id,
      script.project_id,
    );
    if (!charValid) {
      return c.json(
        { error: "speaker_character_id does not belong to project" },
        400,
      );
    }
  }

  const doc = await databases.createDocument(
    DB_ID,
    BLOCKS_COLLECTION,
    "unique()",
    {
      ...data,
      project_id: script.project_id,
      script_id: scriptId,
      user_id: user.id,
      revision: 0,
    },
  );

  return c.json({ block: doc }, 201);
});

export default router;
