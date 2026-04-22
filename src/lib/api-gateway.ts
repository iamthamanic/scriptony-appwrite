/**
 * API gateway: maps SPA routes to deployed Scriptony HTTP functions.
 *
 * Responsibility (single): choose which `scriptony-*` function serves a path (`ROUTE_MAP` +
 * small special cases). URL joining uses `joinUrl` from `env.ts` (DRY).
 * Adding a feature surface: extend `ROUTE_MAP` and implement the handler under `functions/`.
 *
 * Location: src/lib/api-gateway.ts
 */

import {
  backendConfig,
  devFunctionUrlUsePlainHttp,
  joinUrl,
  upgradeHttpFunctionUrlForSecurePage,
} from "./env";

export type ApiGatewayErrorLayer =
  | "transport"
  | "function-auth"
  | "function-response";

type ApiGatewayErrorInit = {
  layer: ApiGatewayErrorLayer;
  functionName: string;
  route: string;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  code?: string;
  details?: unknown;
};

export class ApiGatewayError extends Error {
  readonly layer: ApiGatewayErrorLayer;
  readonly functionName: string;
  readonly route: string;
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly statusText?: string;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, init: ApiGatewayErrorInit) {
    super(message);
    this.name = "ApiGatewayError";
    this.layer = init.layer;
    this.functionName = init.functionName;
    this.route = init.route;
    this.url = init.url;
    this.method = init.method;
    this.status = init.status;
    this.statusText = init.statusText;
    this.code = init.code;
    this.details = init.details;
  }
}

// =============================================================================
// BACKEND FUNCTION DEFINITIONS
// =============================================================================

/**
 * Backend function names exposed by the current provider.
 */
export const BACKEND_FUNCTIONS = {
  MAIN_SERVER: "make-server-3b52693b", // legacy unified server / special routes
  PROJECTS: "scriptony-projects",
  PROJECT_NODES: "scriptony-project-nodes", // template engine / nodes
  SHOTS: "scriptony-shots",
  /** Editorial timeline clips (NLE segments). */
  CLIPS: "scriptony-clips",
  CHARACTERS: "scriptony-characters",
  /** Style Guide (project_visual_style + items). Deploy `scriptony-style-guide`. */
  STYLE_GUIDE: "scriptony-style-guide",
  AUDIO: "scriptony-audio", // selected in getBackendFunctionForRoute for paths under /shots/... (audio)
  /** Hörbuch/Hörspiel Audio Production: sessions, tracks, voices, mixing. */
  AUDIO_STORY: "scriptony-audio-story",
  BEATS: "scriptony-beats",
  WORLDBUILDING: "scriptony-worldbuilding",
  /** Unified AI service: `/ai/*`, feature config, provider keys (replaces assistant for gateway `/ai`). */
  AI: "scriptony-ai",
  ASSISTANT: "scriptony-assistant",
  IMAGE: "scriptony-image",
  /** Puppet-Layer: render-job orchestrator (accept/reject/complete lifecycle). */
  STAGE: "scriptony-stage",
  /** Puppet-Layer: 2D layer & repair endpoints. */
  STAGE2D: "scriptony-stage2d",
  /** Puppet-Layer: 3D view-state endpoints. */
  STAGE3D: "scriptony-stage3d",
  /** Puppet-Layer: style-profile CRUD + apply. */
  STYLE: "scriptony-style",
  /** Puppet-Layer: Blender ingress (sync metadata only). */
  SYNC: "scriptony-sync",
  GYM: "scriptony-gym",
  AUTH: "scriptony-auth",
  SUPERADMIN: "scriptony-superadmin",
  STATS: "scriptony-stats",
  LOGS: "scriptony-logs",
  /** Internal MCP-style capability host (thin HTTP entry). */
  MCP_APPWRITE: "scriptony-mcp-appwrite",
} as const;

export const EDGE_FUNCTIONS = BACKEND_FUNCTIONS;

/**
 * Backend function base URLs
 */
export function buildFunctionBaseUrl(functionName: string): string {
  /**
   * Dev-only: same-origin proxy in vite.config.ts avoids browser CORS when
   * Appwrite's executor returns errors without CORS headers (cold starts, crashes).
   * Works for ALL functions that have an entry in VITE_BACKEND_FUNCTION_DOMAIN_MAP.
   */
  if (import.meta.env.DEV && backendConfig.functionDomainMap?.[functionName]) {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    return `${origin}/__dev-proxy/${functionName}`.replace(/\/+$/, "");
  }

  const domain = backendConfig.functionDomainMap?.[functionName]?.trim();
  if (domain) {
    return domain.replace(/\/+$/, "");
  }

  if (!backendConfig.functionsBaseUrl?.trim()) {
    throw new Error(
      `Backend function "${functionName}" is not configured: add it to VITE_BACKEND_FUNCTION_DOMAIN_MAP or set VITE_BACKEND_API_BASE_URL / VITE_APPWRITE_FUNCTIONS_BASE_URL.`,
    );
  }

  if (!backendConfig.functionsBaseUrl) {
    throw new Error(
      `Backend function URL is not configured for ${functionName}.`,
    );
  }

  return upgradeHttpFunctionUrlForSecurePage(
    devFunctionUrlUsePlainHttp(
      joinUrl(backendConfig.functionsBaseUrl, functionName),
    ),
  );
}

