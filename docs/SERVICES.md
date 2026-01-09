# Services & Dependency Injection Guide

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Pattern**: Dependency Inversion Principle (DIP)

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Service Container](#service-container)
4. [Service Interfaces](#service-interfaces)
5. [Service Lifecycles](#service-lifecycles)
6. [Creating Services](#creating-services)
7. [Using Services](#using-services)
8. [Testing Services](#testing-services)
9. [Plugin Services](#plugin-services)
10. [Service Patterns](#service-patterns)
11. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

CoreX implements **Dependency Injection (DI)** to achieve:

| Benefit               | Description                                          |
| --------------------- | ---------------------------------------------------- |
| **Testability**       | Services can be mocked easily                        |
| **Loose Coupling**    | Components depend on interfaces, not implementations |
| **Single Source**     | One place for service configuration                  |
| **Lifecycle Control** | Container manages creation and disposal              |
| **Plugin Support**    | Plugins can provide alternative implementations      |

### Design Principles

1. **Dependency Inversion** - Depend on abstractions, not concretions
2. **Interface Segregation** - Small, focused interfaces
3. **Single Responsibility** - Each service does one thing well
4. **Composition** - Build complex services from simple ones

---

## Architecture

### Service Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVICE ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

  Types (Interfaces)                  Container                 Implementations
  ─────────────────                   ─────────                 ───────────────

  ┌─────────────────┐                ┌─────────────────┐
  │ src/types/      │                │ src/lib/di/     │
  │ services.ts     │                │ container.ts    │
  │                 │                │                 │
  │ • CacheService  │ ◀──────────── │ • register()    │ ◀────────────┐
  │ • AuthService   │  Implements   │ • get<T>()      │               │
  │ • Repository<T> │               │ • createScope() │               │
  └─────────────────┘                └────────┬────────┘               │
                                              │                        │
                                              │ Provides               │
                                              ▼                        │
                                     ┌─────────────────┐      ┌───────┴───────┐
                                     │   Application   │      │ src/server/   │
                                     │                 │      │ cache/        │
                                     │ Route handlers  │      │               │
                                     │ Use cases       │      │ RedisCache    │
                                     │ Components      │      │ NullCache     │
                                     └─────────────────┘      └───────────────┘
```

### Directory Structure

```
src/
├── types/
│   └── services.ts        # Service interfaces (contracts)
│
├── lib/di/
│   ├── index.ts           # Re-exports
│   └── container.ts       # ServiceContainerImpl
│
├── services/              # Isomorphic services (can run anywhere)
│   └── index.ts           # Service exports
│
├── server/                # Server-only services
│   ├── services/          # Server service implementations
│   ├── cache/             # Cache implementations
│   └── auth/              # Auth implementations
│
├── application/           # Use cases (orchestrate services)
│   ├── index.ts
│   └── usecases/
│
└── dal/                   # Data Access Layer (repositories)
    └── *.repo.ts
```

---

## Service Container

### Container Interface

```typescript
// src/types/services.ts
export interface ServiceContainer {
  /** Get a service by ID - throws if not found */
  get<T>(id: string): T;

  /** Get a service by ID - returns undefined if not found */
  getOptional<T>(id: string): T | undefined;

  /** Check if a service is registered */
  has(id: string): boolean;

  /** Create a child scope */
  createScope(): ServiceContainer;

  /** Dispose the container and all services */
  dispose(): Promise<void>;
}
```

### Container Implementation

```typescript
// src/lib/di/container.ts
import type { ServiceContainer } from "@/types/services";

export class ServiceContainerImpl implements ServiceContainer {
  private readonly services = new Map<string, ServiceDescriptor>();
  private readonly scopedInstances = new Map<string, unknown>();
  private readonly parent?: ServiceContainerImpl;
  private disposed = false;

  constructor(parent?: ServiceContainerImpl) {
    this.parent = parent;
  }

  /** Register a service factory */
  register<T>(id: string, factory: () => T, options?: ServiceOptions): void;

  /** Register a singleton service */
  registerSingleton<T>(id: string, factory: () => T): void;

  /** Register a scoped service */
  registerScoped<T>(id: string, factory: () => T): void;

  /** Register an existing instance */
  registerInstance<T>(id: string, instance: T): void;

  /** Get a service by ID */
  get<T>(id: string): T;

  /** Get services by tag */
  getByTag<T>(tag: string): T[];

  /** Create a child scope */
  createScope(): ServiceContainerImpl;

  /** Dispose container and services */
  dispose(): Promise<void>;
}
```

### Container Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTAINER RESOLUTION FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

  container.get<UserService>('userService')
                    │
                    ▼
          ┌─────────────────┐
          │ Check local     │
          │ services map    │
          └────────┬────────┘
                   │
        ┌──────────┴──────────┐
        │ Found               │ Not Found
        ▼                     ▼
  ┌─────────────┐      ┌─────────────┐
  │ Check       │      │ Check       │
  │ lifecycle   │      │ parent      │
  └──────┬──────┘      └──────┬──────┘
         │                    │
    ┌────┴────┐          ┌────┴────┐
    │         │          │         │
    ▼         ▼          ▼         ▼
Singleton  Transient  Parent   Throw
    │         │       Found   Error
    │         │          │
    ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Return │ │ Create │ │ Return │
│ cached │ │ new    │ │ from   │
│instance│ │instance│ │ parent │
└────────┘ └────────┘ └────────┘
```

---

## Service Interfaces

### Core Service Interfaces

```typescript
// src/types/services.ts

// ============================================================================
// CACHE SERVICE
// ============================================================================

export interface CacheService {
  /** Get cached value */
  get<T>(key: string): Promise<T | null>;

  /** Set value with TTL */
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;

  /** Delete from cache */
  delete(key: string): Promise<void>;

  /** Delete by pattern */
  deletePattern(pattern: string): Promise<void>;

  /** Check existence */
  has(key: string): Promise<boolean>;

  /** Get or compute */
  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T>;
}

// ============================================================================
// AUTH SERVICE
// ============================================================================

export interface AuthService {
  signIn(credentials: AuthCredentials): Promise<Result<Session>>;
  signOut(sessionId: string): Promise<Result<void>>;
  verifySession(token: string): Promise<Result<Session>>;
  getCurrentUser(): Promise<User | null>;
}

// ============================================================================
// REPOSITORY (Generic)
// ============================================================================

export interface Repository<
  T,
  TId = string,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> {
  findById(id: TId): Promise<T | null>;
  findMany(options?: QueryOptions): Promise<PaginatedResult<T>>;
  create(data: TCreate): Promise<T>;
  update(id: TId, data: TUpdate): Promise<T>;
  delete(id: TId): Promise<void>;
  exists(id: TId): Promise<boolean>;
}

// ============================================================================
// LOGGER SERVICE
// ============================================================================

export interface LoggerService {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): LoggerService;
}
```

### Interface Design Guidelines

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   INTERFACE DESIGN PRINCIPLES                               │
└─────────────────────────────────────────────────────────────────────────────┘

  1. SMALL & FOCUSED (Interface Segregation)
  ──────────────────────────────────────────

  ❌ Wrong:
  interface UserService {
    findById(): User;
    create(): User;
    sendEmail(): void;    // Unrelated!
    generateReport(): void; // Unrelated!
  }

  ✅ Correct:
  interface UserRepository { findById(); create(); }
  interface EmailService { sendEmail(); }
  interface ReportService { generateReport(); }

  2. ASYNC FOR I/O
  ─────────────────

  ❌ Wrong:
  interface CacheService {
    get(key: string): T;  // Sync but I/O!
  }

  ✅ Correct:
  interface CacheService {
    get(key: string): Promise<T>;
  }

  3. RESULT TYPES FOR FAILURES
  ────────────────────────────

  ❌ Wrong:
  interface AuthService {
    signIn(): Promise<Session>;  // Throws on failure
  }

  ✅ Correct:
  interface AuthService {
    signIn(): Promise<Result<Session>>;  // Explicit failure
  }
```

---

## Service Lifecycles

### Lifecycle Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SERVICE LIFECYCLES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  SINGLETON                    SCOPED                      TRANSIENT
  ─────────                    ──────                      ─────────

  One instance                 One instance per scope      New instance
  for entire app               (e.g., per request)         every time

  ┌─────────┐                 ┌─────────┐                 ┌─────────┐
  │ Request │                 │ Request │                 │ Request │
  │    1    │──┐              │    1    │───▶ Instance 1  │    1    │───▶ Instance 1
  └─────────┘  │              └─────────┘                 └─────────┘
               │
  ┌─────────┐  │              ┌─────────┐                 ┌─────────┐
  │ Request │──┼──▶ SAME      │ Request │───▶ Instance 2  │ Request │───▶ Instance 2
  │    2    │  │   Instance   │    2    │                 │    2    │
  └─────────┘  │              └─────────┘                 └─────────┘
               │
  ┌─────────┐  │              ┌─────────┐                 ┌─────────┐
  │ Request │──┘              │ Request │───▶ Instance 3  │ Request │───▶ Instance 3
  │    3    │                 │    3    │                 │    3    │
  └─────────┘                 └─────────┘                 └─────────┘

  Use for:                    Use for:                    Use for:
  • Configuration             • Database connections      • Stateless utilities
  • Logging                   • Request context           • Factories
  • Cache clients             • Unit of work              • Short-lived operations
```

### Registration Examples

```typescript
const container = new ServiceContainerImpl();

// Singleton - shared across entire application
container.registerSingleton("logger", () => new ConsoleLogger());
container.registerSingleton("cache", () => new RedisCache(config));

// Scoped - one per request/scope
container.registerScoped("dbConnection", () => new DatabaseConnection());
container.registerScoped("unitOfWork", () => new UnitOfWork());

// Transient - new instance every time
container.register("validator", () => new RequestValidator());
container.register("encoder", () => new DataEncoder());

// Instance - pre-created object
container.registerInstance("config", appConfig);
```

---

## Creating Services

### Service Implementation Pattern

```typescript
// src/server/services/user.service.ts
import "server-only";
import type { Repository, CacheService, LoggerService } from "@/types/services";
import type { User, UserId, CreateUserInput } from "@/types/entities";

export class UserService {
  constructor(
    private readonly userRepo: Repository<User, UserId, CreateUserInput>,
    private readonly cache: CacheService,
    private readonly logger: LoggerService,
  ) {}

  async findById(id: UserId): Promise<User | null> {
    // Try cache first
    const cacheKey = `user:${id}`;
    const cached = await this.cache.get<User>(cacheKey);

    if (cached) {
      this.logger.debug("User cache hit", { userId: id });
      return cached;
    }

    // Fetch from database
    const user = await this.userRepo.findById(id);

    if (user) {
      await this.cache.set(cacheKey, user, 300); // 5 min TTL
    }

    return user;
  }

  async create(input: CreateUserInput): Promise<User> {
    this.logger.info("Creating user", { email: input.email });

    const user = await this.userRepo.create(input);

    // Invalidate any relevant caches
    await this.cache.deletePattern("users:*");

    return user;
  }
}
```

### Registering Services

```typescript
// src/lib/di/setup.ts
import { ServiceContainerImpl } from "./container";

export function createContainer(): ServiceContainerImpl {
  const container = new ServiceContainerImpl();

  // Core services (singletons)
  container.registerSingleton("logger", () => {
    return new ConsoleLogger({ level: "info" });
  });

  container.registerSingleton("cache", () => {
    if (process.env.ENABLE_REDIS === "1") {
      return new RedisCache(process.env.REDIS_URL!);
    }
    return new NullCache();
  });

  // Repositories (scoped to request)
  container.registerScoped("userRepo", () => {
    return new UserRepository(container.get("db"));
  });

  // Services (can depend on other services)
  container.registerScoped("userService", () => {
    return new UserService(
      container.get("userRepo"),
      container.get("cache"),
      container.get("logger"),
    );
  });

  return container;
}

// Export singleton container
export const container = createContainer();
```

---

## Using Services

### In Route Handlers

```typescript
// src/app/api/v1/users/[id]/route.ts
import { type NextRequest } from "next/server";
import { container } from "@/lib/di";
import { jsonResponse, notFound } from "@/server/http/responses";
import type { UserService } from "@/server/services/user.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = createRequestContext(request);

  // Get service from container
  const userService = container.get<UserService>("userService");

  const user = await userService.findById(params.id as UserId);

  if (!user) {
    return notFound("User not found", ctx);
  }

  return jsonResponse({ user }, ctx);
}
```

### With Request Scope

```typescript
// src/server/middleware/scope.ts
import { container } from "@/lib/di";

export async function withRequestScope<T>(
  handler: (scope: ServiceContainer) => Promise<T>,
): Promise<T> {
  const scope = container.createScope();

  try {
    return await handler(scope);
  } finally {
    await scope.dispose();
  }
}

// Usage
export async function GET(request: NextRequest) {
  return withRequestScope(async (scope) => {
    const userService = scope.get<UserService>("userService");
    const users = await userService.findAll();
    return Response.json({ users });
  });
}
```

### In Use Cases

```typescript
// src/application/usecases/create-user.ts
import type { UserService } from "@/server/services/user.service";
import type { EmailService } from "@/server/services/email.service";
import type { Result } from "@/types/errors";
import type { User, CreateUserInput } from "@/types/entities";

export class CreateUserUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly emailService: EmailService,
  ) {}

  async execute(input: CreateUserInput): Promise<Result<User>> {
    // Check if email exists
    const existing = await this.userService.findByEmail(input.email);
    if (existing) {
      return { success: false, error: new Error("Email already exists") };
    }

    // Create user
    const user = await this.userService.create(input);

    // Send welcome email (fire and forget)
    this.emailService.sendWelcome(user.email).catch(console.error);

    return { success: true, data: user };
  }
}
```

---

## Testing Services

### Mocking Services

```typescript
// tests/services/user.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "@/server/services/user.service";

// Create mock implementations
const mockUserRepo = {
  findById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
};

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  deletePattern: vi.fn(),
  has: vi.fn(),
  getOrSet: vi.fn(),
};

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
};

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new UserService(mockUserRepo, mockCache, mockLogger);
  });

  it("should return cached user if available", async () => {
    const cachedUser = { id: "123", email: "test@example.com" };
    mockCache.get.mockResolvedValue(cachedUser);

    const result = await userService.findById("123" as UserId);

    expect(result).toEqual(cachedUser);
    expect(mockUserRepo.findById).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith("User cache hit", {
      userId: "123",
    });
  });

  it("should fetch from repo and cache on miss", async () => {
    const user = { id: "123", email: "test@example.com" };
    mockCache.get.mockResolvedValue(null);
    mockUserRepo.findById.mockResolvedValue(user);

    const result = await userService.findById("123" as UserId);

    expect(result).toEqual(user);
    expect(mockUserRepo.findById).toHaveBeenCalledWith("123");
    expect(mockCache.set).toHaveBeenCalledWith("user:123", user, 300);
  });
});
```

### Using Test Container

```typescript
// tests/helpers/container.ts
import { ServiceContainerImpl } from "@/lib/di/container";

export function createTestContainer() {
  const container = new ServiceContainerImpl();

  // Register test doubles
  container.registerInstance("logger", mockLogger);
  container.registerInstance("cache", mockCache);

  return container;
}

// In tests
describe("Integration Test", () => {
  it("should work with test container", async () => {
    const container = createTestContainer();

    // Register service under test with real implementation
    container.registerScoped("userService", () => {
      return new UserService(
        container.get("userRepo"),
        container.get("cache"),
        container.get("logger"),
      );
    });

    const userService = container.get<UserService>("userService");
    // Test...
  });
});
```

---

## Plugin Services

### Registering Plugin Services

```typescript
// Plugin can provide alternative implementations
interface PluginContext {
  container: ServiceContainer;
}

const myPlugin: PluginDefinition = {
  metadata: {
    id: "analytics-plugin",
    name: "Analytics Plugin",
    version: "1.0.0",
  },

  async activate(ctx: PluginContext) {
    // Override default analytics service
    ctx.container.registerSingleton(
      "analyticsService",
      () => new MixpanelAnalytics(process.env.MIXPANEL_TOKEN!),
    );
  },
};
```

### Service Discovery by Tags

```typescript
// Register services with tags
container.registerSingleton("mixpanel", () => new MixpanelAnalytics(), {
  tags: ["analytics", "tracking"],
});

container.registerSingleton("posthog", () => new PostHogAnalytics(), {
  tags: ["analytics", "tracking"],
});

// Get all analytics providers
const analyticsProviders = container.getByTag<AnalyticsService>("analytics");

// Broadcast event to all
for (const provider of analyticsProviders) {
  provider.track("page_view", { path: "/home" });
}
```

---

## Service Patterns

### Factory Pattern

```typescript
// When you need to create services with runtime parameters
container.registerSingleton("emailServiceFactory", () => {
  return {
    create(options: EmailOptions): EmailService {
      if (options.provider === "sendgrid") {
        return new SendGridEmailService(options);
      }
      if (options.provider === "ses") {
        return new SESEmailService(options);
      }
      return new ConsoleEmailService();
    },
  };
});

// Usage
const factory = container.get<EmailServiceFactory>("emailServiceFactory");
const emailService = factory.create({ provider: "sendgrid" });
```

### Decorator Pattern

```typescript
// Wrap services with additional behavior
class CachedUserRepository implements Repository<User> {
  constructor(
    private readonly inner: Repository<User>,
    private readonly cache: CacheService,
  ) {}

  async findById(id: UserId): Promise<User | null> {
    return this.cache.getOrSet(
      `user:${id}`,
      () => this.inner.findById(id),
      300,
    );
  }

  // Delegate other methods...
}

// Registration
container.registerScoped("userRepo", () => {
  const baseRepo = new SupabaseUserRepository(container.get("db"));
  const cache = container.get<CacheService>("cache");
  return new CachedUserRepository(baseRepo, cache);
});
```

### Null Object Pattern

```typescript
// When a service might not be available
class NullCache implements CacheService {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set<T>(_key: string, _value: T, _ttl: number): Promise<void> {
    // No-op
  }

  async delete(_key: string): Promise<void> {
    // No-op
  }

  // ...
}

// Registration with fallback
container.registerSingleton("cache", () => {
  if (isRedisEnabled()) {
    return new RedisCache(process.env.REDIS_URL!);
  }
  return new NullCache(); // Graceful degradation
});
```

---

## DO's and DON'Ts

### ✅ DO

1. **DO depend on interfaces**

   ```typescript
   constructor(private readonly cache: CacheService) // Interface
   ```

2. **DO use constructor injection**

   ```typescript
   class UserService {
     constructor(
       private readonly repo: Repository<User>,
       private readonly cache: CacheService,
     ) {}
   }
   ```

3. **DO register services by lifecycle**

   ```typescript
   container.registerSingleton('config', ...);
   container.registerScoped('dbConnection', ...);
   ```

4. **DO dispose scoped containers**

   ```typescript
   const scope = container.createScope();
   try { ... } finally { await scope.dispose(); }
   ```

5. **DO use factory functions**

   ```typescript
   container.register('service', () => new Service(...));
   ```

6. **DO create test doubles**

   ```typescript
   const mockCache = { get: vi.fn(), set: vi.fn() };
   ```

7. **DO use tags for categorization**

   ```typescript
   container.register("service", factory, { tags: ["analytics"] });
   ```

8. **DO implement null objects**

   ```typescript
   class NullCache implements CacheService { ... }
   ```

9. **DO keep interfaces focused**

   ```typescript
   interface UserReader {
     findById(): User;
   }
   interface UserWriter {
     create(): User;
   }
   ```

10. **DO document service dependencies**
    ```typescript
    /** @requires CacheService, LoggerService */
    ```

### ❌ DON'T

1. **DON'T depend on implementations**

   ```typescript
   // ❌ constructor(private readonly cache: RedisCache)
   // ✅ constructor(private readonly cache: CacheService)
   ```

2. **DON'T use service locator pattern**

   ```typescript
   // ❌ Inside method:
   const cache = container.get("cache");
   ```

3. **DON'T create circular dependencies**

   ```typescript
   // ❌ ServiceA → ServiceB → ServiceA
   ```

4. **DON'T forget to handle disposal**

   ```typescript
   // ❌ Creating scopes without disposing
   ```

5. **DON'T register mutable state as singleton**

   ```typescript
   // ❌ container.registerSingleton('state', () => []);
   ```

6. **DON'T use concrete types in interfaces**

   ```typescript
   // ❌ interface Service { repo: SupabaseRepository; }
   ```

7. **DON'T over-inject dependencies**

   ```typescript
   // ❌ constructor(a, b, c, d, e, f, g) // Too many!
   ```

8. **DON'T skip interface definitions**

   ```typescript
   // ❌ Just using class types everywhere
   ```

9. **DON'T share scoped services across requests**

   ```typescript
   // ❌ Storing request-scoped service in module
   ```

10. **DON'T forget async initialization**
    ```typescript
    // ❌ const db = new Database(); // Needs await connect()
    ```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [MEMORY.md](./MEMORY.md) - Service memory management
- [CACHING.md](./CACHING.md) - Cache service details
- [BEST_PRACTICES.md](./BEST_PRACTICES.md) - Coding standards
