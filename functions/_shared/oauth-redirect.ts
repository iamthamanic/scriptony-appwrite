/**
 * OAuth redirect_uri allowlist validation.
 * Prevents open redirect and token leakage to third-party sites.
 */

import { getOptionalEnv } from "./env";

const MAX_REDIRECT_URI_LENGTH = 2048;

function getAllowedOrigins(): string[] {
  const list = getOptionalEnv("scriptony_oauth_allowed_redirect_origins");
  if (list) {
    return list.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  const single = getOptionalEnv("VITE_APP_WEB_URL");
  if (single) {
    try {
      return [new URL(single).origin.toLowerCase()];
    } catch {
      return [];
    }
  }
  return [];
}

function getOriginFromUri(redirectUri: string): string | null {
  try {
    return new URL(redirectUri).origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Returns true if redirect_uri is allowed (same-origin or in allowlist).
 * Rejects overly long URIs and invalid URLs.
 */
export function isRedirectUriAllowed(redirectUri: string): boolean {
  if (!redirectUri || redirectUri.length > MAX_REDIRECT_URI_LENGTH) {
    return false;
  }
  const origin = getOriginFromUri(redirectUri);
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  return allowed.length > 0 && allowed.includes(origin);
}

/**
 * For error redirects: return app base URL without path, or null if not configured.
 */
export function getAppBaseUrl(): string | null {
  return getOptionalEnv("VITE_APP_WEB_URL") || null;
}