export function buildFunctionRouteUrl(
  functionName: string,
  route = "",
): string {
  const baseUrl = buildFunctionBaseUrl(functionName);
  return route ? joinUrl(baseUrl, route) : baseUrl;
}

// =============================================================================
// ROUTE MAPPING
// =============================================================================

/**
 * Maps URL path prefixes (SPA route argument to apiGateway) → function slug.
 * Resolution: longest matching prefix wins (`route.startsWith(prefix)`); see getBackendFunctionForRoute
 * for exceptions (e.g. audio under /shots/* → AUDIO before this map is used for /shots).
 */
const ROUTE_MAP: Record<string, string> = {
  // scriptony-auth
  "/signup": BACKEND_FUNCTIONS.AUTH,
  "/create-demo-user": BACKEND_FUNCTIONS.AUTH,
  "/profile": BACKEND_FUNCTIONS.AUTH,
  "/organizations": BACKEND_FUNCTIONS.AUTH,
  "/integration-tokens": BACKEND_FUNCTIONS.AUTH,
  "/storage": BACKEND_FUNCTIONS.AUTH,
  "/storage-providers": BACKEND_FUNCTIONS.AUTH,

  // scriptony-projects
  "/projects": BACKEND_FUNCTIONS.PROJECTS,

  // scriptony-style-guide (prefix before shorter routes)
  "/style-guide": BACKEND_FUNCTIONS.STYLE_GUIDE,

  // scriptony-project-nodes
  "/nodes": BACKEND_FUNCTIONS.PROJECT_NODES,
  "/initialize-project": BACKEND_FUNCTIONS.PROJECT_NODES,

  // scriptony-shots (audio-specific paths handled in getBackendFunctionForRoute → AUDIO)
  "/shots": BACKEND_FUNCTIONS.SHOTS,

  // scriptony-clips (editorial timeline; must not prefix-match /shots)
  "/clips": BACKEND_FUNCTIONS.CLIPS,

  // scriptony-characters
  "/characters": BACKEND_FUNCTIONS.CHARACTERS,
  "/timeline-characters": BACKEND_FUNCTIONS.CHARACTERS,

  // scriptony-stats, scriptony-logs
  "/stats": BACKEND_FUNCTIONS.STATS,
  "/logs": BACKEND_FUNCTIONS.LOGS,

  // scriptony-beats
  "/beats": BACKEND_FUNCTIONS.BEATS,

  // scriptony-worldbuilding
  "/worlds": BACKEND_FUNCTIONS.WORLDBUILDING,
  "/locations": BACKEND_FUNCTIONS.WORLDBUILDING,

  // scriptony-mcp-appwrite (longer prefix before shorter assistant routes if path overlaps)
  "/scriptony-mcp": BACKEND_FUNCTIONS.MCP_APPWRITE,

  // scriptony-image (must be above /ai prefix)
  "/ai/image": BACKEND_FUNCTIONS.IMAGE,

  // ---------------------------------------------------------------------------
  // Puppet-Layer surfaces (longer prefixes before shorter /ai catch-all)
  // ---------------------------------------------------------------------------

  // scriptony-stage: render-job orchestrator + repair dispatch
  "/ai/jobs": BACKEND_FUNCTIONS.STAGE,
  "/ai/stage": BACKEND_FUNCTIONS.STAGE,
  "/stage": BACKEND_FUNCTIONS.STAGE,

  // scriptony-stage2d: 2D document & layer endpoints
  "/ai/stage2d": BACKEND_FUNCTIONS.STAGE2D,

  // scriptony-stage3d: 3D view-state endpoints
  "/ai/stage3d": BACKEND_FUNCTIONS.STAGE3D,

  // scriptony-style: style-profile CRUD + apply
  "/ai/style": BACKEND_FUNCTIONS.STYLE,

  // scriptony-sync: Blender ingress (sync metadata only, no product decisions)
  "/ai/sync": BACKEND_FUNCTIONS.SYNC,
  "/sync": BACKEND_FUNCTIONS.SYNC,

  // ---------------------------------------------------------------------------
  // scriptony-assistant: canonical /ai/assistant/* + legacy /ai/{chat,settings,…}
  // scriptony-assistant accepts both prefixes (dual-prefix normalisation).
  // ---------------------------------------------------------------------------
  "/ai/assistant": BACKEND_FUNCTIONS.ASSISTANT,

  // Legacy assistant paths — routed directly to ASSISTANT so scriptony-ai
  // no longer needs to proxy them via dispatchAssistantLegacyRoute().
  "/ai/chat": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/conversations": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/rag": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/settings": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/models": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/validate-key": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/count-tokens": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/gym": BACKEND_FUNCTIONS.ASSISTANT,

  // ---------------------------------------------------------------------------
  // scriptony-ai control plane (provider registry, feature routing, key storage)
  // ---------------------------------------------------------------------------
  "/providers": BACKEND_FUNCTIONS.AI,
  "/api-keys": BACKEND_FUNCTIONS.AI,
  "/features": BACKEND_FUNCTIONS.AI,
  "/settings": BACKEND_FUNCTIONS.AI,

  // scriptony-ai catch-all for remaining /ai/* (route-request, future control-plane routes)
  "/ai": BACKEND_FUNCTIONS.AI,

  // Remaining standalone assistant-only routes (legacy non-/ai paths)
  "/conversations": BACKEND_FUNCTIONS.ASSISTANT,
  "/rag": BACKEND_FUNCTIONS.ASSISTANT,
  "/mcp": BACKEND_FUNCTIONS.ASSISTANT,

  // scriptony-gym
  "/exercises": BACKEND_FUNCTIONS.GYM,
  "/progress": BACKEND_FUNCTIONS.GYM,
  "/achievements": BACKEND_FUNCTIONS.GYM,
  "/categories": BACKEND_FUNCTIONS.GYM,
  "/daily-challenge": BACKEND_FUNCTIONS.GYM,

  // scriptony-superadmin
  "/superadmin": BACKEND_FUNCTIONS.SUPERADMIN,
};

