/**
 * Structured console logger for the Local Bridge.
 *
 * Log levels: debug < info < warn < error.
 * Controlled via BRIDGE_LOG_LEVEL env var.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let _minLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  _minLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[_minLevel];
}

function formatMessage(level: LogLevel, context: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] [${context}] ${message}`;
}

export const log = {
  debug: (context: string, message: string, data?: unknown) => {
    if (shouldLog("debug")) console.debug(formatMessage("debug", context, message), data ?? "");
  },
  info: (context: string, message: string, data?: unknown) => {
    if (shouldLog("info")) console.info(formatMessage("info", context, message), data ?? "");
  },
  warn: (context: string, message: string, data?: unknown) => {
    if (shouldLog("warn")) console.warn(formatMessage("warn", context, message), data ?? "");
  },
  error: (context: string, message: string, data?: unknown) => {
    if (shouldLog("error")) console.error(formatMessage("error", context, message), data ?? "");
  },
};