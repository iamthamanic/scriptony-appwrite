import { getDatabases, dbId } from "../../_shared/appwrite-db";

function getString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

async function getCreatorId(projectId: string): Promise<string | undefined> {
  const database = await getDatabases();
  const doc = await database.getDocument(dbId(), "projects", projectId);
  // projects-Collection hat aktuell user_id (nicht created_by).
  // T21 Collaboration fügt created_by hinzu; dann Reihenfolge tauschen.
  return getString(doc.user_id) ?? getString(doc.created_by);
}

/**
 * Project-Access-Helper (single-user MVP).
 *
 * ISP-Notiz: canEditProject und canManageProject delegieren aktuell
 * beide an canReadProject. Das ist bewusst für die initiale Single-User-
 * Phase; T21 Collaboration erweitert die Berechtigungen später.
 */
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
