import { Databases, Query } from "node-appwrite";
import { getDatabases, dbId } from "../../_shared/appwrite-db";

async function getDb(): Promise<Databases> {
  return getDatabases();
}

function getString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

async function getCreatorId(projectId: string): Promise<string | undefined> {
  const database = await getDb();
  const doc = await database.getDocument(dbId(), "projects", projectId);
  return getString(doc.created_by) ?? getString(doc.user_id);
}

export async function canReadProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const creator = await getCreatorId(projectId);
  return userId === creator;
}

export async function canEditProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  return canReadProject(userId, projectId);
}

export async function canManageProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  return canReadProject(userId, projectId);
}
