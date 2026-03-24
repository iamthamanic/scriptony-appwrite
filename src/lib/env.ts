/**
 * Frontend runtime configuration (Vite `import.meta.env`).
 *
 * Single place for public, browser-safe settings: Appwrite endpoint/project, functions base URL,
 * auth redirect URLs, Capacitor deep links. Never put API keys here — they would ship to clients.
 *
 * Self-hosted: point `VITE_APPWRITE_*` at your Docker/VPS Appwrite URL (see docs/SELF_HOSTING.md).
 * Location: src/lib/env.ts
 */

export interface AppwritePublicConfig {
  /** Appwrite API endpoint, e.g. https://cloud.appwrite.io/v1 */
  endpoint: string;
  projectId: string;
}

export interface CapacitorConfig {
  appId: string;
  urlScheme: string;
  callbackHost: string;
}

export interface BackendConfig {
  provider: "appwrite";
  appwrite: AppwritePublicConfig | null;
  /** Base URL of deployed Scriptony functions (path prefix before function name). */
  functionsBaseUrl: string;
  /**
   * Optional: Appwrite per-function HTTP domains (Console → Functions → Domains).
   * Keys are function IDs (e.g. scriptony-projects). When set, requests use joinUrl(domain, route)
   * instead of joinUrl(base, functionId, route) — matches Appwrite’s function URLs.
   */
  functionDomainMap: Record<string, string> | null;
  publicAuthToken: string;
  capacitor: CapacitorConfig;
}

export interface AppConfig {
  isDevelopment: boolean;
  isProduction: boolean;
}

const env = import.meta.env;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

function validateString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function joinUrl(base: string, path: string): string {
  if (!base) return path;
  if (!path) return base;
  return `${trimTrailingSlash(base)}/${trimLeadingSlash(path)}`;
}

let _backendConfig: BackendConfig | null = null;

/**
 * Appwrite endpoint + project for the web SDK (no API keys in the browser).
 */
export function getAppwritePublicConfig(): AppwritePublicConfig | null {
  const endpointRaw = validateString(env.VITE_APPWRITE_ENDPOINT);
  const projectId = validateString(env.VITE_APPWRITE_PROJECT_ID);
  if (!endpointRaw || !projectId) {
    return null;
  }

  return {
    endpoint: trimTrailingSlash(endpointRaw),
    projectId,
  };
}

export function getMissingAppwriteConfig(): string[] {
  const missing: string[] = [];
  if (!validateString(env.VITE_APPWRITE_ENDPOINT)) {
    missing.push("VITE_APPWRITE_ENDPOINT");
  }
  if (!validateString(env.VITE_APPWRITE_PROJECT_ID)) {
    missing.push("VITE_APPWRITE_PROJECT_ID");
  }
  return missing;
}

/**
 * Parses VITE_BACKEND_FUNCTION_DOMAIN_MAP: one-line JSON object { "scriptony-projects": "https://…", … }.
 */
export function parseFunctionDomainMap(raw: unknown): Record<string, string> | null {
  const s = validateString(raw);
  if (!s) {
    return null;
  }
  try {
    const parsed = JSON.parse(s) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const key = typeof k === "string" ? k.trim() : "";
      const val = typeof v === "string" ? v.trim() : "";
      if (key && val) {
        out[key] = trimTrailingSlash(val);
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function getBackendConfig(): BackendConfig {
  if (_backendConfig) {
    return _backendConfig;
  }

  const functionsBaseUrl = trimTrailingSlash(
    validateString(env.VITE_APPWRITE_FUNCTIONS_BASE_URL) ||
      validateString(env.VITE_BACKEND_API_BASE_URL)
  );

  const functionDomainMap = parseFunctionDomainMap(env.VITE_BACKEND_FUNCTION_DOMAIN_MAP);

  _backendConfig = {
    provider: "appwrite",
    appwrite: getAppwritePublicConfig(),
    functionsBaseUrl,
    functionDomainMap,
    publicAuthToken: validateString(env.VITE_BACKEND_PUBLIC_TOKEN) || "",
    capacitor: {
      appId: validateString(env.VITE_CAPACITOR_APP_ID) || "ai.scriptony.app",
      urlScheme: validateString(env.VITE_CAPACITOR_URL_SCHEME) || "scriptony",
      callbackHost: validateString(env.VITE_CAPACITOR_CALLBACK_HOST) || "auth-callback",
    },
  };

  return _backendConfig;
}

let _appConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (_appConfig) {
    return _appConfig;
  }

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  const isDevelopment =
    hostname === "localhost" ||
    hostname.startsWith("127.0.0.1") ||
    validateString(env.MODE) === "development";

  _appConfig = {
    isDevelopment,
    isProduction: !isDevelopment,
  };

  return _appConfig;
}

export function getAuthRedirectUrl(): string {
  const custom = validateString(env.VITE_AUTH_REDIRECT_URL);
  if (custom) return custom;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return validateString(env.VITE_APP_WEB_URL) || "http://localhost:5173";
}

export function getPasswordResetRedirectUrl(): string {
  const custom = validateString(env.VITE_PASSWORD_RESET_REDIRECT_URL);
  if (custom) return custom;

  return joinUrl(getAuthRedirectUrl(), "reset-password");
}

export function getCapacitorCallbackUrl(path = ""): string {
  const { urlScheme, callbackHost } = getBackendConfig().capacitor;
  if (!path) {
    return `${urlScheme}://${callbackHost}`;
  }

  return `${urlScheme}://${callbackHost}/${trimLeadingSlash(path)}`;
}

export const backendConfig = getBackendConfig();
export const appConfig = getAppConfig();

/** True if path-style base and/or per-function domain map is set. */
export function isBackendConfigured(): boolean {
  return Boolean(
    backendConfig.functionsBaseUrl?.trim() ||
      (backendConfig.functionDomainMap &&
        Object.keys(backendConfig.functionDomainMap).length > 0)
  );
}

if (appConfig.isDevelopment) {
  const missingAppwrite = getMissingAppwriteConfig();
  /* eslint-disable no-console -- dev-only diagnostics */
  console.log("Environment ready:", {
    functionsBaseUrl: backendConfig.functionsBaseUrl || "(unset)",
    functionDomainMapKeys: backendConfig.functionDomainMap
      ? Object.keys(backendConfig.functionDomainMap)
      : [],
    appwriteEndpoint: backendConfig.appwrite?.endpoint || "(unset)",
    missingAppwriteConfig: missingAppwrite,
  });
  /* eslint-enable no-console */

  const ep = backendConfig.appwrite?.endpoint;
  const fb = backendConfig.functionsBaseUrl;
  const hasMap =
    backendConfig.functionDomainMap &&
    Object.keys(backendConfig.functionDomainMap).length > 0;
  if (ep && fb && trimTrailingSlash(ep) === trimTrailingSlash(fb) && !hasMap) {
    console.warn(
      "[Scriptony] VITE_BACKEND_API_BASE_URL (or VITE_APPWRITE_FUNCTIONS_BASE_URL) equals the Appwrite API base. " +
        "The app then requests …/v1/scriptony-projects/… — that path is not served by Appwrite core, and the browser " +
        "preflight often fails (e.g. Authorization not in Access-Control-Allow-Headers). " +
        "Set VITE_BACKEND_FUNCTION_DOMAIN_MAP (JSON from Console → Functions → Domains) or a gateway base; see docs/DEPLOYMENT.md."
    );
  }
}
