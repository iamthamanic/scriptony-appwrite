/**
 * Appwrite Storage helpers for multipart uploads from function routes.
 */

import { Client, ID, Permission, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import {
  getAppwriteApiKey,
  getAppwriteEndpoint,
  getAppwriteProjectId,
  getPublicAppwriteEndpoint,
} from "./env";
import { sendBadRequest, type RequestLike, type ResponseLike } from "./http";

type JsonRecord = Record<string, any>;

function getStorageService(): Storage {
  return new Storage(
    new Client()
      .setEndpoint(getAppwriteEndpoint())
      .setProject(getAppwriteProjectId())
      .setKey(getAppwriteApiKey())
  );
}

interface UploadedStorageFile {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

function bufferToUint8Array(value: Buffer | Uint8Array | ArrayBuffer): Uint8Array {
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  return new Uint8Array(value);
}

/** Create a File-like duck-typed object that works in Node 16+ (no global File). */
function makeFileLike(data: Uint8Array | ArrayBuffer, name: string, type: string): File {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  return {
    name,
    type,
    size: buf.byteLength,
    arrayBuffer: () => Promise.resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
  } as unknown as File;
}

function normalizeIncomingFile(candidate: any, fallbackName = "upload.bin"): File | null {
  if (!candidate) {
    return null;
  }

  if (typeof File !== "undefined" && candidate instanceof File) {
    return candidate;
  }

  if (typeof Blob !== "undefined" && candidate instanceof Blob) {
    return makeFileLike(new Uint8Array(0), fallbackName, candidate.type || "application/octet-stream");
  }

  const name =
    candidate.originalname ||
    candidate.filename ||
    candidate.name ||
    fallbackName;
  const type =
    candidate.mimetype ||
    candidate.mimeType ||
    candidate.type ||
    "application/octet-stream";

  if (candidate.buffer) {
    return makeFileLike(bufferToUint8Array(candidate.buffer), name, type);
  }

  if (candidate.data) {
    return makeFileLike(bufferToUint8Array(candidate.data), name, type);
  }

  if (typeof candidate.arrayBuffer === "function") {
    return candidate as File;
  }

  return null;
}

export function getMultipartField(req: RequestLike, field: string): string | null {
  const source = req.body || {};
  const value = source[field];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim();
  }
  return null;
}

export function extractUploadedFile(req: RequestLike, field = "file"): File | null {
  // Base64 JSON upload: { fileBase64, fileName, mimeType }
  // Note: Node 16 has no global File — use a duck-typed object instead.
  const b64 = req.body?.fileBase64;
  if (typeof b64 === "string" && b64.length > 0) {
    const buf = Buffer.from(b64, "base64");
    const name = req.body?.fileName || `${field}.bin`;
    const type = req.body?.mimeType || "application/octet-stream";
    return {
      name,
      type,
      size: buf.byteLength,
      arrayBuffer: () => Promise.resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
    } as unknown as File;
  }

  const bodyFile = normalizeIncomingFile(req.body?.[field], `${field}.bin`);
  if (bodyFile) {
    return bodyFile;
  }

  const requestFile = normalizeIncomingFile(req.file, `${field}.bin`);
  if (requestFile) {
    return requestFile;
  }

  for (const entry of asArray<any>(req.files)) {
    const normalized = normalizeIncomingFile(entry, `${field}.bin`);
    if (normalized) {
      return normalized;
    }
  }

  const keyedFiles = req.files?.[field];
  for (const entry of asArray<any>(keyedFiles)) {
    const normalized = normalizeIncomingFile(entry, `${field}.bin`);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function ensureFile(
  req: RequestLike,
  res: ResponseLike,
  options?: {
    field?: string;
    maxSizeBytes?: number;
    accept?: string[];
    message?: string;
  }
): File | null {
  const field = options?.field || "file";
  const file = extractUploadedFile(req, field);
  if (!file) {
    sendBadRequest(res, options?.message || "File is required");
    return null;
  }

  if (options?.maxSizeBytes && file.size > options?.maxSizeBytes) {
    sendBadRequest(
      res,
      `File too large: ${(file.size / 1024 / 1024).toFixed(2)} MB (max ${(options.maxSizeBytes / 1024 / 1024).toFixed(0)} MB)`
    );
    return null;
  }

  if (options?.accept?.length) {
    const isAccepted = options.accept.some((prefix) => file.type.startsWith(prefix));
    if (!isAccepted) {
      sendBadRequest(res, `Unsupported file type: ${file.type || "unknown"}`);
      return null;
    }
  }

  return file;
}

export async function uploadFileToStorage(options: {
  file: File;
  bucketId: string;
  metadata?: JsonRecord;
  name?: string;
}): Promise<UploadedStorageFile> {
  const storage = getStorageService();
  const buffer = Buffer.from(await options.file.arrayBuffer());
  const fileName = options.name || options.file.name;
  const input = InputFile.fromBuffer(buffer, fileName);
  const created = await storage.createFile(
    options.bucketId,
    ID.unique(),
    input,
    [Permission.read(Role.any())]
  );
  const project = getAppwriteProjectId();
  const url = `${getPublicAppwriteEndpoint()}/storage/buckets/${options.bucketId}/files/${created.$id}/view?project=${project}`;

  return {
    id: created.$id,
    url,
    name: created.name,
    size: created.sizeOriginal,
    mimeType: created.mimeType,
  };
}

export function extractStorageFileId(fileUrl?: string | null): string | null {
  if (!fileUrl) {
    return null;
  }
  const m = fileUrl.match(/\/files\/([a-zA-Z0-9_-]+)\//);
  return m?.[1] || null;
}

export async function deleteStorageFileByUrl(fileUrl?: string | null): Promise<void> {
  const fileId = extractStorageFileId(fileUrl);
  if (!fileId) {
    return;
  }
  const bucketMatch = fileUrl?.match(/\/buckets\/([a-zA-Z0-9_-]+)\//);
  const bucketId = bucketMatch?.[1];
  if (!bucketId) {
    return;
  }
  try {
    await getStorageService().deleteFile(bucketId, fileId);
  } catch (error) {
    console.error("[Storage] Failed to delete Appwrite file:", error);
  }
}
