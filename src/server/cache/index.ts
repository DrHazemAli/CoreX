/**
 * ============================================================================
 * COREX: Cache Provider Interface
 * Description: Cache abstraction with NullCache and Redis implementations
 * ============================================================================
 */

import "server-only";
import { isRedisEnabled, env } from "@/lib/env";
import { logger } from "@/lib/logger";

// ============================================================================
// CACHE INTERFACE
// ============================================================================

/**
 * Cache provider interface
 */
export interface CacheProvider {
  /**
   * Get a value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a value from cache
   */
  del(key: string): Promise<void>;

  /**
   * Check if a key exists
   */
  exists(key: string): Promise<boolean>;
}

// ============================================================================
// NULL CACHE (No-op implementation)
// ============================================================================

/**
 * Null cache implementation that does nothing
 * Used when caching is disabled
 */
class NullCache implements CacheProvider {
  async get<T>(): Promise<T | null> {
    return null;
  }

  async set(): Promise<void> {
    // No-op
  }

  async del(): Promise<void> {
    // No-op
  }

  async exists(): Promise<boolean> {
    return false;
  }
}

// ============================================================================
// REDIS CACHE (Upstash implementation)
// ============================================================================

/**
 * Redis cache implementation using Upstash
 */
class RedisCache implements CacheProvider {
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

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.command<string | null>("GET", key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error("Redis GET error", { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.command("SET", key, serialized, "EX", ttlSeconds);
      } else {
        await this.command("SET", key, serialized);
      }
    } catch (error) {
      logger.error("Redis SET error", { key, error });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.command("DEL", key);
    } catch (error) {
      logger.error("Redis DEL error", { key, error });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.command<number>("EXISTS", key);
      return result > 0;
    } catch (error) {
      logger.error("Redis EXISTS error", { key, error });
      return false;
    }
  }
}

// ============================================================================
// CACHE FACTORY
// ============================================================================

let cacheInstance: CacheProvider | null = null;

/**
 * Get the cache provider instance
 */
export function getCache(): CacheProvider {
  if (!cacheInstance) {
    if (isRedisEnabled() && env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN) {
      logger.info("Using Redis cache provider");
      cacheInstance = new RedisCache(
        env.UPSTASH_REDIS_URL,
        env.UPSTASH_REDIS_TOKEN,
      );
    } else {
      logger.info("Using null cache provider");
      cacheInstance = new NullCache();
    }
  }

  return cacheInstance;
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

/**
 * Cache key builder
 */
export function buildCacheKey(...parts: string[]): string {
  return `discover:${parts.join(":")}`;
}

/**
 * Cached function wrapper
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 300,
): Promise<T> {
  const cache = getCache();

  // Try to get from cache
  const cachedValue = await cache.get<T>(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  // Execute function
  const value = await fn();

  // Store in cache
  await cache.set(key, value, ttlSeconds);

  return value;
}

/**
 * Invalidate cache by pattern (only works with Redis)
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  // Pattern-based invalidation requires Redis SCAN
  // For simplicity, we'll just log a warning
  logger.warn("Pattern-based cache invalidation not implemented", { pattern });
}
