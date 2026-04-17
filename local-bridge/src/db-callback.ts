/**
 * Retry helper for Appwrite DB operations.
 *
 * Exponential backoff for network errors and transient 5xx responses.
 * Non-retriable on 4xx (client errors) — those indicate a real problem.
 */

import { log } from "./logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
};

// ---------------------------------------------------------------------------
// Is the error retriable?
// ---------------------------------------------------------------------------

function isRetriable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Network / timeout errors
    if (
      msg.includes("econnrefused") ||
      msg.includes("econnreset") ||
      msg.includes("etimedout") ||
      msg.includes("fetch failed") ||
      msg.includes("network") ||
      msg.includes("timeout")
    ) {
      return true;
    }

    // Appwrite rate limiting or server errors
    if (msg.includes("429") || msg.includes("503") || msg.includes("502") || msg.includes("500")) {
      return true;
    }

    // Appwrite SDK throws with specific patterns
    if (msg.includes("rate limit") || msg.includes("server error")) {
      return true;
    }
  }

  // Appwrite SDK throws objects with a `code` property
  if (typeof error === "object" && error !== null) {
    const code = (error as Record<string, unknown>).code;
    if (typeof code === "number" && code >= 500) return true;
    if (code === 429) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------

export async function retryDbOperation<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= opts.maxRetries || !isRetriable(error)) {
        throw error;
      }

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt),
        opts.maxDelayMs,
      );

      log.warn("db-retry", `DB operation failed (attempt ${attempt + 1}/${opts.maxRetries}), retrying in ${delay}ms`, {
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}