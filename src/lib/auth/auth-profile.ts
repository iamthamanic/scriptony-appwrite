/**
 * Normalized auth profile helpers.
 *
 * This keeps the UI independent from provider-specific session payloads.
 */

import type { AuthSession, AuthUserProfile } from "./AuthClient";

function coerceRole(value: unknown): AuthUserProfile["role"] {
  if (value === "admin" || value === "superadmin") {
    return value;
  }

  return "user";
}

export function buildAuthProfileFromSession(
  session: AuthSession | null
): AuthUserProfile | null {
  if (!session?.profile) {
    return null;
  }

  return {
    ...session.profile,
    role: coerceRole(session.profile.role),
  };
}
