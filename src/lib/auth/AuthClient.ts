/**
 * Auth Client Interface
 * 
 * Provider-agnostic authentication interface.
 * Allows switching between Supabase, Auth0, Clerk, etc.
 */

export interface AuthSession {
  accessToken: string | null;
  userId: string | null;
  profile?: AuthUserProfile | null;
  raw?: unknown;
}

export interface AuthUserProfile {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  avatar?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthClient {
  /**
   * Get the current session (if any)
   */
  getSession(): Promise<AuthSession | null>;

  /**
   * Sign up with email and password
   */
  signUp(email: string, password: string, options?: Record<string, any>): Promise<AuthSession | null>;

  /**
   * Sign in with email and password
   */
  signInWithPassword(email: string, password: string): Promise<AuthSession>;

  /**
   * Sign in with OAuth provider (Google, GitHub, etc.)
   */
  signInWithOAuth(provider: string, options?: Record<string, any>): Promise<void>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;

  /**
   * Update user metadata or password
   */
  updateUser(patch: Record<string, any>): Promise<void>;

  /**
   * Send password reset email
   */
  resetPasswordForEmail(email: string, redirectTo?: string): Promise<void>;

  /**
   * Listen for auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(cb: (session: AuthSession | null) => void): () => void;
}
