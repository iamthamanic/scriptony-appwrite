/**
 * Standard tool result envelope (provider-agnostic).
 */

export interface ToolErrorEnvelope {
  code?: string;
  message: string;
  details?: unknown;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: ToolErrorEnvelope;
  metadata?: Record<string, unknown>;
}

export function okResult<T>(
  message: string,
  data?: T,
  metadata?: Record<string, unknown>,
): ToolResult<T> {
  return { success: true, message, data, metadata };
}

export function errResult(
  message: string,
  error?: ToolErrorEnvelope,
  metadata?: Record<string, unknown>,
): ToolResult {
  return {
    success: false,
    message,
    error: error ?? { message },
    metadata,
  };
}
