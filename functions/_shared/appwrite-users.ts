import { AppwriteException, Client, ID, Models, Users } from "node-appwrite";
import type { AuthUser } from "./auth";
import { getAppwriteApiKey, getAppwriteEndpoint, getAppwriteProjectId } from "./env";

type AppwriteUser = Models.User<Models.DefaultPreferences>;

export type AppwriteSessionWithAccessToken = Models.Session & {
  accessToken: string;
};

function getUsersService(): Users {
  return new Users(
    new Client()
      .setEndpoint(getAppwriteEndpoint())
      .setProject(getAppwriteProjectId())
      .setKey(getAppwriteApiKey())
  );
}

export function isAppwriteConflictError(error: unknown): boolean {
  if (error instanceof AppwriteException) {
    return error.code === 409;
  }

  const code = (error as { code?: unknown } | null | undefined)?.code;
  return code === 409;
}

export async function findUserByEmail(email: string): Promise<AppwriteUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await getUsersService().list({
    search: normalizedEmail,
    total: false,
  });

  return (
    result.users.find((user) => (user.email || "").trim().toLowerCase() === normalizedEmail) || null
  );
}

export async function createEmailPasswordUser(options: {
  email: string;
  password: string;
  name?: string;
}): Promise<AppwriteUser> {
  return getUsersService().create({
    userId: ID.unique(),
    email: options.email,
    password: options.password,
    name: options.name,
  });
}

export async function createJwtSessionForUser(
  userId: string
): Promise<AppwriteSessionWithAccessToken> {
  const users = getUsersService();
  const session = await users.createSession({ userId });
  const jwt = await users.createJWT({ userId, sessionId: session.$id });

  return {
    ...session,
    accessToken: jwt.jwt,
  };
}

export function toAuthUser(user: AppwriteUser): AuthUser {
  const prefs = (user.prefs || {}) as Record<string, unknown>;
  return {
    id: user.$id,
    email: user.email,
    displayName: user.name || undefined,
    avatarUrl: typeof prefs.avatar === "string" ? prefs.avatar : undefined,
    defaultRole: user.labels?.includes("superadmin")
      ? "superadmin"
      : user.labels?.includes("admin")
        ? "admin"
        : "user",
    metadata: { ...prefs, labels: user.labels },
  };
}