/**
 * Determines which backend function to use for a given route.
 */
function getBackendFunctionForRoute(route: string): string {
  // Audio routes live under /shots/... but must hit scriptony-audio, not scriptony-shots.
  if (
    route.includes("/upload-audio") ||
    route.includes("/shots/audio/") ||
    route.match(/\/shots\/[^/]+\/audio$/)
  ) {
    return BACKEND_FUNCTIONS.AUDIO;
  }

  // Longest-prefix match (more specific routes win over shorter shared prefixes)
  const sortedPrefixes = Object.keys(ROUTE_MAP).sort(
    (a, b) => b.length - a.length,
  );
  const matchedPrefix = sortedPrefixes.find((prefix) =>
    route.startsWith(prefix),
  );

  if (!matchedPrefix) {
    console.warn(`[API Gateway] No backend function found for route: ${route}`);
    // Fallback to projects function for unknown routes
    return BACKEND_FUNCTIONS.PROJECTS;
  }

  return ROUTE_MAP[matchedPrefix];
}

// =============================================================================
// API GATEWAY
// =============================================================================

export interface ApiGatewayOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  route: string;
  body?: any;
  headers?: Record<string, string>;
  accessToken?: string;
}

/** Appwrite/proxy sometimes returns an HTML error page instead of `{ error: string }` JSON. */
function humanizeHtmlOrGatewayError(
  functionName: string,
  status: number,
  raw: string,
): string {
  const trimmed = raw.trim();
  if (status === 408) {
    return (
      `Gateway timeout (408) before the function finished — common for slow image APIs. ` +
      `Restart \`npm run dev\` after vite proxy changes; on self‑hosted stacks increase reverse-proxy read timeouts ` +
      `(e.g. nginx \`proxy_read_timeout\`) in front of the function host. ` +
      `Appwrite → Functions → ${functionName}: execution timeout 300s+; optional env SCRIPTONY_IMAGE_UPSTREAM_TIMEOUT_MS on the function.`
    );
  }
  const looksHtml =
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    /unexpected server error/i.test(trimmed);
  if (!looksHtml) {
    return trimmed.slice(0, 2000);
  }
  return (
    `Appwrite/proxy returned HTML (${status}) instead of JSON — often a function timeout, executor crash, or dev-proxy timeout. ` +
    `Check Appwrite → Functions → ${functionName} (Logs, increase timeout for image generation). ` +
    `After changing vite.config proxy timeouts, restart \`npm run dev\`.`
  );
}

function getResponseErrorCode(errorData: unknown): string | undefined {
  if (!errorData || typeof errorData !== "object" || Array.isArray(errorData)) {
    return undefined;
  }
  const code = (errorData as { code?: unknown }).code;
  return typeof code === "string" && code.trim() ? code.trim() : undefined;
}

