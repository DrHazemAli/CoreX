/**
 * ============================================================================
 * COREX: Job Middleware
 * Description: Built-in middleware for job processing (Laravel-inspired)
 *
 * AVAILABLE MIDDLEWARE:
 * - withTimeout: Cancel job if it exceeds timeout
 * - withRetry: Custom retry logic
 * - withoutOverlapping: Prevent duplicate job execution
 * - rateLimited: Rate limit job processing
 * - throttleExceptions: Pause processing after repeated failures
 * - skip: Conditionally skip job execution
 * ============================================================================
 */

import "server-only";
import type { JobMiddleware, MiddlewareContext, JobResult } from "./types";
import { jobFailed, jobSuccess } from "./types";
import { logger } from "@/lib/logger";

// ============================================================================
// TIMEOUT MIDDLEWARE
// ============================================================================

/**
 * Abort job if it exceeds the specified timeout
 *
 * @param timeoutMs - Timeout in milliseconds
 */
export function withTimeout(timeoutMs: number): JobMiddleware {
  return async (ctx, next) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Update context with abort signal
      ctx.context.signal = controller.signal;

      const result = await Promise.race([
        next(),
        new Promise<JobResult>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error(`Job timed out after ${timeoutMs}ms`));
          });
        }),
      ]);

      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes("timed out")) {
        return jobFailed(`Job timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

// ============================================================================
// RETRY MIDDLEWARE
// ============================================================================

export interface RetryOptions {
  /**
   * Number of immediate retries before releasing back to queue
   */
  retries?: number;

  /**
   * Delay between retries in milliseconds
   */
  delay?: number;

  /**
   * Only retry on specific errors (by message pattern)
   */
  retryOn?: RegExp[];

  /**
   * Don't retry on specific errors
   */
  skipOn?: RegExp[];
}

/**
 * Custom retry logic within the job execution
 */
export function withRetry(options: RetryOptions = {}): JobMiddleware {
  const { retries = 2, delay = 1000, retryOn, skipOn } = options;

  return async (ctx, next) => {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await waitForRetry(delay, attempt, ctx.job.id);
      }

      const result = await next();

      if (result.success) return result;

      lastError = result.error;

      // Check if retry should be skipped or forced
      if (shouldSkipRetry(lastError, skipOn)) return result;
      if (!shouldRetry(lastError, retryOn)) return result;
    }

    return jobFailed(lastError ?? "All retries exhausted");
  };
}

/**
 * Wait before retrying with exponential backoff
 */
async function waitForRetry(
  baseDelay: number,
  attempt: number,
  jobId: string,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, baseDelay * attempt));
  logger.debug(`Retrying job (attempt ${attempt + 1})`, { jobId });
}

/**
 * Check if retry should be skipped based on error pattern
 */
function shouldSkipRetry(
  error: string | undefined,
  skipOn: RegExp[] | undefined,
): boolean {
  if (!skipOn || !error) return false;
  return skipOn.some((pattern) => pattern.test(error));
}

/**
 * Check if retry should proceed based on error pattern
 */
function shouldRetry(
  error: string | undefined,
  retryOn: RegExp[] | undefined,
): boolean {
  if (!retryOn || !error) return true;
  return retryOn.some((pattern) => pattern.test(error));
}

// ============================================================================
// WITHOUT OVERLAPPING MIDDLEWARE
// ============================================================================

// Simple in-memory lock store (for single-process)
const activeLocks = new Map<string, boolean>();

/**
 * Prevent duplicate job execution for the same key
 * Note: For distributed systems, use Redis-based locking
 */
export function withoutOverlapping(
  keyFn?: (ctx: MiddlewareContext) => string,
): JobMiddleware {
  return async (ctx, next) => {
    // Generate lock key
    const key = keyFn
      ? keyFn(ctx)
      : `job:${ctx.job.name}:${JSON.stringify(ctx.job.payload)}`;

    // Check if already running
    if (activeLocks.has(key)) {
      logger.debug(`Job skipped (overlapping): ${ctx.job.name}`, {
        jobId: ctx.job.id,
        key,
      });
      return jobSuccess(); // Skip silently
    }

    // Acquire lock
    activeLocks.set(key, true);

    try {
      return await next();
    } finally {
      activeLocks.delete(key);
    }
  };
}

// ============================================================================
// RATE LIMITED MIDDLEWARE
// ============================================================================

interface RateLimitState {
  count: number;
  resetAt: number;
}

const rateLimitState = new Map<string, RateLimitState>();

export interface RateLimitOptions {
  /**
   * Maximum jobs allowed in the window
   */
  maxAttempts: number;

  /**
   * Window size in seconds
   */
  windowSeconds: number;

  /**
   * Key for rate limiting (default: job name)
   */
  key?: string | ((ctx: MiddlewareContext) => string);
}

/**
 * Rate limit job processing
 */
export function rateLimited(options: RateLimitOptions): JobMiddleware {
  return async (ctx, next) => {
    const key =
      typeof options.key === "function"
        ? options.key(ctx)
        : (options.key ?? `ratelimit:${ctx.job.name}`);

    const now = Date.now();
    const state = rateLimitState.get(key);

    // Check if we need to reset
    if (!state || state.resetAt <= now) {
      rateLimitState.set(key, {
        count: 1,
        resetAt: now + options.windowSeconds * 1000,
      });
      return next();
    }

    // Check if over limit
    if (state.count >= options.maxAttempts) {
      logger.debug(`Job rate limited: ${ctx.job.name}`, {
        jobId: ctx.job.id,
        key,
        count: state.count,
        maxAttempts: options.maxAttempts,
      });

      // Return failure to trigger retry later
      return jobFailed(
        `Rate limited: ${state.count}/${options.maxAttempts} in window`,
      );
    }

    // Increment counter
    state.count++;
    return next();
  };
}

// ============================================================================
// THROTTLE EXCEPTIONS MIDDLEWARE
// ============================================================================

interface ExceptionState {
  failures: number;
  pausedUntil: number;
}

const exceptionState = new Map<string, ExceptionState>();

export interface ThrottleExceptionsOptions {
  /**
   * Number of failures before pausing
   */
  maxFailures: number;

  /**
   * Pause duration in seconds
   */
  pauseSeconds: number;

  /**
   * Key for throttling (default: job name)
   */
  key?: string | ((ctx: MiddlewareContext) => string);
}

/**
 * Pause job processing after repeated failures
 */
export function throttleExceptions(
  options: ThrottleExceptionsOptions,
): JobMiddleware {
  return async (ctx, next) => {
    const key =
      typeof options.key === "function"
        ? options.key(ctx)
        : (options.key ?? `throttle:${ctx.job.name}`);

    const now = Date.now();
    const state = exceptionState.get(key);

    // Check if paused
    if (state && state.pausedUntil > now) {
      logger.debug(`Job throttled: ${ctx.job.name}`, {
        jobId: ctx.job.id,
        key,
        pausedUntil: new Date(state.pausedUntil).toISOString(),
      });

      return jobFailed(
        `Throttled until ${new Date(state.pausedUntil).toISOString()}`,
      );
    }

    // Execute job
    const result = await next();

    if (result.success) {
      // Reset on success
      exceptionState.delete(key);
    } else {
      // Increment failure count
      const current = exceptionState.get(key) ?? {
        failures: 0,
        pausedUntil: 0,
      };
      current.failures++;

      if (current.failures >= options.maxFailures) {
        current.pausedUntil = now + options.pauseSeconds * 1000;
        logger.warn(`Job throttled after ${current.failures} failures`, {
          jobId: ctx.job.id,
          key,
          pauseSeconds: options.pauseSeconds,
        });
      }

      exceptionState.set(key, current);
    }

    return result;
  };
}

// ============================================================================
// SKIP MIDDLEWARE
// ============================================================================

/**
 * Conditionally skip job execution
 */
export function skip(
  shouldSkip: (ctx: MiddlewareContext) => boolean | Promise<boolean>,
): JobMiddleware {
  return async (ctx, next) => {
    const skipJob = await shouldSkip(ctx);

    if (skipJob) {
      logger.debug(`Job skipped by condition: ${ctx.job.name}`, {
        jobId: ctx.job.id,
      });
      return jobSuccess(); // Mark as success but don't execute
    }

    return next();
  };
}

// ============================================================================
// LOGGING MIDDLEWARE
// ============================================================================

/**
 * Add detailed logging around job execution
 */
export function withLogging(): JobMiddleware {
  return async (ctx, next) => {
    const startTime = Date.now();

    logger.info(`Job started: ${ctx.job.name}`, {
      jobId: ctx.job.id,
      attempt: ctx.context.attempt,
      queue: ctx.job.queue,
    });

    try {
      const result = await next();
      const duration = Date.now() - startTime;

      if (result.success) {
        logger.info(`Job succeeded: ${ctx.job.name}`, {
          jobId: ctx.job.id,
          duration,
        });
      } else {
        logger.warn(`Job failed: ${ctx.job.name}`, {
          jobId: ctx.job.id,
          duration,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Job exception: ${ctx.job.name}`, {
        jobId: ctx.job.id,
        duration,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  };
}

// ============================================================================
// CLEANUP HELPERS (For testing)
// ============================================================================

/**
 * Clear all middleware state (for testing)
 */
export function clearMiddlewareState(): void {
  activeLocks.clear();
  rateLimitState.clear();
  exceptionState.clear();
}
