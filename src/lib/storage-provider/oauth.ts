/**
 * Storage provider OAuth – build authorize URL and handle callback hash.
 * Tokens are stored only in the client (sessionStorage).
 */

import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../api-gateway";

const SESSION_PREFIX = "scriptony_storage_oauth_";

export function getStorageOAuthAuthorizeUrl(provider: string): string {
  const base = buildFunctionRouteUrl(EDGE_FUNCTIONS.AUTH, "/storage-providers/oauth/authorize");
  const redirectUri = getReturnUri();
  return `${base}?provider=${encodeURIComponent(provider)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

function getReturnUri(): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const path = window.location.pathname || "/";
  const hash = window.location.hash || "#/settings";
  return `${origin}${path}${hash}`;
}

export interface StorageOAuthTokens {
  provider: string;
  access_token: string;
  refresh_token?: string;
}

export function getStoredStorageOAuthTokens(provider: string): StorageOAuthTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + provider);
    if (!raw) return null;
    return JSON.parse(raw) as StorageOAuthTokens;
  } catch {
    return null;
  }
}

export function setStoredStorageOAuthTokens(data: StorageOAuthTokens): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_PREFIX + data.provider, JSON.stringify(data));
}

export function clearStoredStorageOAuthTokens(provider: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_PREFIX + provider);
}

/**
 * Parse hash for storage_oauth=success and return tokens if present.
 * Hash may be "#/settings#storage_oauth=success&provider=...&access_token=..."
 */
export function parseStorageOAuthCallbackHash(): StorageOAuthTokens | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1);
  const oauthPart = hash.includes("storage_oauth=")
    ? hash.split("#").find((s) => s.includes("storage_oauth=")) || ""
    : hash;
  const params = new URLSearchParams(oauthPart.includes("?") ? oauthPart.split("?")[1] : oauthPart);
  if (params.get("storage_oauth") !== "success") return null;
  const provider = params.get("provider");
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token") || undefined;
  if (!provider || !access_token) return null;
  return { provider, access_token, refresh_token };
}

/**
 * Remove OAuth params from current hash and set hash to #/settings.
 */
export function clearStorageOAuthFromHash(): void {
  if (typeof window === "undefined") return;
  const hash = window.location.hash.slice(1);
  const firstPart = hash.split("#")[0] || "/settings";
  const base = firstPart.includes("?") ? firstPart.split("?")[0] : firstPart;
  window.history.replaceState(null, "", "#" + (base || "/settings"));
}

export const OAUTH_PROVIDERS = ["google_drive", "dropbox"] as const;
