/**
 * 🎯 API GATEWAY - Multi-Function Router
 * 
 * Routes API calls to the correct backend function based on the resource type.
 * The transport is provider-neutral so the same frontend can target Supabase or Nhost.
 */

import { backendConfig } from './env';

// =============================================================================
// BACKEND FUNCTION DEFINITIONS
// =============================================================================

/**
 * Backend function names exposed by the current provider.
 */
export const BACKEND_FUNCTIONS = {
  MAIN_SERVER: 'make-server-3b52693b', // Main unified server (fallback/special routes)
  PROJECTS: 'scriptony-projects',
  PROJECT_NODES: 'scriptony-project-nodes', // Generic Template Engine (Nodes) ✅ REFACTORED!
  TIMELINE_V2: 'scriptony-timeline-v2', // DEPRECATED: Use PROJECT_NODES instead
  SHOTS: 'scriptony-shots', // Shots Microservice (Film-specific) ✅ NEW!
  CHARACTERS: 'scriptony-characters', // Characters Microservice (Universal) ✅ NEW!
  INSPIRATION: 'scriptony-inspiration', // Visual References & Inspiration ✅ NEW!
  AUDIO: 'scriptony-audio', // Audio Processing (Upload, Waveform, Trim, Fade)
  BEATS: 'scriptony-beats', // Story Beats (Save the Cat, Hero's Journey, etc.) ✅ NEW!
  WORLDBUILDING: 'scriptony-worldbuilding',
  ASSISTANT: 'scriptony-assistant',
  GYM: 'scriptony-gym',
  AUTH: 'scriptony-auth',
  SUPERADMIN: 'scriptony-superadmin',
  STATS: 'scriptony-stats', // Statistics & Analytics ✅ PHASE 2!
  LOGS: 'scriptony-logs', // Activity Logging & Audit Trail ✅ PHASE 2!
} as const;

export const EDGE_FUNCTIONS = BACKEND_FUNCTIONS;

/**
 * Backend function base URLs
 */
export function buildFunctionBaseUrl(functionName: string): string {
  if (!backendConfig.functionsBaseUrl) {
    throw new Error("Backend functions base URL is not configured.");
  }

  return `${backendConfig.functionsBaseUrl.replace(/\/+$/, '')}/${functionName}`;
}

export function buildFunctionRouteUrl(functionName: string, route = ''): string {
  const baseUrl = buildFunctionBaseUrl(functionName);
  if (!route) {
    return baseUrl;
  }

  return route.startsWith('/')
    ? `${baseUrl}${route}`
    : `${baseUrl}/${route}`;
}

// =============================================================================
// ROUTE MAPPING
// =============================================================================

/**
 * Maps route prefixes to their corresponding backend function.
 */
const ROUTE_MAP: Record<string, string> = {
  // Auth & Account Management
  '/signup': BACKEND_FUNCTIONS.AUTH,
  '/create-demo-user': BACKEND_FUNCTIONS.AUTH,
  '/profile': BACKEND_FUNCTIONS.AUTH,
  '/organizations': BACKEND_FUNCTIONS.AUTH,
  '/integration-tokens': BACKEND_FUNCTIONS.AUTH,
  '/storage': BACKEND_FUNCTIONS.AUTH,
  
  // Projects
  '/projects': BACKEND_FUNCTIONS.PROJECTS,
  
  // Project Nodes (Generic Template Engine) ✅ REFACTORED!
  '/nodes': BACKEND_FUNCTIONS.PROJECT_NODES,
  '/initialize-project': BACKEND_FUNCTIONS.PROJECT_NODES,
  
  // Shots Microservice ✅ NEW!
  '/shots': BACKEND_FUNCTIONS.SHOTS,
  
  // Characters Microservice ✅ NEW!
  '/characters': BACKEND_FUNCTIONS.CHARACTERS,
  '/timeline-characters': BACKEND_FUNCTIONS.CHARACTERS, // Legacy compatibility
  
  // Inspiration (Visual References) ✅ NEW!
  '/inspirations': BACKEND_FUNCTIONS.INSPIRATION,
  
  // Stats & Logs ✅ PHASE 2!
  '/stats': BACKEND_FUNCTIONS.STATS,
  '/logs': BACKEND_FUNCTIONS.LOGS,
  
  // Audio (Upload, Waveform, Trim, Fade)
  // Note: /shots/:id/upload-audio routes to AUDIO function
  // Note: /shots/:id/audio routes to AUDIO function  
  // Note: /shots/audio/:id routes to AUDIO function
  
  // Beats (Save the Cat, Hero's Journey, etc.) ✅ NEW!
  '/beats': BACKEND_FUNCTIONS.BEATS,
  
  // Worldbuilding
  '/worlds': BACKEND_FUNCTIONS.WORLDBUILDING,
  '/locations': BACKEND_FUNCTIONS.WORLDBUILDING,
  
  // Assistant (AI + RAG + MCP)
  '/ai': BACKEND_FUNCTIONS.ASSISTANT,
  '/conversations': BACKEND_FUNCTIONS.ASSISTANT,
  '/rag': BACKEND_FUNCTIONS.ASSISTANT,
  '/mcp': BACKEND_FUNCTIONS.ASSISTANT,
  
  // Creative Gym
  '/exercises': BACKEND_FUNCTIONS.GYM,
  '/progress': BACKEND_FUNCTIONS.GYM,
  '/achievements': BACKEND_FUNCTIONS.GYM,
  '/categories': BACKEND_FUNCTIONS.GYM,
  '/daily-challenge': BACKEND_FUNCTIONS.GYM,
  
  // Superadmin
  '/superadmin': BACKEND_FUNCTIONS.SUPERADMIN,
};

/**
 * Determines which backend function to use for a given route.
 */
function getBackendFunctionForRoute(route: string): string {
  // Special routing for Audio endpoints
  // These have specific patterns that need to override the general /shots prefix
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
  
  // Build full URL
  const url = `${baseUrl}${route}`;
  
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