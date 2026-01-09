# Caching Strategies Guide

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Providers**: Redis (Upstash) / NullCache (Fallback)

## Table of Contents

1. [Overview](#overview)
2. [Cache Architecture](#cache-architecture)
3. [Cache Providers](#cache-providers)
4. [Caching Patterns](#caching-patterns)
5. [Cache Keys](#cache-keys)
6. [TTL Strategies](#ttl-strategies)
7. [Cache Invalidation](#cache-invalidation)
8. [Response Caching](#response-caching)
9. [React Query Integration](#react-query-integration)
10. [Memory Considerations](#memory-considerations)
11. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

CoreX implements a multi-level caching strategy:

| Level  | Technology    | TTL       | Purpose           |
| ------ | ------------- | --------- | ----------------- |
| **L1** | React Query   | 5min      | Client-side cache |
| **L2** | Redis/Upstash | 5-60min   | Distributed cache |
| **L3** | HTTP Cache    | varies    | CDN/Browser cache |
| **L4** | Database      | permanent | Source of truth   |

### Key Principles

| Principle                | Implementation                       |
| ------------------------ | ------------------------------------ |
| **Graceful Degradation** | NullCache when Redis unavailable     |
| **Cache-Aside**          | Application manages cache explicitly |
| **TTL-based Expiry**     | Time-based invalidation              |
| **Key Prefixing**        | Organized, scannable keys            |

---

## Cache Architecture

### Multi-Level Cache Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MULTI-LEVEL CACHE FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

  Request
     │
     ▼
  ┌─────────────────┐
  │  L1: React      │  Client memory
  │  Query Cache    │  staleTime: 5min
  └────────┬────────┘  gcTime: 10min
           │
           │ Miss
           ▼
  ┌─────────────────┐
  │  L2: Redis      │  Distributed
  │  (Upstash)      │  TTL: 5-60min
  └────────┬────────┘
           │
           │ Miss
           ▼
  ┌─────────────────┐
  │  L3: HTTP       │  Browser/CDN
  │  Cache Headers  │  Cache-Control
  └────────┬────────┘
           │
           │ Miss
           ▼
  ┌─────────────────┐
  │  L4: Database   │  PostgreSQL
  │  (Supabase)     │  Source of truth
  └─────────────────┘

  Data flows UP, populating each cache level
```

### Server-Side Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVER CACHE ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────┐
                    │             Application                 │
                    │                                         │
                    │   ┌─────────────┐    ┌─────────────┐   │
                    │   │ Route       │    │ Use Cases   │   │
                    │   │ Handlers    │    │             │   │
                    │   └──────┬──────┘    └──────┬──────┘   │
                    │          │                  │          │
                    │          └────────┬─────────┘          │
                    │                   │                    │
                    │                   ▼                    │
                    │          ┌─────────────────┐           │
                    │          │  CacheProvider  │           │
                    │          │   Interface     │           │
                    │          └────────┬────────┘           │
                    │                   │                    │
                    └───────────────────┼────────────────────┘
                                        │
                         ┌──────────────┼──────────────┐
                         │              │              │
                         ▼              ▼              ▼
                  ┌───────────┐  ┌───────────┐  ┌───────────┐
                  │ NullCache │  │ RedisCache│  │MemoryCache│
                  │ (fallback)│  │ (Upstash) │  │ (in-proc) │
                  └───────────┘  └───────────┘  └───────────┘
```

---

## Cache Providers

### CacheProvider Interface

```typescript
// src/server/cache/index.ts

export interface CacheProvider {
  /** Get a value from cache */
  get<T>(key: string): Promise<T | null>;

  /** Set a value with optional TTL */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /** Delete a value */
  del(key: string): Promise<void>;

  /** Check if key exists */
  exists(key: string): Promise<boolean>;
}
```

### NullCache (Fallback)

```typescript
/**
 * No-op cache for when caching is disabled
 * Provides graceful degradation
 */
class NullCache implements CacheProvider {
  async get<T>(): Promise<T | null> {
    return null; // Always miss
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
```

### RedisCache (Upstash)

```typescript
/**
 * Redis implementation using Upstash HTTP API
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
      return null; // Fail gracefully
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
      // Fail silently - don't break the application
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
```

### Cache Factory

```typescript
let cacheInstance: CacheProvider | null = null;

export function getCache(): CacheProvider {
  if (cacheInstance) {
    return cacheInstance;
  }

  if (isRedisEnabled()) {
    cacheInstance = new RedisCache(
      env.UPSTASH_REDIS_REST_URL,
      env.UPSTASH_REDIS_REST_TOKEN,
    );
    logger.info("Cache initialized: Redis");
  } else {
    cacheInstance = new NullCache();
    logger.info("Cache initialized: NullCache (disabled)");
  }

  return cacheInstance;
}
```

---

## Caching Patterns

### Cache-Aside Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CACHE-ASIDE PATTERN                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  Application                    Cache                      Database
      │                           │                            │
      │ 1. get(key)              │                            │
      ├──────────────────────────▶│                            │
      │                           │                            │
      │ 2a. HIT: return data     │                            │
      │◀──────────────────────────┤                            │
      │                           │                            │
      │ 2b. MISS: return null    │                            │
      │◀──────────────────────────┤                            │
      │                           │                            │
      │ 3. query()               │                            │
      ├───────────────────────────┼───────────────────────────▶│
      │                           │                            │
      │ 4. data                   │                            │
      │◀───────────────────────────────────────────────────────┤
      │                           │                            │
      │ 5. set(key, data, ttl)   │                            │
      ├──────────────────────────▶│                            │
      │                           │                            │
```

### Implementation

```typescript
// Cache-aside pattern in service
async function getUser(userId: string): Promise<User | null> {
  const cache = getCache();
  const cacheKey = `user:${userId}`;

  // 1. Try cache first
  const cached = await cache.get<User>(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Cache miss - fetch from database
  const user = await db.from("users").select("*").eq("id", userId).single();

  // 3. Populate cache for next time
  if (user) {
    await cache.set(cacheKey, user, 300); // 5 min TTL
  }

  return user;
}
```

### Write-Through Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WRITE-THROUGH PATTERN                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  Application                    Cache                      Database
      │                           │                            │
      │ 1. write data            │                            │
      ├──────────────────────────▶│                            │
      │                           │                            │
      │                           │ 2. write to DB             │
      │                           ├───────────────────────────▶│
      │                           │                            │
      │                           │ 3. confirm                 │
      │                           │◀───────────────────────────┤
      │                           │                            │
      │ 4. confirm (after both)  │                            │
      │◀──────────────────────────┤                            │
```

### Implementation

```typescript
async function updateUser(
  userId: string,
  data: UpdateUserInput,
): Promise<User> {
  const cache = getCache();
  const cacheKey = `user:${userId}`;

  // 1. Update database first
  const user = await db.from("users").update(data).eq("id", userId).single();

  // 2. Update cache immediately
  await cache.set(cacheKey, user, 300);

  // 3. Invalidate related caches
  await cache.del(`users:list`);

  return user;
}
```

---

## Cache Keys

### Key Naming Convention

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CACHE KEY CONVENTIONS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  Format: {prefix}:{entity}:{identifier}:{qualifier}

  Examples:
  ┌────────────────────────────────────┬─────────────────────────────────────┐
  │  Key Pattern                       │  Description                        │
  ├────────────────────────────────────┼─────────────────────────────────────┤
  │  user:123                          │  Single user by ID                  │
  │  user:email:test@example.com       │  User by email (lookup)             │
  │  users:list:page:1:limit:20        │  Paginated user list                │
  │  users:count                       │  User count                         │
  │  session:abc123                    │  User session                       │
  │  ratelimit:ip:192.168.1.1          │  Rate limit counter                 │
  │  feature:flags:v1                  │  Feature flags snapshot             │
  └────────────────────────────────────┴─────────────────────────────────────┘
```

### Key Builder Utility

```typescript
// src/server/cache/keys.ts

export const CacheKeys = {
  // User keys
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email.toLowerCase()}`,
  usersList: (page: number, limit: number) =>
    `users:list:page:${page}:limit:${limit}`,
  usersCount: () => `users:count`,

  // Session keys
  session: (sessionId: string) => `session:${sessionId}`,

  // Rate limiting
  rateLimit: (ip: string, route: string) => `ratelimit:${route}:${ip}`,

  // Feature flags
  featureFlags: () => `feature:flags:v1`,
} as const;

// Usage
const key = CacheKeys.user("123");
await cache.get(key);
```

---

## TTL Strategies

### TTL Guidelines

| Data Type      | TTL    | Reason                              |
| -------------- | ------ | ----------------------------------- |
| User profile   | 5 min  | Balances freshness with performance |
| List queries   | 1 min  | Lists change frequently             |
| Feature flags  | 5 min  | Infrequent changes                  |
| Session data   | 1 hour | Security consideration              |
| Rate limits    | 1 min  | Short window                        |
| Static content | 1 hour | Rarely changes                      |
| Analytics      | 15 min | Near real-time                      |

### TTL Constants

```typescript
// src/server/cache/ttl.ts

export const CacheTTL = {
  // Very short - data changes frequently
  VOLATILE: 30, // 30 seconds

  // Short - balance freshness and performance
  SHORT: 60, // 1 minute

  // Medium - default for most data
  MEDIUM: 300, // 5 minutes

  // Long - data changes infrequently
  LONG: 3600, // 1 hour

  // Very long - static or config data
  STATIC: 86400, // 24 hours

  // Specific purposes
  SESSION: 3600, // 1 hour
  RATE_LIMIT: 60, // 1 minute window
  FEATURE_FLAGS: 300, // 5 minutes
} as const;

// Usage
await cache.set(key, data, CacheTTL.MEDIUM);
```

---

## Cache Invalidation

### Invalidation Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CACHE INVALIDATION STRATEGIES                            │
└─────────────────────────────────────────────────────────────────────────────┘

  1. TIME-BASED (TTL)
  ───────────────────
  • Cache entry expires automatically after TTL
  • Simplest strategy
  • May serve stale data until expiry

  2. EVENT-BASED
  ──────────────
  • Invalidate on specific events (create, update, delete)
  • More complex but more consistent
  • Requires tracking dependencies

  3. VERSION-BASED
  ────────────────
  • Include version in cache key
  • Bump version to invalidate all
  • Good for bulk invalidation

  4. TAG-BASED
  ────────────
  • Tag entries with categories
  • Invalidate all entries with a tag
  • Requires tag tracking
```

### Event-Based Invalidation

```typescript
// Invalidate on user update
async function updateUser(
  userId: string,
  data: UpdateUserInput,
): Promise<User> {
  const cache = getCache();

  // Update database
  const user = await userRepo.update(userId, data);

  // Invalidate specific user cache
  await cache.del(CacheKeys.user(userId));

  // Invalidate related caches
  await cache.del(CacheKeys.userByEmail(user.email));
  await cache.del(CacheKeys.usersCount());

  // Invalidate list caches (could be many pages)
  // Option 1: Delete known pages
  for (let page = 1; page <= 10; page++) {
    await cache.del(CacheKeys.usersList(page, 20));
  }

  // Option 2: Use pattern deletion (if supported)
  // await cache.deletePattern('users:list:*');

  return user;
}
```

### Version-Based Invalidation

```typescript
// Cache key includes version
const CACHE_VERSION = "v2";

export const CacheKeys = {
  user: (id: string) => `${CACHE_VERSION}:user:${id}`,
  // ...
};

// To invalidate all: just bump CACHE_VERSION to 'v3'
// Old 'v2:*' keys will expire naturally
```

---

## Response Caching

### HTTP Cache Headers

```typescript
// src/app/api/v1/sample/route.ts

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(request);
  const data = await fetchPublicData();

  return jsonResponse(data, ctx, {
    // Browser caches for 60s, can serve stale for 300s while revalidating
    cacheControl: "public, max-age=60, stale-while-revalidate=300",
  });
}
```

### Cache Control Patterns

```typescript
// src/server/http/cache.ts

export const CacheControl = {
  // No caching
  NONE: "no-store, no-cache, must-revalidate",

  // Private (browser only, not CDN)
  PRIVATE: "private, max-age=0",

  // Short public cache
  PUBLIC_SHORT: "public, max-age=60, stale-while-revalidate=300",

  // Long public cache
  PUBLIC_LONG: "public, max-age=3600, stale-while-revalidate=86400",

  // Immutable (versioned assets)
  IMMUTABLE: "public, max-age=31536000, immutable",
} as const;

// Usage
return jsonResponse(data, ctx, {
  cacheControl: CacheControl.PUBLIC_SHORT,
});
```

### Cache Decision Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CACHE DECISION FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Is data user-specific?
         │
    ┌────┴────┐
    │ Yes     │ No
    ▼         ▼
  PRIVATE   Is data sensitive?
              │
         ┌────┴────┐
         │ Yes     │ No
         ▼         ▼
       NO_STORE  Does it change often?
                    │
               ┌────┴────┐
               │ Yes     │ No
               ▼         ▼
            SHORT      LONG or IMMUTABLE
```

---

## React Query Integration

### Query Client Configuration

```typescript
// src/lib/query/provider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // How long data is considered fresh
        staleTime: 5 * 60 * 1000, // 5 minutes

        // How long to keep inactive data in memory
        gcTime: 10 * 60 * 1000, // 10 minutes

        // Retry configuration
        retry: 1,
        retryDelay: 1000,

        // Refetch behavior
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
```

### Query Keys

```typescript
// src/lib/query/keys.ts

export const queryKeys = {
  // User queries
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (params: { page: number; limit: number }) =>
      [...queryKeys.users.lists(), params] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Session queries
  session: {
    current: ["session", "current"] as const,
  },
} as const;
```

### Cache Invalidation with React Query

```typescript
// Invalidate after mutation
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserInput) => api.updateUser(data),
    onSuccess: (user) => {
      // Invalidate specific user
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(user.id),
      });

      // Invalidate all user lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.lists(),
      });
    },
  });
}
```

---

## Memory Considerations

### Cache Memory Impact

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CACHE MEMORY CONSIDERATIONS                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ⚠️ React Query (Client)
  ────────────────────────
  • Lives in browser memory
  • gcTime controls cleanup
  • Large responses = high memory
  • Consider pagination

  ⚠️ Redis (Server)
  ──────────────────
  • Has memory limits
  • Set maxmemory policy
  • Use TTL to prevent unbounded growth
  • Monitor memory usage

  ⚠️ In-Memory Cache (Server)
  ───────────────────────────
  • Grows with process
  • Must implement LRU
  • Lost on restart
  • Can cause OOM
```

### Memory-Safe Caching

```typescript
// Don't cache huge objects
// ❌ Bad
await cache.set("all-users", allUsers, 3600); // Could be MB!

// ✅ Good - cache IDs, not full objects
await cache.set("user-ids", userIds, 3600);

// ✅ Good - cache paginated data
await cache.set(`users:page:${page}`, pageData, 300);
```

### LRU Cache for In-Memory

```typescript
// Memory-bounded in-memory cache
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

---

## DO's and DON'Ts

### ✅ DO

1. **DO use consistent key naming**

   ```typescript
   const key = CacheKeys.user(userId);
   ```

2. **DO set appropriate TTLs**

   ```typescript
   await cache.set(key, data, CacheTTL.MEDIUM);
   ```

3. **DO handle cache misses gracefully**

   ```typescript
   const cached = await cache.get(key);
   if (!cached) {
     /* fetch from source */
   }
   ```

4. **DO invalidate on writes**

   ```typescript
   await db.update(...);
   await cache.del(key);
   ```

5. **DO use NullCache for degradation**

   ```typescript
   if (!isRedisEnabled()) return new NullCache();
   ```

6. **DO cache paginated results separately**

   ```typescript
   `users:page:${page}:limit:${limit}`;
   ```

7. **DO log cache errors (but don't throw)**

   ```typescript
   catch (error) { logger.error(...); return null; }
   ```

8. **DO set Cache-Control headers**

   ```typescript
   cacheControl: "public, max-age=60";
   ```

9. **DO use React Query for client caching**

   ```typescript
   staleTime: 5 * 60 * 1000;
   ```

10. **DO bound in-memory caches**
    ```typescript
    new LRUCache(maxSize: 1000)
    ```

### ❌ DON'T

1. **DON'T cache sensitive data without encryption**

   ```typescript
   // ❌ await cache.set('session:123', { password: '...' });
   ```

2. **DON'T cache unbounded collections**

   ```typescript
   // ❌ await cache.set('all-users', allUsers);
   ```

3. **DON'T forget to invalidate**

   ```typescript
   // ❌ Update DB but forget cache
   ```

4. **DON'T use cache as primary storage**

   ```typescript
   // ❌ Only storing in cache
   ```

5. **DON'T cache with infinite TTL**

   ```typescript
   // ❌ await cache.set(key, data); // No TTL!
   ```

6. **DON'T hardcode cache keys**

   ```typescript
   // ❌ await cache.get('user:123');
   // ✅ await cache.get(CacheKeys.user('123'));
   ```

7. **DON'T throw on cache failures**

   ```typescript
   // ❌ throw new Error('Cache failed');
   // ✅ return null; // Graceful fallback
   ```

8. **DON'T cache user-specific data publicly**

   ```typescript
   // ❌ Cache-Control: public (for user data)
   ```

9. **DON'T skip serialization checks**

   ```typescript
   // ❌ Caching circular references, functions
   ```

10. **DON'T cache without considering memory**
    ```typescript
    // ❌ Caching every request result forever
    ```

---

## Quick Reference

### Environment Variables

| Variable                   | Description          | Default |
| -------------------------- | -------------------- | ------- |
| `ENABLE_REDIS`             | Enable Redis cache   | `0`     |
| `UPSTASH_REDIS_REST_URL`   | Upstash REST API URL | -       |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash auth token   | -       |
| `ENABLE_RESPONSE_CACHE`    | Enable HTTP caching  | `0`     |

### TTL Cheat Sheet

| Use Case       | TTL    | Constant           |
| -------------- | ------ | ------------------ |
| Rate limits    | 30-60s | `CacheTTL.SHORT`   |
| User data      | 5min   | `CacheTTL.MEDIUM`  |
| Config/flags   | 5min   | `CacheTTL.MEDIUM`  |
| Sessions       | 1h     | `CacheTTL.SESSION` |
| Static content | 24h    | `CacheTTL.STATIC`  |

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [MEMORY.md](./MEMORY.md) - Cache memory management
- [SERVICES.md](./SERVICES.md) - CacheService interface
- [BEST_PRACTICES.md](./BEST_PRACTICES.md) - Coding standards
