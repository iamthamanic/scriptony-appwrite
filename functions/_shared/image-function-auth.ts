/**
 * Minimal auth for scriptony-image routes: JWT + integration token via Appwrite DB only.
 * Avoids graphql-compat + handlers-all (large bundle, slow cold start, timeouts).
 * Location: functions/_shared/image-function-auth.ts
 */

import { createHash } from "crypto";
import { Account, Client, Query } from "node-appwrite";
import { C, getDocument, listDocumentsFull } from "./appwrite-db";
import { getAppwriteEndpoint, getAppwriteProjectId } from "./env";

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

export function getBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

export async function getUserFromJwt(token: string): Promise<AuthUser | null> {
  const client = new Client()
    .setEndpoint(getAppwriteEndpoint())
    .setProject(getAppwriteProjectId())
    .setJWT(token);
  try {
    const account = new Account(client);
    const u = await account.get();
    const prefs = (u.prefs || {}) as Record<string, unknown>;
    return {
      id: u.$id,
      email: u.email,
      displayName: u.name,
      avatarUrl: typeof prefs.avatar === "string" ? prefs.avatar : undefined,
    };
  } catch {
    return null;
  }
}

export function hashIntegrationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function resolveIntegrationTokenDirect(token: string): Promise<AuthUser | null> {
  if (!token || token.length < 16) return null;
  const tokenHash = hashIntegrationToken(token);
  try {
    const rows = await listDocumentsFull(
      C.user_integration_tokens,
      [Query.equal("token_hash", tokenHash), Query.limit(1)],
      1
    );
    const userId = rows[0]?.user_id as string | undefined;
    if (!userId) return null;
    const u = await getDocument(C.users, userId);
    if (!u) {
      return { id: userId };
    }
    const name =
      (typeof u.display_name === "string" && u.display_name) ||
      (typeof u.name === "string" && u.name) ||
      undefined;
    return {
      id: userId,
      email: typeof u.email === "string" ? u.email : undefined,
      displayName: name,
      avatarUrl: typeof u.avatar_url === "string" ? u.avatar_url : undefined,
    };
  } catch {
    return null;
  }
}

/** Image routes only need a stable user id (no org bootstrap / GraphQL). */
export async function requireImageFunctionUser(authHeader?: string): Promise<AuthUser | null> {
  const token = getBearerToken(authHeader);
  if (!token) return null;
  const fromJwt = await getUserFromJwt(token);
  if (fromJwt) return fromJwt;
  return resolveIntegrationTokenDirect(token);
}
