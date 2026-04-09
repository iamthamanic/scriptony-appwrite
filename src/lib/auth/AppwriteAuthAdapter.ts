/**
 * Appwrite-backed implementation of AuthClient.
 *
 * Uses the Appwrite Web SDK (Account): email/password, OAuth redirect, JWT for
 * Bearer calls to Scriptony HTTP functions.
 *
 * JWT strategy: createJWT is rate-limited aggressively by Appwrite, so we cache
 * the JWT for most of its lifetime and deduplicate concurrent refresh attempts
 * behind a single in-flight promise.
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

/** JWT lifetime we request (seconds). */
const JWT_DURATION = 900;
/** Refresh the JWT when less than this many ms remain. */
const JWT_REFRESH_MARGIN = 120_000;
/** After a rate-limit hit, don't retry for this many ms. */
const JWT_RATE_LIMIT_BACKOFF = 60_000;

export class AppwriteAuthAdapter implements AuthClient {
  /* ---- JWT cache ---- */
  private cachedJwt: string | null = null;
  private jwtExpiresAt = 0;
  private jwtInflight: Promise<string | null> | null = null;
  private jwtRateLimitedUntil = 0;

  /* ---- Session cache ---- */
  private cachedSession: AuthSession | null = null;
  private sessionInflight: Promise<AuthSession | null> | null = null;
  private sessionFetchedAt = 0;
  /** How long to consider the cached session fresh (ms). */
  private static SESSION_TTL = 10_000;

  private get account(): Account {
    return new Account(getAppwriteClient());
  }

  /* ---------- JWT ---------- */

  /**
   * Get a JWT, reusing the cached one unless it's close to expiry.
   * Concurrent callers share a single in-flight promise.
   */
  private async getJwt(): Promise<string | null> {
    const now = Date.now();

    // Return cached JWT if still fresh
    if (this.cachedJwt && now < this.jwtExpiresAt - JWT_REFRESH_MARGIN) {
      return this.cachedJwt;
    }

    // If we're in rate-limit backoff, return whatever we have
    if (now < this.jwtRateLimitedUntil) {
      return this.cachedJwt;
    }

    // Deduplicate: if a fetch is already in progress, piggyback on it
    if (this.jwtInflight) {
      return this.jwtInflight;
    }

    this.jwtInflight = this.fetchJwt();
    try {
      return await this.jwtInflight;
    } finally {
      this.jwtInflight = null;
    }
  }

  private async fetchJwt(): Promise<string | null> {
    try {
      const { jwt } = await this.account.createJWT({ duration: JWT_DURATION });
      this.cachedJwt = jwt;
      this.jwtExpiresAt = Date.now() + JWT_DURATION * 1000;
      return jwt;
    } catch (e) {
      if (e instanceof AppwriteException && e.code === 429) {
        this.jwtRateLimitedUntil = Date.now() + JWT_RATE_LIMIT_BACKOFF;
        if (this.cachedJwt) return this.cachedJwt;
      }
      console.warn("[AppwriteAuthAdapter] getJwt error:", e);
      return this.cachedJwt; // return stale if available
    }
  }

  /* ---------- Session ---------- */

  private async fetchSession(): Promise<AuthSession | null> {
    try {
      const user = await this.account.get();
      const jwt = await this.getJwt();
      const session: AuthSession = {
        accessToken: jwt || "",
        userId: user.$id,
        profile: mapUserToProfile(user),
        raw: user,
      };
      this.cachedSession = session;
      this.sessionFetchedAt = Date.now();
      return session;
    } catch (e) {
      if (e instanceof AppwriteException && (e.code === 401 || e.code === 0)) {
        this.cachedSession = null;
        this.sessionFetchedAt = Date.now();
        return null;
      }
      console.error("[AppwriteAuthAdapter] fetchSession error:", e);
      // On transient error, return cached session if available
      return this.cachedSession;
    }
  }

  /**
   * Return cached session if fresh, otherwise fetch (deduplicating concurrent calls).
   */
  private async mapSession(forceRefresh = false): Promise<AuthSession | null> {
    const now = Date.now();

    // Return cached if fresh and not forced
    if (
      !forceRefresh &&
      this.sessionFetchedAt > 0 &&
      now - this.sessionFetchedAt < AppwriteAuthAdapter.SESSION_TTL
    ) {
      return this.cachedSession;
    }

    // Deduplicate concurrent calls
    if (this.sessionInflight) {
      return this.sessionInflight;
    }

    this.sessionInflight = this.fetchSession();
    try {
      return await this.sessionInflight;
    } finally {
      this.sessionInflight = null;
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

    this.invalidateCache();
    return this.mapSession(true);
  }

  async signInWithPassword(
    email: string,
    password: string
  ): Promise<AuthSession> {
    try {
      await this.account.createEmailPasswordSession({ email, password });
    } catch (e) {
      const msg =
        e instanceof AppwriteException ? e.message : String(e ?? "");
      if (
        e instanceof AppwriteException &&
        (msg.includes("session is active") ||
          msg.includes("A session is active") ||
          msg.includes("session is prohibited"))
      ) {
        try {
          await this.account.deleteSession({ sessionId: "current" });
        } catch {
          const existing = await this.mapSession(true);
          if (existing) return existing;
        }
        this.invalidateCache();
        await this.account.createEmailPasswordSession({ email, password });
      } else {
        throw e;
      }
    }
    this.invalidateCache();
    const session = await this.mapSession(true);
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
    this.invalidateCache();
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
    let debounceTimer: number | null = null;

    const emit = async () => {
      const session = await this.mapSession(true);
      const key = session?.userId ?? "";
      if (key !== lastKey) {
        lastKey = key;
        cb(session);
      }
    };

    const scheduleEmit = () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void emit();
      }, 400);
    };

    void emit();
    const interval = window.setInterval(() => void emit(), 5 * 60_000);
    const onFocus = () => scheduleEmit();
    const onVis = () => {
      if (document.visibilityState === "visible") scheduleEmit();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }

  private invalidateCache(): void {
    this.cachedJwt = null;
    this.jwtExpiresAt = 0;
    this.jwtRateLimitedUntil = 0;
    this.cachedSession = null;
    this.sessionFetchedAt = 0;
  }
}
