/**
 * API gateway: maps SPA routes to deployed Scriptony HTTP functions.
 *
 * Responsibility (single): choose which `scriptony-*` function serves a path (`ROUTE_MAP` +
 * small special cases). URL joining uses `joinUrl` from `env.ts` (DRY).
 * Adding a feature surface: extend `ROUTE_MAP` and implement the handler under `functions/`.
 *
 * Location: src/lib/api-gateway.ts
 */

import { backendConfig, joinUrl } from './env';

// =============================================================================
// BACKEND FUNCTION DEFINITIONS
// =============================================================================

/**
 * Backend function names exposed by the current provider.
 */
export const BACKEND_FUNCTIONS = {
  MAIN_SERVER: 'make-server-3b52693b', // legacy unified server / special routes
  PROJECTS: 'scriptony-projects',
  PROJECT_NODES: 'scriptony-project-nodes', // template engine / nodes
  TIMELINE_V2: 'scriptony-timeline-v2', // deprecated: prefer PROJECT_NODES
  SHOTS: 'scriptony-shots',
  CHARACTERS: 'scriptony-characters',
  INSPIRATION: 'scriptony-inspiration',
  AUDIO: 'scriptony-audio', // selected in getBackendFunctionForRoute for paths under /shots/... (audio)
  BEATS: 'scriptony-beats',
  WORLDBUILDING: 'scriptony-worldbuilding',
  ASSISTANT: 'scriptony-assistant',
  GYM: 'scriptony-gym',
  AUTH: 'scriptony-auth',
  SUPERADMIN: 'scriptony-superadmin',
  STATS: 'scriptony-stats',
  LOGS: 'scriptony-logs',
} as const;

export const EDGE_FUNCTIONS = BACKEND_FUNCTIONS;

/**
 * Backend function base URLs
 */
export function buildFunctionBaseUrl(functionName: string): string {
  if (!backendConfig.functionsBaseUrl) {
    throw new Error("Backend functions base URL is not configured.");
  }

  return joinUrl(backendConfig.functionsBaseUrl, functionName);
}

export function buildFunctionRouteUrl(functionName: string, route = ''): string {
  const baseUrl = buildFunctionBaseUrl(functionName);
  return route ? joinUrl(baseUrl, route) : baseUrl;
}

// =============================================================================
// ROUTE MAPPING
// =============================================================================

/**
 * Maps URL path prefixes (SPA route argument to apiGateway) → function slug.
 * Resolution: first prefix in insertion order where `route.startsWith(prefix)`; see getBackendFunctionForRoute
 * for exceptions (e.g. audio under /shots/* → AUDIO before this map is used for /shots).
 */
const ROUTE_MAP: Record<string, string> = {
  // scriptony-auth
  '/signup': BACKEND_FUNCTIONS.AUTH,
  '/create-demo-user': BACKEND_FUNCTIONS.AUTH,
  '/profile': BACKEND_FUNCTIONS.AUTH,
  '/organizations': BACKEND_FUNCTIONS.AUTH,
  '/integration-tokens': BACKEND_FUNCTIONS.AUTH,
  '/storage': BACKEND_FUNCTIONS.AUTH,
  '/storage-providers': BACKEND_FUNCTIONS.AUTH,

  // scriptony-projects
  '/projects': BACKEND_FUNCTIONS.PROJECTS,

  // scriptony-project-nodes
  '/nodes': BACKEND_FUNCTIONS.PROJECT_NODES,
  '/initialize-project': BACKEND_FUNCTIONS.PROJECT_NODES,

  // scriptony-shots (audio-specific paths handled in getBackendFunctionForRoute → AUDIO)
  '/shots': BACKEND_FUNCTIONS.SHOTS,

  // scriptony-characters
  '/characters': BACKEND_FUNCTIONS.CHARACTERS,
  '/timeline-characters': BACKEND_FUNCTIONS.CHARACTERS,

  // scriptony-inspiration
  '/inspirations': BACKEND_FUNCTIONS.INSPIRATION,

  // scriptony-stats, scriptony-logs
  '/stats': BACKEND_FUNCTIONS.STATS,
  '/logs': BACKEND_FUNCTIONS.LOGS,

  // scriptony-beats
  '/beats': BACKEND_FUNCTIONS.BEATS,

  // scriptony-worldbuilding
  '/worlds': BACKEND_FUNCTIONS.WORLDBUILDING,
  '/locations': BACKEND_FUNCTIONS.WORLDBUILDING,

  // scriptony-assistant
  '/ai': BACKEND_FUNCTIONS.ASSISTANT,
  '/conversations': BACKEND_FUNCTIONS.ASSISTANT,
  '/rag': BACKEND_FUNCTIONS.ASSISTANT,
  '/mcp': BACKEND_FUNCTIONS.ASSISTANT,

  // scriptony-gym
  '/exercises': BACKEND_FUNCTIONS.GYM,
  '/progress': BACKEND_FUNCTIONS.GYM,
  '/achievements': BACKEND_FUNCTIONS.GYM,
  '/categories': BACKEND_FUNCTIONS.GYM,
  '/daily-challenge': BACKEND_FUNCTIONS.GYM,

  // scriptony-superadmin
  '/superadmin': BACKEND_FUNCTIONS.SUPERADMIN,
};

