/**
 * ============================================================================
 * COREX: Logger Utility
 * Description: Structured logging for server-side operations
 * ============================================================================
 */

import { isDevelopment } from "./env";

// ============================================================================
// TYPES
// ============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// LOGGER IMPLEMENTATION
// ============================================================================

/**
 * Log level priority for filtering
 */
const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Current minimum log level (configurable)
 */
const MIN_LOG_LEVEL: LogLevel = isDevelopment() ? "debug" : "info";

/**
 * Format log entry for output
 */
function formatLog(entry: LogEntry): string {
  const { level, message, timestamp, requestId, context } = entry;

  // Development: pretty print
  if (isDevelopment()) {
    // eslint-disable-next-line security/detect-object-injection -- Safe: level is typed enum
    const prefix = {
      debug: "🔍",
      info: "📘",
      warn: "⚠️",
      error: "❌",
    }[level];

    let output = `${prefix} [${timestamp}] ${message}`;

    if (requestId) {
      output += ` (req: ${requestId.substring(0, 8)})`;
    }

    if (context && Object.keys(context).length > 0) {
      output +=
        "\n   " + JSON.stringify(context, null, 2).replace(/\n/g, "\n   ");
    }

    return output;
  }

  // Production: JSON format for log aggregation
  return JSON.stringify(entry);
}

/**
 * Write log entry to console
 */
function writeLog(entry: LogEntry): void {
  // Check if we should log this level
  // eslint-disable-next-line security/detect-object-injection -- Safe: entry.level is typed enum
  if (LOG_PRIORITY[entry.level] < LOG_PRIORITY[MIN_LOG_LEVEL]) {
    return;
  }

  const formatted = formatLog(entry);

  switch (entry.level) {
    case "debug":
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

/**
 * Create a log entry and write it
 */
function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  requestId?: string,
): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId,
    context,
  };

  writeLog(entry);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Logger instance for general use
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log("debug", message, context),

  info: (message: string, context?: Record<string, unknown>) =>
    log("info", message, context),

  warn: (message: string, context?: Record<string, unknown>) =>
    log("warn", message, context),

  error: (message: string, context?: Record<string, unknown>) =>
    log("error", message, context),
};

/**
 * Create a child logger with a request ID
 */
export function createRequestLogger(requestId: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) =>
      log("debug", message, context, requestId),

    info: (message: string, context?: Record<string, unknown>) =>
      log("info", message, context, requestId),

    warn: (message: string, context?: Record<string, unknown>) =>
      log("warn", message, context, requestId),

    error: (message: string, context?: Record<string, unknown>) =>
      log("error", message, context, requestId),
  };
}

/**
 * Log an error with stack trace
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const errorContext: Record<string, unknown> = { ...context };

  if (error instanceof Error) {
    errorContext.name = error.name;
    errorContext.message = error.message;
    errorContext.stack = error.stack;
  } else {
    errorContext.error = String(error);
  }

  logger.error("Unhandled error", errorContext);
}

/**
 * Measure and log execution time
 */
export async function logTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    logger.info(`${operation} completed`, {
      ...context,
      durationMs: Math.round(duration),
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    logError(error, {
      ...context,
      operation,
      durationMs: Math.round(duration),
    });

    throw error;
  }
}
