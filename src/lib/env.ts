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
  /** Optional direct per-function domains, e.g. { "scriptony-projects": "https://..." }. */
  functionDomainMap: Record<string, string>;
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

/**
 * HTTPS pages cannot fetch `http://` function URLs (mixed content). If the SPA is secure and the
 * map only lists `http://`, rewrite to `https://` so TLS-enabled function domains work without
 * duplicating env.
 *
 * Self-hosted Appwrite proxy often serves **HTTP on :8080** and **HTTPS on :443**. Rewriting only
 * the scheme would yield `https://host:8080`, which typically 404s — drop **:8080** when switching
 * to HTTPS. For other ports, keep the port. Set `https://…` explicitly in the map if your setup differs.
 */
export function upgradeHttpFunctionUrlForSecurePage(url: string): string {
  if (typeof window === "undefined") return url;
  if (window.location.protocol !== "https:") return url;
  if (!url.startsWith("http://")) return url;

  try {
    const u = new URL(url);
    u.protocol = "https:";
    if (u.port === "8080") {
      u.port = "";
    }
    return u.href.replace(/\/$/, "");
  } catch {
    return `https://${url.slice(7)}`;
  }
}

/**
 * Vite dev: self-hosted function domains often use TLS certs the browser does not trust
 * (`ERR_CERT_AUTHORITY_INVALID` on `https://*.appwrite…`). Set `VITE_DEV_FUNCTIONS_USE_HTTP=true`
 * to call the same host over `http://…:8080` instead. Set to `false` if your cert is valid locally.
 */
export function devFunctionUrlUsePlainHttp(url: string): string {
  if (!import.meta.env.DEV) return url;
  if (validateString(env.VITE_DEV_FUNCTIONS_USE_HTTP) !== "true") return url;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return url;
    u.protocol = "http:";
    if (!u.port || u.port === "443") {
      u.port = "8080";
    }
    return u.href.replace(/\/$/, "");
  } catch {
    return url;
  }
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
export function parseFunctionDomainMap(raw: unknown): Record<string, string> {
  const s = validateString(raw);
  if (!s) {
    return {};
  }
  try {
    const parsed = JSON.parse(s) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const key = typeof k === "string" ? k.trim() : "";
      const val = typeof v === "string" ? v.trim() : "";
      if (key && val) {
        out[key] = trimTrailingSlash(val);
      }
    }
    return out;
  } catch {
    return {};
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

  return _backendConfig!;
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
      Object.keys(backendConfig.functionDomainMap).length > 0
  );
}

export function hasFunctionConfigured(functionName: string): boolean {
  return Boolean(
    backendConfig.functionDomainMap[functionName] || backendConfig.functionsBaseUrl?.trim()
  );
}

if (appConfig.isDevelopment) {
  const missingAppwrite = getMissingAppwriteConfig();
  /* eslint-disable no-console -- dev-only diagnostics */
  console.log("Environment ready:", {
    functionsBaseUrl: backendConfig.functionsBaseUrl || "(unset)",
    functionDomainMapKeys: Object.keys(backendConfig.functionDomainMap),
    appwriteEndpoint: backendConfig.appwrite?.endpoint || "(unset)",
    missingAppwriteConfig: missingAppwrite,
  });
  /* eslint-enable no-console */

  const ep = backendConfig.appwrite?.endpoint;
  const fb = backendConfig.functionsBaseUrl;
  const hasMap = Object.keys(backendConfig.functionDomainMap).length > 0;
  if (ep && fb && trimTrailingSlash(ep) === trimTrailingSlash(fb) && !hasMap) {
    console.warn(
      "[Scriptony] VITE_BACKEND_API_BASE_URL (or VITE_APPWRITE_FUNCTIONS_BASE_URL) equals the Appwrite API base. " +
        "The app then requests …/v1/scriptony-projects/… — that path is not served by Appwrite core, and the browser " +
        "preflight often fails (e.g. Authorization not in Access-Control-Allow-Headers). " +
        "Set VITE_BACKEND_FUNCTION_DOMAIN_MAP (JSON from Console → Functions → Domains) or a gateway base; see docs/DEPLOYMENT.md."
    );
  }
}