function getResponseErrorMessage(
  functionName: string,
  status: number,
  errorData: unknown,
): string {
  if (errorData && typeof errorData === "object" && !Array.isArray(errorData)) {
    const payload = errorData as {
      error?: unknown;
      message?: unknown;
      details?: unknown;
    };
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
    if (typeof payload.details === "string" && payload.details.trim()) {
      return payload.details.trim();
    }
    return JSON.stringify(errorData);
  }

  return humanizeHtmlOrGatewayError(
    functionName,
    status,
    String(errorData ?? ""),
  );
}

/**
 * Makes an API call through the API Gateway
 *
 * Automatically routes the request to the correct backend function
 * based on the route prefix.
 *
 * @example
 * ```typescript
 * // Automatically routed to scriptony-timeline
 * const shots = await apiGateway({
 *   method: 'GET',
 *   route: '/shots/scene-123',
 *   accessToken: token,
 * });
 *
 * // Routed to scriptony-ai (Hono: `/ai/chat`, `/ai/settings`, …)
 * const response = await apiGateway({
 *   method: 'POST',
 *   route: '/ai/chat',
 *   body: { message: 'Hello' },
 *   accessToken: token,
 * });
 * ```
 */
export async function apiGateway<T = any>(
  options: ApiGatewayOptions,
): Promise<T> {
  const { method, route, body, headers = {}, accessToken } = options;

  // Determine which backend function to use
  const functionName = getBackendFunctionForRoute(route);

  const baseUrl = buildFunctionBaseUrl(functionName);

  const url = joinUrl(baseUrl, route);

  // Build headers
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  const bearerToken = accessToken || backendConfig.publicAuthToken;
  if (bearerToken) {
    requestHeaders.Authorization = `Bearer ${bearerToken}`;
  }
  // Note: We do NOT send x-appwrite-user-jwt on browser fetch - it's a non-simple header
  // that triggers CORS preflight. The backend validates the Bearer token instead.

  // Make request with error handling
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (fetchError: any) {
    console.error(`[API Gateway] Transport failure`, {
      method,
      route,
      url,
      functionName,
      error: fetchError?.message || String(fetchError),
    });
    throw new ApiGatewayError(
      `Cannot connect to ${functionName}: ${fetchError?.message || "Network request failed"}`,
      {
        layer: "transport",
        functionName,
        route,
        url,
        method,
        details: fetchError,
      },
    );
  }

  // Handle response
  if (!response.ok) {
    const errorText = await response.text();

    // Try to parse error as JSON for better logging
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = errorText;
    }

    const errorCode = getResponseErrorCode(errorData);
    const errorMessage = getResponseErrorMessage(
      functionName,
      response.status,
      errorData,
    );
    const layer: ApiGatewayErrorLayer =
      response.status === 401 || response.status === 403
        ? "function-auth"
        : "function-response";

    const logPayload = {
      method,
      route,
      url,
      functionName,
      status: response.status,
      statusText: response.statusText,
      code: errorCode,
      error: errorMessage,
      response: errorData,
    };

    if (layer === "function-auth") {
      console.warn(`[API Gateway] Function auth rejected request`, logPayload);
    } else {
      console.error(`[API Gateway] Function responded with error`, logPayload);
    }

    throw new ApiGatewayError(errorMessage, {
      layer,
      functionName,
      route,
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      code: errorCode,
      details: errorData,
    });
  }

  const data = await response.json();
  return data;
}

// =============================================================================
// CONVENIENCE METHODS
// =============================================================================

/**
 * GET request through API Gateway
 */
export async function apiGet<T = any>(
  route: string,
  accessToken?: string,
): Promise<T> {
  return apiGateway<T>({ method: "GET", route, accessToken });
}

/**
 * POST request through API Gateway
 */
export async function apiPost<T = any>(
  route: string,
  body: any,
  accessToken?: string,
): Promise<T> {
  return apiGateway<T>({ method: "POST", route, body, accessToken });
}

/**
 * PUT request through API Gateway
 */
export async function apiPut<T = any>(
  route: string,
  body: any,
  accessToken?: string,
): Promise<T> {
  return apiGateway<T>({ method: "PUT", route, body, accessToken });
}

/**
 * DELETE request through API Gateway
 */
export async function apiDelete<T = any>(
  route: string,
  accessToken?: string,
): Promise<T> {
  return apiGateway<T>({ method: "DELETE", route, accessToken });
}

/**
 * PATCH request through API Gateway
 */
export async function apiPatch<T = any>(
  route: string,
  body: any,
  accessToken?: string,
): Promise<T> {
  return apiGateway<T>({ method: "PATCH", route, body, accessToken });
}

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * Get API base URL for a specific function
 *
 * @deprecated Use apiGateway() instead for automatic routing
 */
export function getApiBase(functionName: keyof typeof EDGE_FUNCTIONS): string {
  return buildFunctionBaseUrl(EDGE_FUNCTIONS[functionName]);
}

// Legacy API removed - all endpoints now use specialized backend functions via apiGateway()
