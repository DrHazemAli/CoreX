/**
 * ============================================================================
 * COREX: Rate Limiting Types
 * Description: Type definitions for rate limiting system
 * ============================================================================
 */

// ============================================================================
// RATE LIMIT RESULT
// ============================================================================

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Maximum requests allowed in window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp when limit resets */
  reset: number;
  /** Seconds until retry is allowed (if blocked) */
  retryAfter: number;
}

// ============================================================================
// RATE LIMIT CONFIG
// ============================================================================

export interface RateLimitConfig {
  /** Unique identifier for this limit (e.g., 'api', 'auth', 'search') */
  name: string;
  /** Maximum requests allowed */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Skip rate limiting for certain conditions */
  skip?: (identifier: string) => boolean;
  /** Cost multiplier for expensive operations */
  cost?: number;
}

// ============================================================================
// RATE LIMITER INTERFACE
// ============================================================================

export interface RateLimiter {
  /**
   * Check if a request should be allowed
   * @param identifier - Unique identifier (IP, user ID, API key)
   * @param config - Rate limit configuration
   */
  check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Consume tokens for a request (call after check passes)
   * @param identifier - Unique identifier
   * @param config - Rate limit configuration
   * @param cost - Number of tokens to consume (default: 1)
   */
  consume(
    identifier: string,
    config: RateLimitConfig,
    cost?: number,
  ): Promise<RateLimitResult>;

  /**
   * Reset the limit for an identifier
   * @param identifier - Unique identifier
   * @param configName - Name of the config to reset
   */
  reset(identifier: string, configName: string): Promise<void>;

  /**
   * Get current status without consuming
   * @param identifier - Unique identifier
   * @param config - Rate limit configuration
   */
  status(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;
}

// ============================================================================
// RATE LIMIT STORAGE
// ============================================================================

export interface RateLimitEntry {
  /** Number of requests made */
  count: number;
  /** Window start timestamp */
  windowStart: number;
  /** Window end timestamp (reset time) */
  windowEnd: number;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, entry: RateLimitEntry, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  increment(key: string, ttlSeconds: number): Promise<number>;
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const RATE_LIMIT_PRESETS = {
  // Standard API requests
  api: {
    name: "api",
    limit: 100,
    windowSeconds: 60, // 100 requests per minute
  },

  // Authentication attempts
  auth: {
    name: "auth",
    limit: 5,
    windowSeconds: 300, // 5 attempts per 5 minutes
  },

  // Search operations
  search: {
    name: "search",
    limit: 30,
    windowSeconds: 60, // 30 searches per minute
  },

  // Data mutations
  mutation: {
    name: "mutation",
    limit: 20,
    windowSeconds: 60, // 20 mutations per minute
  },

  // File uploads
  upload: {
    name: "upload",
    limit: 10,
    windowSeconds: 3600, // 10 uploads per hour
  },

  // Heavy operations (reports, exports)
  heavy: {
    name: "heavy",
    limit: 5,
    windowSeconds: 3600, // 5 heavy operations per hour
  },

  // API key based (more generous)
  apiKey: {
    name: "apiKey",
    limit: 1000,
    windowSeconds: 60, // 1000 requests per minute
  },

  // Internal services (very generous)
  internal: {
    name: "internal",
    limit: 10000,
    windowSeconds: 60, // 10000 requests per minute
  },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;
