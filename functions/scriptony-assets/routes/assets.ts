/**
 * Asset CRUD + Upload/Link/Query API.
 * KISS: Base64 upload via JSON body; no multipart complexity.
 * SOLID: StorageAdapter abstracts physical provider.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Databases, ID, Query } from "node-appwrite";
import { getDatabases, dbId } from "../../_shared/appwrite-db";
import { makeFileLike } from "../../_shared/storage";
import {
  canEditProject,
  canManageProject,
  canReadProject,
} from "../_shared/access";
import {
  createAssetSchema,
  linkAssetSchema,
  updateAssetSchema,
  isValidCombination,
  formatMatrixViolation,
} from "../_shared/validation";
import { createAppwriteStorageAdapter } from "../_shared/storage-adapter";
import { z } from "zod";

const assetsRouter = new Hono();
const storage = createAppwriteStorageAdapter();

function createAssetDoc(
  data: Record<string, unknown>,
  fileId: string,
  size: number,
  mimeType: string,
  bucketId: string,
  userId: string,
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    project_id: data.project_id,
    // created_by ist das einzige User-Referenzfeld. Kein user_id – DRY:
    // created_by genügt und vermeidet Redundanz.
    created_by: userId,
    owner_type: data.owner_type ?? "project",
    owner_id: data.owner_id ?? data.project_id,
    media_type: data.media_type ?? "document",
    purpose: data.purpose ?? "attachment",
    file_id: fileId,
    bucket_id: bucketId,
    filename: data.fileName,
    mime_type: mimeType,
    size,
    // width/height/duration: Upload extrahiert sie nicht aus der Datei.
    // Ein separater PATCH setzt sie, sobald Medien-Analyse verfügbar ist.
    width: null,
    height: null,
    duration: null,
    status: "active",
    metadata:
      typeof data.metadata === "string" && data.metadata.length > 0
        ? data.metadata
        : "{}",
    created_at: now,
    updated_at: now,
  };
}

function formatZodError(error: z.ZodError<unknown>): string {
  return error.issues
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join("; ");
}

/**
 * Fetch asset, verify it exists, and check user permission.
 * DRY-extracted: used in 5 handlers (GET, PATCH, DELETE, link, unlink).
 */
async function getAssetForUser(
  id: string,
  userId: string,
  permission: "read" | "edit" | "manage",
): Promise<Record<string, unknown>> {
  const database = await getDatabases();
  const asset = await database
    .getDocument(dbId(), "assets", id)
    .catch(() => null);
  if (!asset) {
    throw new HTTPException(404, { message: "Asset not found" });
  }

  const projectId = String(asset.project_id);
  const allowed =
    permission === "manage"
      ? await canManageProject(userId, projectId)
      : permission === "edit"
        ? await canEditProject(userId, projectId)
        : await canReadProject(userId, projectId);

  if (!allowed) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  return asset;
}

// POST /assets/upload
assetsRouter.post("/upload", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, { message: formatZodError(parsed.error) });
  }

  const data = parsed.data;
  if (!(await canEditProject(user.id, data.project_id))) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  // Build File-like object from Base64 via shared helper (DRY)
  const fileBuffer = Buffer.from(data.fileBase64, "base64");
  const file = makeFileLike(fileBuffer, data.fileName, data.mimeType);

  const bucketKind =
    data.media_type === "image"
      ? "projectImages"
      : data.media_type === "audio"
        ? "audioFiles"
        : "general";

  const uploaded = await storage.upload(file, bucketKind, data.fileName);

  const database = await getDatabases();
  const doc = createAssetDoc(
    data,
    uploaded.id,
    uploaded.size,
    uploaded.mimeType,
    uploaded.bucketId,
    user.id,
  );
  const created = await database.createDocument(
    dbId(),
    "assets",
    ID.unique(),
    doc,
  );

  return c.json({ success: true, data: created }, 201);
});

// GET /assets/:id
assetsRouter.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const asset = await getAssetForUser(id, user.id, "read");
  return c.json({ success: true, data: asset });
});

