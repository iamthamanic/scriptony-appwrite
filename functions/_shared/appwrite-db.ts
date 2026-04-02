/**
 * Appwrite Databases admin client and collection helpers for function routes.
 */

import { Client, Databases, Query, ID } from "node-appwrite";
import {
  getAppwriteApiKey,
  getAppwriteDatabaseId,
  getAppwriteEndpoint,
  getAppwriteProjectId,
} from "./env";

let _clientCache: {
  databases: Databases;
  endpoint: string;
  projectId: string;
  apiKey: string;
} | null = null;
const DB_REQUEST_TIMEOUT_MS = Number(process.env.SCRIPTONY_DB_REQUEST_TIMEOUT_MS || 7000);

function elapsedMs(start: number): number {
  return Date.now() - start;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export function getDatabases(): Databases {
  const endpoint = getAppwriteEndpoint();
  const projectId = getAppwriteProjectId();
  const apiKey = getAppwriteApiKey();
  const cacheOk =
    _clientCache &&
    _clientCache.endpoint === endpoint &&
    _clientCache.projectId === projectId &&
    _clientCache.apiKey === apiKey;

  if (!cacheOk) {
    const startedAt = Date.now();
    console.log("[appwrite-db] creating Databases client", {
      endpoint,
      projectId,
    });
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    _clientCache = {
      databases: new Databases(client),
      endpoint,
      projectId,
      apiKey,
    };
    console.log("[appwrite-db] Databases client ready", {
      elapsedMs: elapsedMs(startedAt),
    });
  }
  return _clientCache.databases;
}

export function dbId(): string {
  return getAppwriteDatabaseId();
}

/** Collection IDs must match attributes created in the Appwrite console (snake_case fields). */
export const C = {
  projects: "projects",
  organizations: "organizations",
  organization_members: "organization_members",
  users: "users",
  worlds: "worlds",
  world_categories: "world_categories",
  world_items: "world_items",
  timeline_nodes: "timeline_nodes",
  shots: "shots",
  shot_audio: "shot_audio",
  shot_characters: "shot_characters",
  characters: "characters",
  scenes: "scenes",
  story_beats: "story_beats",
  activity_logs: "activity_logs",
  ai_chat_settings: "ai_chat_settings",
  ai_conversations: "ai_conversations",
  ai_chat_messages: "ai_chat_messages",
  rag_sync_queue: "rag_sync_queue",
  user_integration_tokens: "user_integration_tokens",
  project_inspirations: "project_inspirations",
  project_visual_style: "project_visual_style",
  project_visual_style_items: "project_visual_style_items",
} as const;

export type AppwriteDoc = Record<string, unknown>;

export function docToRow(doc: AppwriteDoc): Record<string, any> {
  const id = doc.$id;
  const created_at = doc.$createdAt;
  const updated_at = doc.$updatedAt;
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } =
    doc as Record<string, unknown>;
  // Spread rest first: some collections define an attribute `id` that can be null and would
  // otherwise overwrite the real document id derived from $id.
  return { ...rest, id, created_at, updated_at };
}

export async function getDocument(
  collection: string,
  documentId: string
): Promise<Record<string, any> | null> {
  try {
    const doc = await getDatabases().getDocument(dbId(), collection, documentId);
    return docToRow(doc as unknown as AppwriteDoc);
  } catch {
    return null;
  }
}

export async function listDocumentsFull(
  collection: string,
  queries: string[],
  limit = 5000
): Promise<Record<string, any>[]> {
  const q = [...queries, Query.limit(limit)];
  const res = await getDatabases().listDocuments(dbId(), collection, q);
  return res.documents.map((d) => docToRow(d as unknown as AppwriteDoc));
}

export async function createDocument(
  collection: string,
  documentId: string | undefined,
  data: Record<string, unknown>
): Promise<Record<string, any>> {
  const id = documentId || ID.unique();
  const doc = await getDatabases().createDocument(dbId(), collection, id, data);
  return docToRow(doc as unknown as AppwriteDoc);
}

export async function updateDocument(
  collection: string,
  documentId: string,
  data: Record<string, unknown>
): Promise<Record<string, any>> {
  const doc = await getDatabases().updateDocument(dbId(), collection, documentId, data);
  return docToRow(doc as unknown as AppwriteDoc);
}

export async function deleteDocument(collection: string, documentId: string): Promise<void> {
  await getDatabases().deleteDocument(dbId(), collection, documentId);
}

export async function countDocuments(collection: string, queries: string[] = []): Promise<number> {
  const startedAt = Date.now();
  const databaseId = dbId();
  console.log("[appwrite-db] countDocuments start", {
    databaseId,
    collection,
    timeoutMs: DB_REQUEST_TIMEOUT_MS,
  });
  const res = await withTimeout(
    getDatabases().listDocuments(databaseId, collection, [Query.limit(1), ...queries], undefined, true),
    DB_REQUEST_TIMEOUT_MS,
    `countDocuments(${collection})`
  );
  console.log("[appwrite-db] countDocuments done", {
    collection,
    total: res.total,
    elapsedMs: elapsedMs(startedAt),
  });
  return res.total;
}
