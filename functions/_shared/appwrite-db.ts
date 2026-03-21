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

let _databases: Databases | null = null;

export function getDatabases(): Databases {
  if (!_databases) {
    const client = new Client()
      .setEndpoint(getAppwriteEndpoint())
      .setProject(getAppwriteProjectId())
      .setKey(getAppwriteApiKey());
    _databases = new Databases(client);
  }
  return _databases;
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
} as const;

export type AppwriteDoc = Record<string, unknown>;

export function docToRow(doc: AppwriteDoc): Record<string, any> {
  const id = doc.$id;
  const created_at = doc.$createdAt;
  const updated_at = doc.$updatedAt;
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } =
    doc as Record<string, unknown>;
  return { id, created_at, updated_at, ...rest };
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
  const res = await getDatabases().listDocuments(dbId(), collection, [Query.limit(1), ...queries], undefined, true);
  return res.total;
}