/**
 * Determines which backend function to use for a given route.
 */
function getBackendFunctionForRoute(route: string): string {
  // Audio routes live under /shots/... but must hit scriptony-audio, not scriptony-shots.
  if (route.includes('/upload-audio') || 
      route.includes('/shots/audio/') || 
      route.match(/\/shots\/[^/]+\/audio$/)) {
    return BACKEND_FUNCTIONS.AUDIO;
  }
  
  // Find the matching route prefix
  const matchedPrefix = Object.keys(ROUTE_MAP).find(prefix => 
    route.startsWith(prefix)
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
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  route: string;
  body?: any;
  headers?: Record<string, string>;
  accessToken?: string;
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
 * // Automatically routed to scriptony-ai
 * const response = await apiGateway({
 *   method: 'POST',
 *   route: '/ai/chat',
 *   body: { message: 'Hello' },
 *   accessToken: token,
 * });
 * ```
 */
export async function apiGateway<T = any>(
  options: ApiGatewayOptions
): Promise<T> {
  const { method, route, body, headers = {}, accessToken } = options;
  
  // Determine which backend function to use
  const functionName = getBackendFunctionForRoute(route);
  const baseUrl = buildFunctionBaseUrl(functionName);
  
  console.log(`[API Gateway] ${method} ${route} → ${functionName}`);
  
  const url = joinUrl(baseUrl, route);
  
  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const bearerToken = accessToken || backendConfig.publicAuthToken;
  if (bearerToken) {
    requestHeaders.Authorization = `Bearer ${bearerToken}`;
  }
  
  console.log(`[API Gateway] Fetching ${url}`);
  console.log(`[API Gateway] Headers:`, requestHeaders);
  console.log(`[API Gateway] Body (raw):`, body);
  console.log(`[API Gateway] Body (stringified):`, body ? JSON.stringify(body) : 'undefined');
  
  // Make request with error handling
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (fetchError: any) {
    console.error(`[API Gateway] Network Error:`, {
      url,
      functionName,
      error: fetchError.message,
    });
    console.error(`[API Gateway] Possible causes:`);
    console.error(`  1. Backend function "${functionName}" is not deployed`);
    console.error(`  2. CORS issue (check function CORS settings)`);
    console.error(`  3. Network/internet connection issue`);
    console.error(`  4. Backend host offline or unreachable`);
    throw new Error(`Cannot connect to ${functionName}: ${fetchError.message}`);
  }
  
  console.log(`[API Gateway] Response received:`, response.status, response.statusText);
  
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
    
    console.error(`[API Gateway] Error Response:`, {
      url,
      status: response.status,
      statusText: response.statusText,
      errorData,
    });
    
    // Extract error message if available
    const errorMessage = typeof errorData === 'object' 
      ? (errorData.error || errorData.message || errorData.details || JSON.stringify(errorData))
      : errorData;
    
    throw new Error(`API Error: ${response.status} - ${errorMessage}`);
  }
  
  const data = await response.json();
  console.log(`[API Gateway] ✅ Success Response (JSON):`, JSON.stringify(data, null, 2));
  
  // Extra detailed logging for arrays
  if (Array.isArray(data)) {
    console.log(`[API Gateway]    → Array with ${data.length} items`);
    if (data.length > 0) {
      console.log(`[API Gateway]    → First item:`, JSON.stringify(data[0], null, 2));
    }
  } else if (data && typeof data === 'object') {
    console.log(`[API Gateway]    → Object keys:`, Object.keys(data));
    if (data.projects) {
      console.log(`[API Gateway]    → Contains ${data.projects.length} projects`);
    }
  }
  
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
  accessToken?: string
): Promise<T> {
  return apiGateway<T>({ method: 'GET', route, accessToken });
}

/**
 * POST request through API Gateway
 */
export async function apiPost<T = any>(
  route: string,
  body: any,
  accessToken?: string
): Promise<T> {
  return apiGateway<T>({ method: 'POST', route, body, accessToken });
}

/**
 * PUT request through API Gateway
 */
export async function apiPut<T = any>(
  route: string,
  body: any,
  accessToken?: string
): Promise<T> {
  return apiGateway<T>({ method: 'PUT', route, body, accessToken });
}

/**
 * DELETE request through API Gateway
 */
export async function apiDelete<T = any>(
  route: string,
  accessToken?: string
): Promise<T> {
  return apiGateway<T>({ method: 'DELETE', route, accessToken });
}

/**
 * PATCH request through API Gateway
 */
export async function apiPatch<T = any>(
  route: string,
  body: any,
  accessToken?: string
): Promise<T> {
  return apiGateway<T>({ method: 'PATCH', route, body, accessToken });
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