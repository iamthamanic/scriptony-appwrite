/**
 * Auth and bootstrap helpers for Appwrite JWT and integration tokens.
 */

import { Account, Client, Users } from "node-appwrite";
import { createHash } from "crypto";
import {
  getAppwriteApiKey,
  getAppwriteEndpoint,
  getAppwriteProjectId,
  getOptionalEnv,
  getPublicAppwriteEndpoint,
} from "./env";
import { requestGraphql } from "./graphql-compat";
import type { RequestLike } from "./http";

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  defaultRole?: string;
  metadata?: Record<string, unknown>;
}

export interface BootstrapResult {
  user: AuthUser;
  organizationId: string;
}

export type AuthSource = string | RequestLike | undefined;

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "scriptony"
  );
}

export function getBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

type JwtSessionClaims = {
  userId: string;
  sessionId: string;
  exp?: number;
};

type AuthValidationAttempt = {
  endpoint: string;
  message: string;
};

function describeAuthError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return "Unknown auth validation error";
}

function decodeJwtSessionClaims(token: string): JwtSessionClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
    const userId = typeof payload.userId === "string" ? payload.userId.trim() : "";
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
    const exp = typeof payload.exp === "number" ? payload.exp : undefined;
    if (!userId || !sessionId) {
      return null;
    }
    return { userId, sessionId, exp };
  } catch {
    return null;
  }
}

async function getUserFromSessionFallback(token: string): Promise<AuthUser | null> {
  const claims = decodeJwtSessionClaims(token);
  if (!claims) {
    return null;
  }

  if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) {
    return null;
  }

  const client = new Client()
    .setEndpoint(getAppwriteEndpoint())
    .setProject(getAppwriteProjectId())
    .setKey(getAppwriteApiKey());

  try {
    const users = new Users(client);
    const sessions = await users.listSessions({ userId: claims.userId, total: false });
    const activeSession = sessions.sessions.find((session) => session.$id === claims.sessionId);
    if (!activeSession) {
      return null;
    }
    return { id: claims.userId };
  } catch {
    return null;
  }
}

function getUserFromDecodedJwtFallback(token: string): AuthUser | null {
  const claims = decodeJwtSessionClaims(token);
  if (!claims) {
    return null;
  }

  if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) {
    return null;
  }

  return { id: claims.userId };
}

function getAuthCandidateEndpoints(): string[] {
  const rawCandidates = [
    getOptionalEnv("APPWRITE_FUNCTION_API_ENDPOINT"),
    getOptionalEnv("APPWRITE_ENDPOINT"),
    getOptionalEnv("APPWRITE_FUNCTION_ENDPOINT"),
    getPublicAppwriteEndpoint(),
  ];
  const seen = new Set<string>();
  const endpoints: string[] = [];
  for (const candidate of rawCandidates) {
    const trimmed = candidate?.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    endpoints.push(trimmed);
  }
  return endpoints;
}

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  /**
   * Validate JWT via the Appwrite account API.
   * Try runtime-injected internal endpoints first; fall back to the public URL only when needed.
   */
  const attempts: AuthValidationAttempt[] = [];
  for (const authEndpoint of getAuthCandidateEndpoints()) {
    const client = new Client()
      .setEndpoint(authEndpoint)
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
        defaultRole: u.labels?.includes("superadmin")
          ? "superadmin"
          : u.labels?.includes("admin")
            ? "admin"
            : "user",
        metadata: { ...prefs, labels: u.labels },
      };
    } catch (error: unknown) {
      attempts.push({
        endpoint: authEndpoint,
        message: describeAuthError(error),
      });
    }
  }

  if (attempts.length > 0) {
    const fallbackUser = await getUserFromSessionFallback(token);
    if (fallbackUser) {
      console.warn("[Auth] JWT validation recovered via session fallback", {
        userId: fallbackUser.id,
        attempts,
      });
      return fallbackUser;
    }
    const decodedUser = getUserFromDecodedJwtFallback(token);
    if (decodedUser) {
      console.warn("[Auth] JWT validation recovered via decoded fallback", {
        userId: decodedUser.id,
        attempts,
      });
      return decodedUser;
    }

    console.warn("[Auth] Bearer token validation failed", { attempts });
  }

  return null;
}

export async function getUserFromAuthHeader(authHeader?: string): Promise<AuthUser | null> {
  const token = getBearerToken(authHeader);
  if (!token) {
    return null;
  }
  return getUserFromToken(token);
}

function getRequestHeaderValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }
  }

  return undefined;
}

function getRequestHeader(req: RequestLike | undefined, name: string): string | undefined {
  if (!req || typeof req !== "object") {
    return undefined;
  }

  const reqHeader = (req as { header?: (name: string) => unknown }).header;
  if (typeof reqHeader === "function") {
    try {
      const fromReq = getRequestHeaderValue(reqHeader.call(req, name));
      if (fromReq) {
        return fromReq;
      }
    } catch {
      /* fall through to header map access */
    }
  }

  if (!req.headers || typeof req.headers !== "object") {
    return undefined;
  }

  const headers = req.headers as Record<string, unknown> & {
    get?: (name: string) => unknown;
    [Symbol.iterator]?: () => IterableIterator<[string, unknown]>;
  };
  const direct = getRequestHeaderValue(headers[name]);
  if (direct) {
    return direct;
  }

  if (typeof headers.get === "function") {
    try {
      const fromGetter = getRequestHeaderValue(headers.get(name));
      if (fromGetter) {
        return fromGetter;
      }
    } catch {
      /* fall through to iterable/object access */
    }
  }

  const normalizedName = name.toLowerCase();
  if (typeof headers[Symbol.iterator] === "function") {
    try {
      for (const entry of headers as Iterable<unknown>) {
        if (!Array.isArray(entry) || entry.length < 2) {
          continue;
        }
        const [headerName, headerValue] = entry;
        if (typeof headerName === "string" && headerName.toLowerCase() === normalizedName) {
          return getRequestHeaderValue(headerValue);
        }
      }
    } catch {
      /* fall through to Object.entries */
    }
  }

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerName.toLowerCase() === normalizedName) {
      return getRequestHeaderValue(headerValue);
    }
  }

  return undefined;
}

export function getAuthorizationFromRequest(authSource: AuthSource): string | undefined {
  if (typeof authSource === "string") {
    const trimmed = authSource.trim();
    return trimmed || undefined;
  }

  const bearer = getRequestHeader(authSource, "authorization");
  if (bearer) {
    return bearer;
  }

  const appwriteJwt = getRequestHeader(authSource, "x-appwrite-user-jwt");
  if (appwriteJwt) {
    return `Bearer ${appwriteJwt}`;
  }

  return undefined;
}

export function getTrustedExecutionUserId(authSource: AuthSource): string | null {
  if (!authSource || typeof authSource === "string") {
    return null;
  }

  const executionId = getRequestHeader(authSource, "x-appwrite-execution-id");
  const userId = getRequestHeader(authSource, "x-appwrite-user-id");
  if (!executionId || !userId) {
    return null;
  }

  return userId;
}

export async function resolveAuthenticatedUser(authSource: AuthSource): Promise<AuthUser | null> {
  const authHeader = getAuthorizationFromRequest(authSource);

  let user = await getUserFromAuthHeader(authHeader);
  if (!user) {
    const token = getBearerToken(authHeader);
    if (token) {
      user = await resolveIntegrationToken(token);
    }
  }
  if (user) {
    return user;
  }

  const trustedUserId = getTrustedExecutionUserId(authSource);
  if (trustedUserId) {
    return { id: trustedUserId };
  }

  return null;
}

function authDiagnostics(authSource: AuthSource): Record<string, boolean | string | null> {
  const authorization =
    typeof authSource === "string"
      ? authSource.trim() || undefined
      : getRequestHeader(authSource, "authorization");

  return {
    hasAuthorization: Boolean(authorization),
    authorizationScheme: authorization?.split(/\s+/, 1)[0] || null,
    hasAppwriteUserJwt: Boolean(getRequestHeader(authSource as RequestLike | undefined, "x-appwrite-user-jwt")),
    hasTrustedExecutionId: Boolean(getRequestHeader(authSource as RequestLike | undefined, "x-appwrite-execution-id")),
    hasTrustedUserId: Boolean(getRequestHeader(authSource as RequestLike | undefined, "x-appwrite-user-id")),
  };
}

function logAuthResolutionFailure(authSource: AuthSource, scope: string): void {
  const diagnostics = authDiagnostics(authSource);
  if (
    !diagnostics.hasAuthorization &&
    !diagnostics.hasAppwriteUserJwt &&
    !diagnostics.hasTrustedExecutionId &&
    !diagnostics.hasTrustedUserId
  ) {
    return;
  }

  console.warn(`[${scope}] Unable to resolve user from auth source`, diagnostics);
}

