/**
 * Auth and bootstrap helpers for Appwrite JWT and integration tokens.
 */

import { Account, Client } from "node-appwrite";
import { createHash } from "crypto";
import { getAppwriteEndpoint, getAppwriteProjectId } from "./env";
import { requestGraphql } from "./graphql-compat";

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

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
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
      defaultRole: u.labels?.includes("superadmin")
        ? "superadmin"
        : u.labels?.includes("admin")
          ? "admin"
          : "user",
      metadata: { ...prefs, labels: u.labels },
    };
  } catch {
    return null;
  }
}

export async function getUserFromAuthHeader(authHeader?: string): Promise<AuthUser | null> {
  const token = getBearerToken(authHeader);
  if (!token) {
    return null;
  }
  return getUserFromToken(token);
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

export async function requireUserBootstrap(authHeader?: string): Promise<BootstrapResult | null> {
  let user = await getUserFromAuthHeader(authHeader);
  if (!user) {
    const token = getBearerToken(authHeader);
    if (token) {
      user = await resolveIntegrationToken(token);
    }
  }
  if (!user) {
    return null;
  }
  return ensureUserBootstrap(user);
}
