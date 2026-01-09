/**
 * ============================================================================
 * COREX: In-Memory Rate Limiter
 * Description: Sliding window rate limiter using in-memory storage
 * Uses LRU-style cleanup to prevent memory leaks
 * ============================================================================
 */

import type {
  RateLimiter,
  RateLimitConfig,
  RateLimitResult,
  RateLimitEntry,
  RateLimitStore,
} from "./types";

// ============================================================================
// MEMORY STORE WITH LRU CLEANUP
// ============================================================================

interface StoredEntry extends RateLimitEntry {
  lastAccess: number;
}

class MemoryStore implements RateLimitStore {
  private store = new Map<string, StoredEntry>();
  private readonly maxEntries: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxEntries = 10000, cleanupIntervalMs = 60000) {
    this.maxEntries = maxEntries;

    // Periodic cleanup of expired entries
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(
        () => this.cleanup(),
        cleanupIntervalMs,
      );
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();

    // Check if entry has expired
    if (now >= entry.windowEnd) {
      this.store.delete(key);
      return null;
    }

    // Update last access time
    entry.lastAccess = now;
    return entry;
  }

  async set(
    key: string,
    entry: RateLimitEntry,
    _ttlSeconds?: number,
  ): Promise<void> {
    // _ttlSeconds is kept for interface compatibility but not used in memory store
    // as entries are auto-evicted based on windowEnd

    // Enforce max entries with LRU eviction
    if (this.store.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.store.set(key, {
      ...entry,
      lastAccess: Date.now(),
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const now = Date.now();
    const existing = await this.get(key);

    if (existing) {
      existing.count += 1;
      this.store.set(key, { ...existing, lastAccess: now });
      return existing.count;
    }

    // Create new entry
    const windowEnd = now + ttlSeconds * 1000;
    await this.set(
      key,
      {
        count: 1,
        windowStart: now,
        windowEnd,
      },
      ttlSeconds,
    );

    return 1;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.store) {
      if (now >= entry.windowEnd) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// ============================================================================
// SLIDING WINDOW RATE LIMITER
// ============================================================================

export class MemoryRateLimiter implements RateLimiter {
  private store: MemoryStore;

  constructor(maxEntries = 10000) {
    this.store = new MemoryStore(maxEntries);
  }

  private getKey(identifier: string, configName: string): string {
    // Hash-like key to prevent key injection
    return `rl:${configName}:${Buffer.from(identifier).toString("base64url")}`;
  }

  async check(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    // Check skip condition
    if (config.skip?.(identifier)) {
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        reset: Date.now() + config.windowSeconds * 1000,
        retryAfter: 0,
      };
    }

    const key = this.getKey(identifier, config.name);
    const entry = await this.store.get(key);
    const now = Date.now();

    if (!entry) {
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        reset: now + config.windowSeconds * 1000,
        retryAfter: 0,
      };
    }

    const cost = config.cost ?? 1;
    const remaining = Math.max(0, config.limit - entry.count);
    const allowed = remaining >= cost;
    const retryAfter = allowed ? 0 : Math.ceil((entry.windowEnd - now) / 1000);

    return {
      allowed,
      limit: config.limit,
      remaining,
      reset: entry.windowEnd,
      retryAfter,
    };
  }

  async consume(
    identifier: string,
    config: RateLimitConfig,
    cost = 1,
  ): Promise<RateLimitResult> {
    // Check skip condition
    if (config.skip?.(identifier)) {
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        reset: Date.now() + config.windowSeconds * 1000,
        retryAfter: 0,
      };
    }

    const key = this.getKey(identifier, config.name);
    const now = Date.now();

    // Atomic-like operation: get, check, increment
    let entry = await this.store.get(key);

    if (!entry) {
      // First request in window
      entry = {
        count: 0,
        windowStart: now,
        windowEnd: now + config.windowSeconds * 1000,
      };
    }

    const effectiveCost = cost * (config.cost ?? 1);
    const newCount = entry.count + effectiveCost;
    const allowed = newCount <= config.limit;

    if (allowed) {
      // Consume tokens
      await this.store.set(
        key,
        {
          count: newCount,
          windowStart: entry.windowStart,
          windowEnd: entry.windowEnd,
        },
        config.windowSeconds,
      );
    }

    const remaining = Math.max(0, config.limit - newCount);
    const retryAfter = allowed ? 0 : Math.ceil((entry.windowEnd - now) / 1000);

    return {
      allowed,
      limit: config.limit,
      remaining: allowed ? remaining : Math.max(0, config.limit - entry.count),
      reset: entry.windowEnd,
      retryAfter,
    };
  }

  async reset(identifier: string, configName: string): Promise<void> {
    const key = this.getKey(identifier, configName);
    await this.store.delete(key);
  }

  async status(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    return this.check(identifier, config);
  }

  destroy(): void {
    this.store.destroy();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalRateLimiter: MemoryRateLimiter | null = null;

export function getMemoryRateLimiter(): MemoryRateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new MemoryRateLimiter();
  }
  return globalRateLimiter;
}

export function resetGlobalRateLimiter(): void {
  if (globalRateLimiter) {
    globalRateLimiter.destroy();
    globalRateLimiter = null;
  }
}
