/**
 * ============================================================================
 * COREX: Rate Limiter Interface
 * Description: Rate limiting abstraction with DB and Redis implementations
 * ============================================================================
 */

import "server-only";
import { isRateLimitEnabled, isRedisEnabled, env } from "@/lib/env";
import { logger } from "@/lib/logger";

// ============================================================================
// RATE LIMITER INTERFACE
// ============================================================================

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  /**
   * Check and consume rate limit
   */
  limit(key: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Get current rate limit status without consuming
   */
  status(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
}

// ============================================================================
// NULL RATE LIMITER (Always allows)
// ============================================================================

/**
 * Null rate limiter that always allows requests
 * Used when rate limiting is disabled
 */
class NullRateLimiter implements RateLimiter {
  async limit(_: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit,
      resetAt: new Date(Date.now() + config.windowSec * 1000),
    };
  }

  async status(_: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.limit(_, config);
  }
}

// ============================================================================
// IN-MEMORY RATE LIMITER (For development)
// ============================================================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * In-memory rate limiter using sliding window
 * Good for development and single-instance deployments
 */
class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, RateLimitEntry>();

  // Cleanup old entries periodically
  constructor() {
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.windowStart > 300000) {
        // 5 minutes
        this.store.delete(key);
      }
    }
  }

  async limit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = config.windowSec * 1000;

    let entry = this.store.get(key);

    // Reset window if expired
    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { count: 0, windowStart: now };
    }

    // Check limit
    const allowed = entry.count < config.limit;

    if (allowed) {
      entry.count++;
      this.store.set(key, entry);
    }

    return {
      allowed,
      limit: config.limit,
      remaining: Math.max(0, config.limit - entry.count),
      resetAt: new Date(entry.windowStart + windowMs),
    };
  }

  async status(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = config.windowSec * 1000;

    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        resetAt: new Date(now + windowMs),
      };
    }

    return {
      allowed: entry.count < config.limit,
      limit: config.limit,
      remaining: Math.max(0, config.limit - entry.count),
      resetAt: new Date(entry.windowStart + windowMs),
    };
  }
}

// ============================================================================
// REDIS RATE LIMITER (Upstash implementation)
// ============================================================================

/**
 * Redis rate limiter using sliding window algorithm
 * Good for production and multi-instance deployments
 */
class RedisRateLimiter implements RateLimiter {
  private baseUrl: string;
  private token: string;

  constructor(url: string, token: string) {
    this.baseUrl = url;
    this.token = token;
  }

  private async command<T>(...args: (string | number)[]): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      throw new Error(`Redis error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result;
  }

  async limit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;

    try {
      // Use Redis INCR with EXPIRE for simple fixed window
      const count = await this.command<number>("INCR", windowKey);

      // Set expiry on first request
      if (count === 1) {
        await this.command("EXPIRE", windowKey, config.windowSec);
      }

      // Get TTL for reset time
      const ttl = await this.command<number>("TTL", windowKey);

      const allowed = count <= config.limit;

      return {
        allowed,
        limit: config.limit,
        remaining: Math.max(0, config.limit - count),
        resetAt: new Date(now + ttl * 1000),
      };
    } catch (error) {
      logger.error("Redis rate limit error", { key, error });
      // Fail open - allow request on error
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        resetAt: new Date(now + config.windowSec * 1000),
      };
    }
  }

  async status(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;

    try {
      const count = await this.command<number | null>("GET", windowKey);
      const ttl = await this.command<number>("TTL", windowKey);

      const currentCount = count ?? 0;

      return {
        allowed: currentCount < config.limit,
        limit: config.limit,
        remaining: Math.max(0, config.limit - currentCount),
        resetAt:
          ttl > 0
            ? new Date(now + ttl * 1000)
            : new Date(now + config.windowSec * 1000),
      };
    } catch (error) {
      logger.error("Redis rate limit status error", { key, error });
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        resetAt: new Date(now + config.windowSec * 1000),
      };
    }
  }
}

// ============================================================================
// RATE LIMITER FACTORY
// ============================================================================

let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get the rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    if (!isRateLimitEnabled()) {
      logger.info("Using null rate limiter (disabled)");
      rateLimiterInstance = new NullRateLimiter();
    } else if (
      isRedisEnabled() &&
      env.UPSTASH_REDIS_URL &&
      env.UPSTASH_REDIS_TOKEN
    ) {
      logger.info("Using Redis rate limiter");
      rateLimiterInstance = new RedisRateLimiter(
        env.UPSTASH_REDIS_URL,
        env.UPSTASH_REDIS_TOKEN,
      );
    } else {
      logger.info("Using in-memory rate limiter");
      rateLimiterInstance = new InMemoryRateLimiter();
    }
  }

  return rateLimiterInstance;
}

// ============================================================================
// RATE LIMIT HELPERS
// ============================================================================

/**
 * Default rate limit configurations
 */
export const RateLimits = {
  /** Public API endpoints */
  PUBLIC: { limit: 100, windowSec: 60 } as const,

  /** Search endpoint (more restrictive) */
  SEARCH: { limit: 30, windowSec: 60 } as const,

  /** Internal endpoints */
  INTERNAL: { limit: 10, windowSec: 60 } as const,

  /** Heavy operations */
  HEAVY: { limit: 5, windowSec: 60 } as const,
} as const;

/**
 * Build rate limit key from IP and path
 */
export function buildRateLimitKey(
  ip: string | undefined,
  path: string,
): string {
  return `${ip ?? "unknown"}:${path}`;
}

/**
 * Check rate limit and return headers
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
}> {
  const limiter = getRateLimiter();
  const result = await limiter.limit(key, config);

  return {
    allowed: result.allowed,
    headers: {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": Math.floor(
        result.resetAt.getTime() / 1000,
      ).toString(),
    },
  };
}