// PATCH /assets/:id
assetsRouter.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const asset = await getAssetForUser(id, user.id, "edit");

  const body = await c.req.json().catch(() => ({}));
  const parsed = updateAssetSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: formatZodError(parsed.error),
    });
  }

  const data = parsed.data;

  // Validate owner_type / media_type / purpose combination against merged values
  if (
    data.owner_type !== undefined ||
    data.media_type !== undefined ||
    data.purpose !== undefined
  ) {
    const effectiveOwnerType =
      typeof data.owner_type === "string"
        ? data.owner_type
        : typeof asset.owner_type === "string"
          ? asset.owner_type
          : undefined;
    const effectiveMediaType =
      typeof data.media_type === "string"
        ? data.media_type
        : typeof asset.media_type === "string"
          ? asset.media_type
          : undefined;
    const effectivePurpose =
      typeof data.purpose === "string"
        ? data.purpose
        : typeof asset.purpose === "string"
          ? asset.purpose
          : undefined;
    if (
      !isValidCombination(
        effectiveOwnerType,
        effectiveMediaType,
        effectivePurpose,
      )
    ) {
      throw new HTTPException(400, {
        message: formatMatrixViolation(
          effectiveOwnerType,
          effectiveMediaType,
          effectivePurpose,
        ),
      });
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (data.owner_type !== undefined) updatePayload.owner_type = data.owner_type;
  if (data.owner_id !== undefined) updatePayload.owner_id = data.owner_id;
  if (data.media_type !== undefined) updatePayload.media_type = data.media_type;
  if (data.purpose !== undefined) updatePayload.purpose = data.purpose;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.metadata !== undefined) updatePayload.metadata = data.metadata;
  updatePayload.updated_at = new Date().toISOString();

  const database = await getDatabases();
  const updated = await database.updateDocument(
    dbId(),
    "assets",
    id,
    updatePayload,
  );

  return c.json({ success: true, data: updated });
});

// DELETE /assets/:id
assetsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await getAssetForUser(id, user.id, "manage");

  const database = await getDatabases();
  await database.deleteDocument(dbId(), "assets", id);
  return c.body(null, 204);
});

// GET /assets/by-owner/:ownerType/:ownerId
assetsRouter.get("/by-owner/:ownerType/:ownerId", async (c) => {
  const user = c.get("user");
  const ownerType = c.req.param("ownerType");
  const ownerId = c.req.param("ownerId");
  const projectId = c.req.query("project_id");

  if (!projectId) {
    throw new HTTPException(400, { message: "project_id required" });
  }
  if (!(await canReadProject(user.id, projectId))) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const database = await getDatabases();
  const { documents } = await database.listDocuments(dbId(), "assets", [
    Query.equal("owner_type", ownerType),
    Query.equal("owner_id", ownerId),
    Query.equal("project_id", projectId),
  ]);

  return c.json({ success: true, data: documents });
});

// GET /assets/by-project/:projectId
assetsRouter.get("/by-project/:projectId", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("projectId");

  if (!(await canReadProject(user.id, projectId))) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const database = await getDatabases();
  const { documents } = await database.listDocuments(dbId(), "assets", [
    Query.equal("project_id", projectId),
  ]);

  return c.json({ success: true, data: documents });
});

// POST /assets/:id/link
assetsRouter.post("/:id/link", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await getAssetForUser(id, user.id, "edit");

  const body = await c.req.json().catch(() => ({}));
  const parsed = linkAssetSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: formatZodError(parsed.error),
    });
  }

  const { owner_type, owner_id } = parsed.data;
  const database = await getDatabases();
  const updated = await database.updateDocument(dbId(), "assets", id, {
    owner_type,
    owner_id,
    updated_at: new Date().toISOString(),
  });

  return c.json({ success: true, data: updated });
});

// POST /assets/:id/unlink
assetsRouter.post("/:id/unlink", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await getAssetForUser(id, user.id, "edit");

  const database = await getDatabases();
  const updated = await database.updateDocument(dbId(), "assets", id, {
    owner_type: null,
    owner_id: null,
    updated_at: new Date().toISOString(),
  });

  return c.json({ success: true, data: updated });
});

// GET /assets?project_id=...
assetsRouter.get("/", async (c) => {
  const user = c.get("user");
  const projectId = c.req.query("project_id");

  if (!projectId) {
    throw new HTTPException(400, { message: "project_id required" });
  }
  if (!(await canReadProject(user.id, projectId))) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const database = await getDatabases();
  const ownerType = c.req.query("owner_type");
  const mediaType = c.req.query("media_type");

  const queries = [Query.equal("project_id", projectId)];
  if (ownerType) queries.push(Query.equal("owner_type", ownerType));
  if (mediaType) queries.push(Query.equal("media_type", mediaType));

  const { documents } = await database.listDocuments(dbId(), "assets", queries);
  return c.json({ success: true, data: documents });
});

export default assetsRouter;
