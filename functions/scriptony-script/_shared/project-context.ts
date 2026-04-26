/**
 * Project-context validation helpers for scriptony-script.
 * Validates that referenced entities (nodes, characters) belong to the same project.
 */

import { Client, Databases, Query } from "node-appwrite";
import process from "node:process";

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

export async function validateNodeInProject(
  nodeId: string,
  projectId: string,
): Promise<boolean> {
  try {
    const doc = await databases.getDocument(DB_ID, "timeline_nodes", nodeId);
    return doc.project_id === projectId;
  } catch {
    return false;
  }
}

export async function validateCharacterInProject(
  characterId: string,
  projectId: string,
): Promise<boolean> {
  try {
    const doc = await databases.getDocument(DB_ID, "characters", characterId);
    return doc.project_id === projectId;
  } catch {
    return false;
  }
}
