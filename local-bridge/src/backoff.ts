/**
 * Reusable exponential backoff + reconnect state management.
 *
 * DRY: replaces duplicated reconnect logic in comfyui-client.ts
 * and realtime-subscriber.ts.
 */

import { log, formatError } from "./logger.js";

export interface BackoffOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
  context?: string; // for log messages
}

const DEFAULTS: Required<BackoffOptions> = {
  baseDelayMs: 5_000,
  maxDelayMs: 60_000,
  context: "reconnect",
};

/**
 * Manages reconnection state: attempt counter, delay calculation,
 * and shutdown guard.
 */
export class ReconnectManager {
  private _attempts = 0;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _shuttingDown = false;
  private readonly _opts: Required<BackoffOptions>;

  constructor(opts: BackoffOptions = {}) {
    this._opts = { ...DEFAULTS, ...opts };
  }

  /** Current reconnection attempt count (for health endpoint). */
  get attempts(): number {
    return this._attempts;
  }

  /** Is a shutdown in progress? Reconnect should be suppressed. */
  get shuttingDown(): boolean {
    return this._shuttingDown;
  }

  /** Calculate delay for current attempt using exponential backoff. */
  nextDelay(): number {
    this._attempts++;
    const delay = Math.min(
      this._opts.baseDelayMs * Math.pow(2, this._attempts - 1),
      this._opts.maxDelayMs,
    );
    return delay;
  }

  /**
   * Schedule a reconnect attempt. No-op if shutting down.
   * Returns the delay used (for logging).
   */
  schedule(action: () => void): number | null {
    if (this._shuttingDown) return null;

    const delay = this.nextDelay();
    log.warn(this._opts.context, `Reconnecting in ${delay}ms (attempt ${this._attempts})`);

    this._timer = setTimeout(() => {
      if (this._shuttingDown) return;
      action();
    }, delay);

    return delay;
  }

  /** Reset attempt counter on successful connection. */
  reset(): void {
    this._attempts = 0;
  }

  /** Stop any pending reconnect and prevent future ones. */
  shutdown(): void {
    this._shuttingDown = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
}

/**
 * Pure delay calculator — for use in retry loops that don't need
 * a full ReconnectManager (e.g., db-callback.ts).
 */
export function backoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  return Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
}