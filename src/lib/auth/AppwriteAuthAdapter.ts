/**
 * Appwrite-backed implementation of AuthClient.
 *
 * Uses the Appwrite Web SDK (Account): email/password, OAuth redirect, JWT for
 * Bearer calls to Scriptony HTTP functions.
 *
 * Location: src/lib/auth/AppwriteAuthAdapter.ts
 */

import { Account, AppwriteException, ID, OAuthProvider } from "appwrite";
import type { Models } from "appwrite";
import { getAppwriteClient } from "../appwrite/client";
import { getAuthRedirectUrl, getPasswordResetRedirectUrl } from "../env";
import type { AuthClient, AuthSession, AuthUserProfile } from "./AuthClient";

function normalizeRoleFromLabels(labels: string[]): AuthUserProfile["role"] {
  if (labels.includes("superadmin")) return "superadmin";
  if (labels.includes("admin")) return "admin";
  return "user";
}

function mapUserToProfile(user: Models.User): AuthUserProfile {
  const prefs = (user.prefs || {}) as Record<string, unknown>;
  const metaRole = prefs.role;
  let role = normalizeRoleFromLabels(user.labels || []);
  if (metaRole === "admin" || metaRole === "superadmin") {
    role = metaRole;
  }

  return {
    id: user.$id,
    email: user.email || "",
    name: user.name || user.email || "User",
    role,
    avatar: typeof prefs.avatar === "string" ? prefs.avatar : undefined,
    metadata: { ...prefs, labels: user.labels },
  };
}

function resolveOAuthProvider(providerId: string): OAuthProvider {
  const key = providerId.trim().toLowerCase();
  const values = Object.values(OAuthProvider) as string[];
  if (!values.includes(key)) {
    throw new Error(`Unsupported OAuth provider: ${providerId}`);
  }
  return key as OAuthProvider;
}

export class AppwriteAuthAdapter implements AuthClient {
  private get account(): Account {
    return new Account(getAppwriteClient());
  }

  private async mapSession(): Promise<AuthSession | null> {
    try {
      const user = await this.account.get();
      const { jwt } = await this.account.createJWT({ duration: 900 });
      return {
        accessToken: jwt,
        userId: user.$id,
        profile: mapUserToProfile(user),
        raw: user,
      };
    } catch (e) {
      if (e instanceof AppwriteException && e.code === 401) {
        return null;
      }
      console.error("[AppwriteAuthAdapter] mapSession error:", e);
      return null;
    }
  }

  async getSession(): Promise<AuthSession | null> {
    return this.mapSession();
  }

  async signUp(
    email: string,
    password: string,
    options?: Record<string, unknown>
  ): Promise<AuthSession | null> {
    const displayName =
      typeof options?.displayName === "string"
        ? options.displayName
        : email.split("@")[0] || "User";

    await this.account.create({
      userId: ID.unique(),
      email,
      password,
      name: displayName,
    });

    try {
      await this.account.createEmailPasswordSession({ email, password });
    } catch (e) {
      console.warn(
        "[AppwriteAuthAdapter] signUp: session not created (verification or policy):",
        e
      );
      return null;
    }

    return this.mapSession();
  }

  async signInWithPassword(
    email: string,
    password: string
  ): Promise<AuthSession> {
    await this.account.createEmailPasswordSession({ email, password });
    const session = await this.mapSession();
    if (!session) {
      throw new Error("Sign in succeeded but no session returned");
    }
    return session;
  }

  async signInWithOAuth(
    provider: string,
    options?: Record<string, unknown>
  ): Promise<void> {
    const oauthProvider = resolveOAuthProvider(provider);
    const success =
      (typeof options?.redirectTo === "string"
        ? options.redirectTo
        : undefined) || getAuthRedirectUrl();
    const failure = success;

    this.account.createOAuth2Session({
      provider: oauthProvider,
      success,
      failure,
    });
  }

  async signOut(): Promise<void> {
    try {
      await this.account.deleteSession({ sessionId: "current" });
    } catch (e) {
      console.warn("[AppwriteAuthAdapter] signOut:", e);
    }
  }

  async updateUser(patch: Record<string, unknown>): Promise<void> {
    const password = typeof patch?.password === "string" ? patch.password : null;
    const oldPassword =
      typeof patch?.oldPassword === "string" ? patch.oldPassword : undefined;
    const dataPatch =
      patch?.data && typeof patch.data === "object" && patch.data !== null
        ? (patch.data as Record<string, unknown>)
        : null;

    if (password) {
      await this.account.updatePassword({
        password,
        ...(oldPassword !== undefined ? { oldPassword } : {}),
      });
    }

    if (dataPatch) {
      const user = await this.account.get();
      const prev = (user.prefs || {}) as Record<string, unknown>;
      await this.account.updatePrefs({
        prefs: { ...prev, ...dataPatch } as Models.DefaultPreferences,
      });
      if (typeof dataPatch.name === "string") {
        await this.account.updateName({ name: dataPatch.name });
      }
    }
  }

  async resetPasswordForEmail(
    email: string,
    redirectTo?: string
  ): Promise<void> {
    const url = redirectTo || getPasswordResetRedirectUrl();
    await this.account.createRecovery({ email, url });
  }

  onAuthStateChange(cb: (session: AuthSession | null) => void): () => void {
    let lastKey: string | null = null;

    const emit = async () => {
      const session = await this.mapSession();
      const key = session?.userId ?? "";
      if (key !== lastKey) {
        lastKey = key;
        cb(session);
      }
    };

    void emit();
    const interval = window.setInterval(() => void emit(), 30_000);
    const onFocus = () => void emit();
    const onVis = () => {
      if (document.visibilityState === "visible") void emit();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }
}
