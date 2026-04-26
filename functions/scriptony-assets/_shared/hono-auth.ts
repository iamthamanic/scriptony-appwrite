import { createHonoAppwriteHandler } from "../../_shared/hono-appwrite-handler";
import { requireAuthenticatedUser } from "../../_shared/auth";
import { Databases, Query } from "node-appwrite";
import { getDatabases, dbId } from "../../_shared/appwrite-db";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

export const projectIdQuerySchema = z.object({
  project_id: z.string().min(1),
});

export async function authMiddleware(c: Context, next: Next) {
  const req = c.req.raw;
  const user = await requireAuthenticatedUser(req);
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  c.set("user", user);
  await next();
}

export function createAppwriteHandler(app: {
  fetch: (request: Request) => Promise<Response> | Response;
}) {
  return createHonoAppwriteHandler(app);
}

export async function getDocument(
  collection: string,
  docId: string,
): Promise<Record<string, unknown> | null> {
  const database = await getDatabases();
  try {
    return await database.getDocument(dbId(), collection, docId);
  } catch {
    return null;
  }
}

export async function getDocuments(
  collection: string,
  queries: string[],
): Promise<Record<string, unknown>[]> {
  const database = await getDatabases();
  const { documents } = await database.listDocuments(
    dbId(),
    collection,
    queries,
  );
  return documents;
}
