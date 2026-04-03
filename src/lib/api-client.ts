/**
 * Centralized API Client for Scriptony Backend
 * 
 * Provides a unified interface for making HTTP requests to the provider-neutral backend functions.
 * Handles authentication, error handling, logging, and request/response transformation.
 * 
 * NOTE: This now uses API Gateway for automatic routing to the correct backend function.
 */

import { API_CONFIG } from './config';
import { apiGateway as internalApiGateway } from './api-gateway';
import { backendConfig } from './env';

// =============================================================================
// Types
// =============================================================================

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  data: T;
  error?: never;
}

export interface ApiErrorResponse {
  data?: never;
  error: ApiError;
}

export type ApiResult<T = any> = ApiResponse<T> | ApiErrorResponse;

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
  timeout?: number;
}

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL_LEGACY = `${backendConfig.functionsBaseUrl || ""}${API_CONFIG.SERVER_BASE_PATH}`;

// NEW: Use API Gateway for multi-function routing
const USE_API_GATEWAY = true;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Gets the current auth token via centralized auth client
 */
import { getAuthToken as getCentralAuthToken } from './auth/getAuthToken';

async function getAuthToken(): Promise<string | null> {
  try {
    return await getCentralAuthToken();
  } catch (error) {
    console.error('[API Client] Exception getting auth token:', error);
    return null;
  }
}

/**
 * Creates a timeout promise that rejects after a specified duration
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

/**
 * Formats an error response into a standardized ApiError
 */
function formatError(error: any, status?: number, statusText?: string): ApiError {
  if (typeof error === 'string') {
    return { message: error, status, statusText };
  }
  
  if (error?.message) {
    return {
      message: error.message,
      status: status || error.status,
      statusText: statusText || error.statusText,
      details: error.details || error,
    };
  }
  
  return {
    message: 'An unknown error occurred',
    status,
    statusText,
    details: error,
  };
}

// =============================================================================
// Core Request Function
// =============================================================================