export async function getUserFromRequest(authSource: AuthSource): Promise<AuthUser | null> {
  return resolveAuthenticatedUser(authSource);
}

export async function requireAuthenticatedUser(authSource?: AuthSource): Promise<AuthUser | null> {
  const user = await resolveAuthenticatedUser(authSource);
  if (!user) {
    logAuthResolutionFailure(authSource, "requireAuthenticatedUser");
    return null;
  }
  return user;
}

export function hashIntegrationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function resolveIntegrationToken(token: string): Promise<AuthUser | null> {
  if (!token || token.length < 16) {
    return null;
  }
  const tokenHash = hashIntegrationToken(token);
  try {
    const data = await requestGraphql<{
      user_integration_tokens: Array<{ user_id: string }>;
    }>(
      `
        query GetUserByIntegrationToken($tokenHash: String!) {
          user_integration_tokens(
            where: { token_hash: { _eq: $tokenHash } }
            limit: 1
          ) {
            user_id
          }
        }
      `,
      { tokenHash }
    );
    const row = data?.user_integration_tokens?.[0];
    if (!row?.user_id) {
      return null;
    }
    const profile = await requestGraphql<{
      users_by_pk: {
        id: string;
        name: string | null;
        email: string | null;
        avatar_url: string | null;
      } | null;
    }>(
      `
        query GetUserProfile($userId: uuid!) {
          users_by_pk(id: $userId) {
            id
            name
            email
            avatar_url
          }
        }
      `,
      { userId: row.user_id }
    );
    const u = profile?.users_by_pk;
    if (!u) {
      return null;
    }
    return {
      id: u.id,
      displayName: u.name ?? undefined,
      email: u.email ?? undefined,
      avatarUrl: u.avatar_url ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function ensureUserBootstrap(user: AuthUser): Promise<BootstrapResult> {
  const data = await requestGraphql<{
    users_by_pk: { id: string } | null;
    organization_members: Array<{ organization_id: string }>;
  }>(
    `
      query GetExistingUserState($userId: uuid!) {
        users_by_pk(id: $userId) {
          id
        }
        organization_members(
          where: { user_id: { _eq: $userId } }
          limit: 1
        ) {
          organization_id
        }
      }
    `,
    { userId: user.id }
  );

  let organizationId =
    data.organization_members[0]?.organization_id || null;

  if (!organizationId) {
    const displayName =
      user.displayName ||
      (typeof user.metadata?.name === "string" ? user.metadata.name : "") ||
      user.email?.split("@")[0] ||
      "Scriptony User";

    const createdOrg = await requestGraphql<{
      insert_organizations_one: { id: string };
    }>(
      `
        mutation CreateOrganization($object: organizations_insert_input!) {
          insert_organizations_one(object: $object) {
            id
          }
        }
      `,
      {
        object: {
          name: `${displayName}'s Organization`,
          slug: `${slugify(displayName)}-${user.id.slice(0, 8)}`,
          owner_user_id: user.id,
        },
      }
    );

    organizationId = createdOrg.insert_organizations_one.id;

    await requestGraphql(
      `
        mutation AddOrganizationMember($object: organization_members_insert_input!) {
          insert_organization_members_one(object: $object) {
            organization_id
          }
        }
      `,
      {
        object: {
          organization_id: organizationId,
          user_id: user.id,
          role: "owner",
        },
      }
    );
  }

  const profileName =
    user.displayName ||
    (typeof user.metadata?.name === "string" ? user.metadata.name : "") ||
    user.email?.split("@")[0] ||
    "User";

  await requestGraphql(
    `
      mutation UpsertUser($object: users_insert_input!) {
        insert_users_one(
          object: $object
          on_conflict: {
            constraint: users_pkey
            update_columns: [name, email, organization_id, avatar_url]
          }
        ) {
          id
        }
      }
    `,
    {
      object: {
        id: user.id,
        display_name: profileName,
        email: user.email || null,
        avatar_url: user.avatarUrl || null,
      },
    }
  );

  return { user, organizationId };
}

export async function requireUserBootstrap(authSource?: AuthSource): Promise<BootstrapResult | null> {
  const user = await requireAuthenticatedUser(authSource);
  if (!user) {
    return null;
  }
  return ensureUserBootstrap(user);
}
