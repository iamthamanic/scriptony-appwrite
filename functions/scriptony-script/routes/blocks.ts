/**
 * Script Block direct routes for scriptony-script.
 * Mounted under /script-blocks.
 */

import { Hono } from "hono";
import { Client, Databases } from "node-appwrite";
import process from "node:process";
import { canEditProject, canReadProject } from "../_shared/access";
import { authMiddleware } from "../_shared/hono-auth";
import { reorderBlockSchema, updateBlockSchema } from "../_shared/validation";
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
const BLOCKS_COLLECTION = "script_blocks";

const router = new Hono();

// Apply auth middleware to all routes
router.use("*", authMiddleware);

// GET /script-blocks/:id
router.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const doc = await databases
    .getDocument(DB_ID, BLOCKS_COLLECTION, id)
    .catch(() => null);
  if (!doc) return c.json({ error: "Block not found" }, 404);

  const ok = await canReadProject(user.id, doc.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  return c.json({ block: doc });
});

// PATCH /script-blocks/:id
router.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const existing = await databases
    .getDocument(DB_ID, BLOCKS_COLLECTION, id)
    .catch(() => null);
  if (!existing) return c.json({ error: "Block not found" }, 404);

  const ok = await canEditProject(user.id, existing.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = updateBlockSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const data = parsed.data;

  // Prevent cross-project script_id reassignment
  if (data.script_id && data.script_id !== existing.script_id) {
    const script = await databases
      .getDocument(DB_ID, "scripts", data.script_id)
      .catch(() => null);
    if (!script || script.project_id !== existing.project_id) {
      return c.json(
        { error: "script_id does not belong to same project" },
        400,
      );
    }
  }

  if (data.node_id) {
    const nodeValid = await validateNodeInProject(
      data.node_id,
      existing.project_id,
    );
    if (!nodeValid) {
      return c.json({ error: "node_id does not belong to project" }, 400);
    }
  }

  if (data.speaker_character_id) {
    const charValid = await validateCharacterInProject(
      data.speaker_character_id,
      existing.project_id,
    );
    if (!charValid) {
      return c.json(
        { error: "speaker_character_id does not belong to project" },
        400,
      );
    }
  }

  // Optimistic concurrency check
  if (typeof data.expected_revision === "number") {
    const current = existing.revision ?? 0;
    if (current !== data.expected_revision) {
      return c.json(
        {
          error: "Conflict: block has been modified",
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

  const doc = await databases.updateDocument(DB_ID, BLOCKS_COLLECTION, id, {
    ...update,
    revision,
  });

  return c.json({ block: doc });
});

// DELETE /script-blocks/:id
router.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const existing = await databases
    .getDocument(DB_ID, BLOCKS_COLLECTION, id)
    .catch(() => null);
  if (!existing) return c.json({ error: "Block not found" }, 404);

  const ok = await canEditProject(user.id, existing.project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  await databases.deleteDocument(DB_ID, BLOCKS_COLLECTION, id);

  return c.body(null, 204);
});

// POST /script-blocks/reorder
router.post("/reorder", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const parsed = reorderBlockSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const { project_id, script_id, block_ids } = parsed.data;
  const ok = await canEditProject(user.id, project_id);
  if (!ok) return c.json({ error: "Project not found or access denied" }, 404);

  const updated: unknown[] = [];
  for (let i = 0; i < block_ids.length; i++) {
    const blockId = block_ids[i];
    const existing = await databases
      .getDocument(DB_ID, BLOCKS_COLLECTION, blockId)
      .catch(() => null);
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

export default router;
