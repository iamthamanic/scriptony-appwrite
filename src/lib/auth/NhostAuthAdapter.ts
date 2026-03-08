/**
 * Nhost Auth Adapter
 *
 * Implements AuthClient using the Nhost JavaScript SDK while keeping the
 * frontend auth surface stable for the existing app.
 */

import { getNhostClient } from "../nhost/client";
import { getAuthRedirectUrl, getPasswordResetRedirectUrl } from "../env";
import type { AuthClient, AuthSession, AuthUserProfile } from "./AuthClient";
import { apiGateway } from "../api-gateway";

type NhostSessionLike = {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id?: string;
    email?: string;
    displayName?: string;
    defaultRole?: string;
    avatarUrl?: string;
    metadata?: Record<string, unknown>;
  };
};

function normalizeRole(value: unknown): AuthUserProfile["role"] {
  if (value === "admin" || value === "superadmin") {
    return value;
  }

  return "user";
}

export class NhostAuthAdapter implements AuthClient {
  private map(session: NhostSessionLike | null | undefined): AuthSession | null {
    if (!session?.accessToken) {
      return null;
    }

    const metadata = session.user?.metadata ?? {};
    const displayName =
      session.user?.displayName ||
      (typeof metadata.name === "string" ? metadata.name : "") ||
      "User";
    const avatar =
      session.user?.avatarUrl ||
      (typeof metadata.avatar === "string" ? metadata.avatar : undefined);
    const role = normalizeRole(
      session.user?.defaultRole ||
      metadata.role
    );
    const userId = session.user?.id ?? null;

    return {
      accessToken: session.accessToken ?? null,
      userId,
      profile: userId
        ? {
            id: userId,
            email: session.user?.email ?? "",
            name: displayName,
            role,
            avatar,
            metadata,
          }
        : null,
      raw: session,
    };
  }

  async getSession(): Promise<AuthSession | null> {
    const nhost = getNhostClient();
    const currentSession = nhost.getUserSession();

    if (currentSession) {
      return this.map(currentSession);
    }

    try {
      const refreshed = await nhost.refreshSession();
      return this.map(refreshed);
    } catch (error) {
      console.error("[NhostAuthAdapter] getSession error:", error);
      return null;
    }
  }

  async signUp(
    email: string,
    password: string,
    options?: Record<string, any>
  ): Promise<AuthSession | null> {
    const nhost = getNhostClient();
    const displayName =
      typeof options?.displayName === "string" ? options.displayName : undefined;
    const metadata =
      options?.metadata && typeof options.metadata === "object"
        ? options.metadata
        : {};

    const result = await nhost.auth.signUpEmailPassword({
      email,
      password,
      options: {
        defaultRole: "user",
        displayName,
        metadata,
        redirectTo: options?.redirectTo || getAuthRedirectUrl(),
      },
    });

    return this.map(result.body?.session);
  }

  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    const nhost = getNhostClient();
    const result = await nhost.auth.signInEmailPassword({ email, password });
    const session = this.map(result.body?.session);

    if (!session) {
      throw new Error("Sign in succeeded but no session returned");
    }

    return session;
  }

  async signInWithOAuth(provider: string, options?: Record<string, any>): Promise<void> {
    const nhost = getNhostClient();
    const oauthUrl = nhost.auth.signInProviderURL(provider as any, {
      redirectTo: options?.redirectTo || getAuthRedirectUrl(),
      displayName: options?.displayName,
      metadata: options?.metadata,
    });

    window.location.assign(oauthUrl);
  }

  async signOut(): Promise<void> {
    const nhost = getNhostClient();
    const session = nhost.getUserSession();

    try {
      await nhost.auth.signOut({
        refreshToken: session?.refreshToken,
        all: false,
      });
    } finally {
      nhost.clearSession();
    }
  }

  async updateUser(patch: Record<string, any>): Promise<void> {
    const password = typeof patch?.password === "string" ? patch.password : null;
    const dataPatch = patch?.data && typeof patch.data === "object" ? patch.data : null;

    const nhost = getNhostClient();

    if (password) {
      await nhost.auth.changeUserPassword({ newPassword: password });
    }

    if (dataPatch) {
      await apiGateway({
        method: "PUT",
        route: "/profile",
        body: dataPatch,
        accessToken: (await this.getSession())?.accessToken || undefined,
      });
    }
  }

  async resetPasswordForEmail(email: string, redirectTo?: string): Promise<void> {
    const nhost = getNhostClient();
    await nhost.auth.sendPasswordResetEmail({
      email,
      redirectTo: redirectTo || getPasswordResetRedirectUrl(),
    });
  }

  onAuthStateChange(cb: (session: AuthSession | null) => void): () => void {
    const nhost = getNhostClient();
    return nhost.sessionStorage.onChange((session) => {
      cb(this.map(session as NhostSessionLike | null));
    });
  }
}