/**
 * Makes an HTTP request to the API
 * 
 * @param endpoint - API endpoint (without base URL), e.g. '/projects'
 * @param options - Request options
 * @returns Promise with ApiResult
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const {
    requireAuth = true,
    timeout = API_CONFIG.REQUEST_TIMEOUT,
    headers = {},
    ...fetchOptions
  } = options;

  const method = fetchOptions.method || 'GET';

  // Use API Gateway for automatic routing to the correct backend function
  if (USE_API_GATEWAY) {
    console.log(`[API Client] Using API Gateway for ${method} ${endpoint}`);
    
    try {
      // Get auth token if required
      let authToken: string | null = null;
      if (requireAuth) {
        authToken = await getAuthToken();
        if (!authToken) {
          console.error('[API Client] No auth token available for', method, endpoint);
          return {
            error: {
              message: 'Unauthorized - please log in',
              status: 401,
              statusText: 'Unauthorized',
            },
          };
        }
        console.log(`[API Client] Auth token acquired for ${method} ${endpoint}`);
      }
      
      // Call API Gateway
      const body = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined;
      const data = await internalApiGateway<T>({
        method: method as any,
        route: endpoint,
        body,
        headers: headers as Record<string, string>,
        accessToken: authToken || undefined,
      });
      
      return { data };
    } catch (error: any) {
      console.error(`[API Client via Gateway] Error:`, error);
      return {
        error: {
          message: error.message || 'Request failed',
          status: error.status,
          statusText: error.statusText,
          details: error,
        },
      };
    }
  }
  
  // LEGACY: Fallback to old direct function call (for backward compatibility)
  const url = `${API_BASE_URL_LEGACY}${endpoint}`;
  console.log(`[API Client] LEGACY MODE: ${method} request to ${url}`);

  try {
    // Get auth token if required
    let authToken: string | null = null;
    if (requireAuth) {
      authToken = await getAuthToken();
      if (!authToken) {
        console.error('[API Client] No auth token available for', method, endpoint);
        return {
          error: {
            message: 'Unauthorized - please log in',
            status: 401,
            statusText: 'Unauthorized',
          },
        };
      }
      console.log(`[API Client] Auth token acquired for ${method} ${endpoint}`);
    }

    // Build headers
    const extra =
      headers && typeof headers === "object" && !Array.isArray(headers)
        ? (headers as Record<string, string>)
        : {};
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...extra,
    };

    if (authToken) {
      requestHeaders.Authorization = `Bearer ${authToken}`;
    }

    // Log request
    console.log(`[API] Starting ${method} ${url}`, fetchOptions.body ? JSON.parse(fetchOptions.body as string) : '');
    console.log(`[API] Request headers:`, requestHeaders);

    // Make request with timeout
    let response: Response;
    
    try {
      console.log(`[API] Fetching with ${timeout}ms timeout...`);
      response = await Promise.race([
        fetch(url, {
          ...fetchOptions,
          headers: requestHeaders,
        }),
        createTimeout(timeout),
      ]) as Response;
      console.log(`[API] Response received:`, response.status, response.statusText);
    } catch (fetchError: any) {
      // Handle network errors or timeout
      if (fetchError.message?.includes('timeout')) {
        console.error(`[API TIMEOUT] ${method} ${endpoint}: Request timed out after ${timeout}ms`);
        console.error(`[API TIMEOUT] This usually means the server is not responding`);
        console.error(`[API TIMEOUT] URL was: ${url}`);
        return {
          error: {
            message: `Request timed out after ${timeout}ms. Server may be offline or unreachable.`,
            status: 408,
            statusText: 'Request Timeout',
            details: { url, fetchError },
          },
        };
      }
      
      console.error(`[API FETCH ERROR] ${method} ${endpoint}:`, fetchError);
      console.error(`[API FETCH ERROR] URL was: ${url}`);
      console.error(`[API FETCH ERROR] This might be a network issue, CORS problem, or server offline`);
      
      // Provide more helpful error message
      let message = 'Network error or server unreachable.';
      if (fetchError.message === 'Failed to fetch') {
          message = 'Cannot connect to backend. Please check:\n1. Is your internet working?\n2. Is the backend function deployed?\n3. Check browser console for CORS errors';
      }
      
      return {
        error: {
          message,
          details: { url, originalError: fetchError.message, fetchError },
        },
      };
    }

    // Parse response
    let responseData: any;
    
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    } catch (parseError) {
      console.error(`[API PARSE ERROR] ${method} ${endpoint}:`, parseError);
      responseData = null;
    }

    // Handle HTTP errors
    if (!response.ok) {
      const error = formatError(
        responseData?.error || responseData?.details || responseData || 'Request failed',
        response.status,
        response.statusText
      );
      
      console.error(`[API ERROR] ${method} ${endpoint}:`, error);
      
      return { error };
    }

    // Success
    console.log(`[API SUCCESS] ${method} ${endpoint}:`, responseData);
    
    return { data: responseData as T };

  } catch (error: any) {
    const apiError = formatError(error);
    console.error(`[API EXCEPTION] ${method} ${endpoint}:`, apiError);
    
    return { error: apiError };
  }
}

// =============================================================================
// Convenience Methods
// =============================================================================

/**
 * Makes a GET request
 */
export async function apiGet<T = any>(
  endpoint: string,
  options?: Omit<RequestOptions, 'method' | 'body'>
): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Makes a POST request
 */
export async function apiPost<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method' | 'body'>
): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Makes a PUT request
 */
export async function apiPut<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method' | 'body'>
): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Makes a DELETE request
 */
export async function apiDelete<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method' | 'body'>
): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Makes a PATCH request
 */
export async function apiPatch<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method' | 'body'>
): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

// =============================================================================
// Helper: Unwrap API Result
// =============================================================================

/**
 * Unwraps an ApiResult and throws if there's an error
 * Useful for async/await code that wants to use try/catch
 */
export function unwrapApiResult<T>(result: ApiResult<T>): T {
  if ("error" in result && result.error) {
    const err = result.error;
    const error = new Error(err.message);
    (error as any).status = err.status;
    (error as any).statusText = err.statusText;
    (error as any).details = err.details;
    throw error;
  }
  
  return result.data;
}

/**
 * Checks if an ApiResult is an error
 */
export function isApiError<T>(result: ApiResult<T>): result is ApiErrorResponse {
  return 'error' in result;
}

// =============================================================================
// Default API Client Object (for convenience)
// =============================================================================

/**
 * Default API client with unwrapped responses (throws on error)
 * Use this for simpler code that uses try/catch for error handling
 */
export const apiClient = {
  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const result = await apiGet<T>(endpoint, options);
    return unwrapApiResult(result);
  },
  
  async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const result = await apiPost<T>(endpoint, body, options);
    return unwrapApiResult(result);
  },
  
  async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const result = await apiPut<T>(endpoint, body, options);
    return unwrapApiResult(result);
  },
  
  async delete<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const result = await apiDelete<T>(endpoint, body, options);
    return unwrapApiResult(result);
  },
  
  async patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const result = await apiPatch<T>(endpoint, body, options);
    return unwrapApiResult(result);
  },
};