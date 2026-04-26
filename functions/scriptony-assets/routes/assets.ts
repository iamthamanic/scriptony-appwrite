/**
 * Asset CRUD + Upload/Link/Query API.
 * KISS: Base64 upload via JSON body; no multipart complexity.
 * SOLID: StorageAdapter abstracts physical provider.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Databases, ID, Query } from "node-appwrite";
import { getDatabases, dbId } from "../../_shared/appwrite-db";
import {
  canEditProject,
  canManageProject,
  canReadProject,
} from "../_shared/access";
import {
  createAssetSchema,
  linkAssetSchema,
  updateAssetSchema,
} from "../_shared/validation";
import { getDefaultStorageAdapter } from "../_shared/storage-adapter";

const assetsRouter = new Hono();
const storage = getDefaultStorageAdapter();

async function getDb(): Promise<Databases> {
  return getDatabases();
}

function createAssetDoc(
  data: Record<string, unknown>,
  fileId: string,
  fileUrl: string,
  size: number,
  mimeType: string,
  bucketId: string,
  userId: string,
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    project_id: data.project_id,
    user_id: userId,
    owner_type: data.owner_type ?? "project",
    owner_id: data.owner_id ?? data.project_id,
    media_type: data.media_type ?? "document",
    purpose: data.purpose ?? "attachment",
    file_id: fileId,
    bucket_id: bucketId,
    filename: data.fileName,
    mime_type: mimeType,
    size,
    width: null,
    height: null,
    duration: null,
    status: "active",
    metadata: data.metadata ? String(data.metadata) : "{}",
    created_by: userId,
    created_at: now,
    updated_at: now,
  };
}

import { z } from "zod";

function formatZodError(error: z.ZodError<unknown>): string {
  return error.issues
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join("; ");
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

  // Build File-like object from Base64
  const fileBuffer = Buffer.from(data.fileBase64, "base64");
  const file: File = {
    name: data.fileName,
    type: data.mimeType,
    size: fileBuffer.byteLength,
    arrayBuffer: () =>
      Promise.resolve(
        fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength,
        ),
      ),
  } as unknown as File;

  const bucketKind =
    data.media_type === "image"
      ? "projectImages"
      : data.media_type === "audio"
        ? "audioFiles"
        : "general";

  const uploaded = await storage.upload(file, bucketKind, data.fileName);

  const databases = await getDb();
  const doc = createAssetDoc(
    data,
    uploaded.id,
    uploaded.url,
    uploaded.size,
    uploaded.mimeType,
    uploaded.id,
    user.id,
  );
  const created = await databases.createDocument(
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
  const databases = await getDb();

  const asset = await databases
    .getDocument(dbId(), "assets", id)
    .catch(() => null);
  if (!asset) {
    throw new HTTPException(404, { message: "Asset not found" });
  }

  const projectId = String(asset.project_id);
  if (!(await canReadProject(user.id, projectId))) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  return c.json({ success: true, data: asset });
});

// PATCH /assets/:id
assetsRouter.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const databases = await getDb();

  const asset = await databases
    .getDocument(dbId(), "assets", id)
    .catch(() => null);
  if (!asset) {
    throw new HTTPException(404, { message: "Asset not found" });
  }

  const projectId = String(asset.project_id);
  if (!(await canEditProject(user.id, projectId))) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = updateAssetSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: formatZodError(parsed.error),
    });
  }

  const data = parsed.data;
  const updatePayload: Record<string, unknown> = {};
  if (data.owner_type !== undefined) updatePayload.owner_type = data.owner_type;
  if (data.owner_id !== undefined) updatePayload.owner_id = data.owner_id;
  if (data.media_type !== undefined) updatePayload.media_type = data.media_type;
  if (data.purpose !== undefined) updatePayload.purpose = data.purpose;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.metadata !== undefined) updatePayload.metadata = data.metadata;
  updatePayload.updated_at = new Date().toISOString();

  const updated = await databases.updateDocument(
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
  const databases = await getDb();

  const asset = await databases
    .getDocument(dbId(), "assets", id)
    .catch(() => null);
  if (!asset) {
    throw new HTTPException(404, { message: "Asset not found" });
  }

  const projectId = String(asset.project_id);
  if (!(await canManageProject(user.id, projectId))) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  await databases.deleteDocument(dbId(), "assets", id);
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

  const databases = await getDb();
  const { documents } = await databases.listDocuments(dbId(), "assets", [
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

  const databases = await getDb();
  const { documents } = await databases.listDocuments(dbId(), "assets", [
    Query.equal("project_id", projectId),
  ]);

  return c.json({ success: true, data: documents });
});

// POST /assets/:id/link
assetsRouter.post("/:id/link", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const databases = await getDb();

  const asset = await databases
    .getDocument(dbId(), "assets", id)
    .catch(() => null);
  if (!asset) {
    throw new HTTPException(404, { message: "Asset not found" });
  }

  const projectId = String(asset.project_id);
  if (!(await canEditProject(user.id, projectId))) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = linkAssetSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: formatZodError(parsed.error),
    });
  }

  const { owner_type, owner_id } = parsed.data;
  const updated = await databases.updateDocument(dbId(), "assets", id, {
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
  const databases = await getDb();

  const asset = await databases
    .getDocument(dbId(), "assets", id)
    .catch(() => null);
  if (!asset) {
    throw new HTTPException(404, { message: "Asset not found" });
  }

  const projectId = String(asset.project_id);
  if (!(await canEditProject(user.id, projectId))) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const updated = await databases.updateDocument(dbId(), "assets", id, {
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

  const databases = await getDb();
  const ownerType = c.req.query("owner_type");
  const mediaType = c.req.query("media_type");

  const queries = [Query.equal("project_id", projectId)];
  if (ownerType) queries.push(Query.equal("owner_type", ownerType));
  if (mediaType) queries.push(Query.equal("media_type", mediaType));

  const { documents } = await databases.listDocuments(
    dbId(),
    "assets",
    queries,
  );
  return c.json({ success: true, data: documents });
});

export default assetsRouter;
