/**
 * Shared auth and bootstrap helpers for Nhost functions.
 *
 * These helpers verify the current Nhost bearer token and lazily ensure that
 * the app-specific `users` and `organization_members` records exist.
 */

import { getAuthBaseUrl } from "./env";
import { requestGraphql } from "./hasura";

export interface NhostUser {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  defaultRole?: string;
  metadata?: Record<string, unknown>;
}

export interface BootstrapResult {
  user: NhostUser;
  organizationId: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "scriptony";
}

export function getBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

export async function getUserFromToken(token: string): Promise<NhostUser | null> {
  const response = await fetch(`${getAuthBaseUrl()}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as NhostUser;
}

export async function getUserFromAuthHeader(authHeader?: string): Promise<NhostUser | null> {
  const token = getBearerToken(authHeader);
  if (!token) {
    return null;
  }

  return getUserFromToken(token);
}

export async function ensureUserBootstrap(user: NhostUser): Promise<BootstrapResult> {
  const existing = await requestGraphql<{
    users_by_pk: { id: string; organization_id?: string | null } | null;
    organization_members: Array<{ organization_id: string }>;
  }>(
    `
      query GetExistingUserState($userId: uuid!) {
        users_by_pk(id: $userId) {
          id
          organization_id
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
    existing.users_by_pk?.organization_id ||
    existing.organization_members[0]?.organization_id ||
    null;

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
          owner_id: user.id,
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
        name: profileName,
        email: user.email || null,
        organization_id: organizationId,
        avatar_url: user.avatarUrl || null,
      },
    }
  );

  return {
    user,
    organizationId,
  };
}

export async function requireUserBootstrap(authHeader?: string): Promise<BootstrapResult | null> {
  const user = await getUserFromAuthHeader(authHeader);
  if (!user) {
    return null;
  }

  return ensureUserBootstrap(user);
}
