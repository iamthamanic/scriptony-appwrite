/**
 * Access-Helper for scriptony-script.
 * Single-User initial implementation; extensible for Collaboration (T21).
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
const PROJECTS_COLLECTION = "projects";

export async function getProject(
  projectId: string,
): Promise<Record<string, any> | null> {
  try {
    const doc = await databases.getDocument(
      DB_ID,
      PROJECTS_COLLECTION,
      projectId,
    );
    return doc as Record<string, any>;
  } catch {
    return null;
  }
}

async function getUserOrganizationIds(userId: string): Promise<string[]> {
  try {
    const docs = await databases.listDocuments(
      DB_ID,
      "organization_members",
      [Query.equal("user_id", userId)],
    );
    return docs.documents.map((d: any) => d.organization_id as string);
  } catch {
    return [];
  }
}

export async function canReadProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const project = await getProject(projectId);
  if (!project) return false;
  if (project.created_by === userId) return true;
  if (project.user_id === userId) return true;
  if (project.owner_type === "user" && project.owner_id === userId) return true;
  const orgIds = await getUserOrganizationIds(userId);
  if (
    project.owner_type === "organization" &&
    orgIds.includes(project.owner_id)
  ) {
    return true;
  }
  if (project.organization_id && orgIds.includes(project.organization_id)) {
    return true;
  }
  return false;
}

export async function canEditProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  // Initial: same as read for single-user mode.
  // Future T21: check project_members role ∈ ['owner','editor','admin'].
  return canReadProject(userId, projectId);
}

export async function canManageProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const project = await getProject(projectId);
  if (!project) return false;
  if (project.created_by === userId) return true;
  if (project.user_id === userId) return true;
  if (project.owner_type === "user" && project.owner_id === userId) return true;
  return false;
}
