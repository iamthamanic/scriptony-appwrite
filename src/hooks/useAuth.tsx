import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  getAuthRedirectUrl,
  getCapacitorCallbackUrl,
  getPasswordResetRedirectUrl,
} from "../lib/env";
import { getAuthClient } from "../lib/auth/getAuthClient";
import { getAuthToken } from "../lib/auth/getAuthToken";
import { buildAuthProfileFromSession } from "../lib/auth/auth-profile";
import { isNativePlatform } from "../lib/capacitor/platform";

interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getOAuthRedirectTarget = () =>
    isNativePlatform() ? getCapacitorCallbackUrl() : getAuthRedirectUrl();

  const getResetPasswordRedirectTarget = () =>
    isNativePlatform()
      ? getCapacitorCallbackUrl("reset-password")
      : getPasswordResetRedirectUrl();

  // Check for existing session on mount and listen for auth changes
  useEffect(() => {
    checkSession();

    // Listen for auth state changes via adapter
    const unsubscribe = getAuthClient().onAuthStateChange(async (session) => {
      console.log("Auth state changed:", session ? "SIGNED_IN" : "SIGNED_OUT");

      const profile = buildAuthProfileFromSession(session);
      setUser(profile);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const session = await getAuthClient().getSession();
      
      if (!session) {
        setUser(null);
        return;
      }

      setUser(buildAuthProfileFromSession(session));
    } catch (error) {
      console.error("Error checking session:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const session = await getAuthClient().signUp(email, password, {
        displayName: name,
        metadata: {
          name,
          role: "user",
        },
        redirectTo: getOAuthRedirectTarget(),
      });

      if (session) {
        const profile = buildAuthProfileFromSession(session);
        setUser(profile);
        return;
      }

      await signIn(email, password);
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      const session = await getAuthClient().signInWithPassword(email, password);
      setUser(buildAuthProfileFromSession(session));
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    try {
      setLoading(true);

      await getAuthClient().signInWithOAuth(provider, {
        redirectTo: getOAuthRedirectTarget(),
      });

      // OAuth redirects to provider, so no need to update state here
      // The onAuthStateChange listener will handle the session after redirect
    } catch (error) {
      console.error(`${provider} OAuth sign in error:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await getAuthClient().signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) throw new Error("No user logged in");

      await getAuthClient().updateUser({
        data: {
          name: updates.name || user.name,
          avatar: updates.avatar || user.avatar,
        },
      });

      setUser({ ...user, ...updates });
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await getAuthClient().resetPasswordForEmail(
        email,
        getResetPasswordRedirectTarget()
      );
    } catch (error) {
      console.error("Password reset error:", error);
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      await getAuthClient().updateUser({
        password: newPassword,
      });
    } catch (error) {
      console.error("Update password error:", error);
      throw error;
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      return await getAuthToken();
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signInWithOAuth,
        signOut,
        updateProfile,
        resetPassword,
        updatePassword,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Legacy export removed - use getAuthClient() instead
