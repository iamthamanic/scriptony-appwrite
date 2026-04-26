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

function getString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
}

export async function getProject(
  projectId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const doc = await databases.getDocument(
      DB_ID,
      PROJECTS_COLLECTION,
      projectId,
    );
    return doc as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getUserOrganizationIds(userId: string): Promise<string[]> {
  try {
    const docs = await databases.listDocuments(DB_ID, "organization_members", [
      Query.equal("user_id", userId),
    ]);
    return docs.documents
      .map((d) => getString(d as Record<string, unknown>, "organization_id"))
      .filter((v): v is string => v !== undefined);
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
  if (getString(project, "created_by") === userId) return true;
  if (getString(project, "user_id") === userId) return true;
  if (
    getString(project, "owner_type") === "user" &&
    getString(project, "owner_id") === userId
  ) {
    return true;
  }
  const orgIds = await getUserOrganizationIds(userId);
  if (
    getString(project, "owner_type") === "organization" &&
    getString(project, "owner_id") !== undefined &&
    orgIds.includes(getString(project, "owner_id")!)
  ) {
    return true;
  }
  const orgId = getString(project, "organization_id");
  if (orgId && orgIds.includes(orgId)) {
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
  if (getString(project, "created_by") === userId) return true;
  if (getString(project, "user_id") === userId) return true;
  if (
    getString(project, "owner_type") === "user" &&
    getString(project, "owner_id") === userId
  ) {
    return true;
  }
  return false;
}
