# API Routing & Contracts Guide

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Pattern**: Schema-First Design

## Table of Contents

1. [Overview](#overview)
2. [Routing Architecture](#routing-architecture)
3. [Schema-First Design](#schema-first-design)
4. [Contract System](#contract-system)
5. [Route Organization](#route-organization)
6. [Request/Response Flow](#requestresponse-flow)
7. [Validation Patterns](#validation-patterns)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Response Helpers](#response-helpers)
11. [Code Examples](#code-examples)
12. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

CoreX implements a **Schema-First** API design where Zod schemas are the single source of truth for both validation and TypeScript types.

### Key Principles

| Principle                  | Implementation                                      |
| -------------------------- | --------------------------------------------------- |
| **Schema-First**           | Zod schemas define validation AND types             |
| **Single Source of Truth** | Types inferred from schemas via `z.infer<>`         |
| **Boundary Validation**    | All external input validated at API boundary        |
| **Fail-Fast**              | Invalid data rejected immediately with clear errors |

### Directory Structure

```
src/
├── app/api/                    # Route handlers
│   ├── internal/              # Internal APIs (admin, cron)
│   │   └── jobs/              # Job queue endpoints
│   └── v1/                    # Public API v1
│       └── sample/            # Example resource
│           └── route.ts
│
├── schemas/                    # API schemas (request/response)
│   └── api/
│       ├── internal/          # Internal API schemas
│       └── v1/                # Public API v1 schemas
│           └── sample.ts
│
├── contracts/                  # Domain contracts (business schemas)
│   ├── common.ts              # Reusable validators
│   ├── errors.ts              # Error schemas
│   └── sample.contract.ts     # Domain-specific contracts
│
└── server/http/               # HTTP utilities
    └── responses.ts           # Response helpers
```

---

## Routing Architecture

### Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API REQUEST FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Client Request
        │
        ▼
  ┌─────────────────┐
  │   Middleware    │  Apply security headers, refresh session
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Route Matcher  │  Next.js App Router matches /api/v1/sample
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Rate Limiter   │  Check request quota
  └────────┬────────┘
           │ (Allowed)
           ▼
  ┌─────────────────┐
  │  Request        │  Parse query params / body
  │  Context        │  Create RequestContext { requestId, ip, ... }
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Schema         │  sampleGetQuerySchema.safeParse(query)
  │  Validation     │  Validate against Zod schema
  └────────┬────────┘
           │ (Valid)        │ (Invalid)
           ▼                ▼
  ┌─────────────────┐  ┌─────────────────┐
  │  Business       │  │  Validation     │
  │  Logic          │  │  Error (400)    │
  └────────┬────────┘  └─────────────────┘
           │
           ▼
  ┌─────────────────┐
  │  Response       │  jsonResponse(data, ctx)
  │  Builder        │  Add headers, status, cache
  └────────┬────────┘
           │
           ▼
  Client Response
```

### Route Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ROUTE TYPES                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  /api/v1/*                              /api/internal/*
  ─────────                              ──────────────
  PUBLIC API                             INTERNAL API

  ┌─────────────────────┐                ┌─────────────────────┐
  │ • Versioned (v1)    │                │ • No version        │
  │ • Rate limited      │                │ • Admin access only │
  │ • User-facing       │                │ • Higher limits     │
  │ • Public docs       │                │ • System operations │
  └─────────────────────┘                └─────────────────────┘

  Examples:                              Examples:
  GET  /api/v1/sample                    POST /api/internal/jobs/dispatch
  POST /api/v1/sample                    POST /api/internal/jobs/worker
  GET  /api/v1/users/:id                 GET  /api/internal/health
```

---

## Schema-First Design

### The Golden Rule

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      THE GOLDEN RULE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   🏆 DEFINE SCHEMAS FIRST → INFER TYPES FROM SCHEMAS                       │
│                                                                             │
│   NEVER manually duplicate type definitions!                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Correct Pattern

```typescript
// ✅ CORRECT: Schema is source of truth

// 1. Define schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
});

// 2. Infer type from schema
export type User = z.infer<typeof userSchema>;

// 3. Use both in route
export async function GET() {
  const data = await fetchUser();
  const validation = userSchema.safeParse(data);

  if (!validation.success) {
    return validationError(validation.error);
  }

  const user: User = validation.data; // Type-safe!
}
```

### Wrong Pattern

```typescript
// ❌ WRONG: Duplicated definitions

// Manual interface (can drift from schema!)
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Separate schema (may not match!)
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  // Forgot createdAt! Interface and schema are out of sync!
});
```

---

## Contract System

### Contract vs Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTRACT vs SCHEMA                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  CONTRACTS (src/contracts/)             SCHEMAS (src/schemas/)
  ──────────────────────────             ─────────────────────

  Domain/business validation             API-specific validation

  ┌─────────────────────────┐            ┌─────────────────────────┐
  │ • Email format          │            │ • GET query params      │
  │ • Safe string           │            │ • POST body shape       │
  │ • Pagination rules      │            │ • Response shape        │
  │ • Domain entity shapes  │            │ • Endpoint-specific     │
  │ • Reusable across APIs  │            │ • Import contracts      │
  └─────────────────────────┘            └─────────────────────────┘

  Example:                               Example:
  contracts/common.ts                    schemas/api/v1/sample.ts
  → safeString, uuid, email              → sampleGetQuerySchema
  → paginationSchema                     → samplePostBodySchema
```

### Common Contracts

```typescript
// src/contracts/common.ts

// Primitive validators
export const safeString = (maxLength = 1000) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .refine((s) => !s.includes("\0"), "Null bytes not allowed");

export const uuid = z.string().uuid().toLowerCase();

export const email = z.string().email().max(254).toLowerCase().trim();

export const httpUrl = z
  .string()
  .url()
  .refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    "Must use http or https",
  );

// Pagination (reusable)
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Sort order
export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");
```

### Domain Contract Example

```typescript
// src/contracts/sample.contract.ts

import { z } from "zod";

// Build on common contracts
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .max(254, "Email too long")
  .toLowerCase()
  .trim();

export const safeStringSchema = (maxLength = 1000) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .refine((s) => !s.includes("\0"), "Null bytes not allowed");

// Domain-specific schemas
export const createSampleRequestSchema = z.object({
  name: safeStringSchema(100),
  email: emailSchema,
  description: safeStringSchema(500).optional(),
  isActive: z.boolean().default(true),
  tags: z.array(z.string().max(50)).max(10).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSampleRequest = z.infer<typeof createSampleRequestSchema>;
```

---

## Route Organization

### File Naming Convention

```
src/schemas/api/v1/
├── sample.ts          → /api/v1/sample
├── users.ts           → /api/v1/users/*
├── posts.ts           → /api/v1/posts/*
└── index.ts           → Re-exports

src/schemas/api/internal/
├── jobs.ts            → /api/internal/jobs/*
├── health.ts          → /api/internal/health
└── index.ts           → Re-exports
```

### Schema File Structure

```typescript
// src/schemas/api/v1/sample.ts

import { z } from "zod";

// ============================================================================
// GET /api/v1/sample - Query Parameters
// ============================================================================

export const sampleGetQuerySchema = z.object({
  name: z.string().min(1).max(100).optional().default("world"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type SampleGetQuery = z.infer<typeof sampleGetQuerySchema>;

// ============================================================================
// GET /api/v1/sample - Response
// ============================================================================

export const sampleGetResponseSchema = z.object({
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
});

export type SampleGetResponse = z.infer<typeof sampleGetResponseSchema>;

// ============================================================================
// POST /api/v1/sample - Request Body
// ============================================================================

export const samplePostBodySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SamplePostBody = z.infer<typeof samplePostBodySchema>;

// ============================================================================
// POST /api/v1/sample - Response
// ============================================================================

export const samplePostResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

export type SamplePostResponse = z.infer<typeof samplePostResponseSchema>;
```

---

## Request/Response Flow

### Route Handler Template

```typescript
// src/app/api/v1/{resource}/route.ts

import { type NextRequest } from "next/server";
import {
  createRequestContext,
  jsonResponse,
  badRequest,
  internalError,
  validationError,
} from "@/server/http/responses";
import {
  getRateLimiter,
  RateLimits,
  buildRateLimitKey,
} from "@/server/rateLimit";
import {
  resourceGetQuerySchema,
  resourcePostBodySchema,
  type ResourceGetResponse,
  type ResourcePostResponse,
} from "@/schemas/api/v1/resource";

export async function GET(request: NextRequest): Promise<Response> {
  // 1. Create request context
  const ctx = createRequestContext(request);

  try {
    // 2. Rate limiting
    const rateLimitKey = buildRateLimitKey(ctx.ip, "/api/v1/resource");
    const limiter = getRateLimiter();
    const result = await limiter.limit(rateLimitKey, RateLimits.PUBLIC);

    if (!result.allowed) {
      return jsonResponse(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        ctx,
        { status: 429 },
      );
    }

    // 3. Parse and validate query params
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams);
    const validation = resourceGetQuerySchema.safeParse(query);

    if (!validation.success) {
      return validationError(validation.error, ctx);
    }

    // 4. Business logic (use validated data)
    const { limit, page } = validation.data;
    const data = await fetchResource({ limit, page });

    // 5. Return typed response
    const response: ResourceGetResponse = {
      data,
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
    };

    return jsonResponse(response, ctx);
  } catch (error) {
    return internalError("Failed to fetch resource", ctx);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  try {
    // 1. Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body", ctx);
    }

    // 2. Validate body
    const validation = resourcePostBodySchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error, ctx);
    }

    // 3. Business logic
    const result = await createResource(validation.data);

    // 4. Return response
    const response: ResourcePostResponse = {
      id: result.id,
      createdAt: result.createdAt,
    };

    return jsonResponse(response, ctx, { status: 201 });
  } catch (error) {
    return internalError("Failed to create resource", ctx);
  }
}
```

---

## Validation Patterns

### safeParse vs parse

```typescript
// ✅ PREFERRED: safeParse (doesn't throw)
const validation = schema.safeParse(data);

if (!validation.success) {
  // Handle error without try/catch
  return validationError(validation.error, ctx);
}

// validation.data is typed!
const user = validation.data;
```

```typescript
// ⚠️ ALTERNATIVE: parse (throws on failure)
try {
  const user = schema.parse(data); // Throws if invalid
} catch (error) {
  if (error instanceof ZodError) {
    return validationError(error, ctx);
  }
  throw error;
}
```

### Coercion for Query Params

```typescript
// Query params are always strings!
// Use z.coerce to convert to proper types

const querySchema = z.object({
  // String → Number
  page: z.coerce.number().int().min(1).default(1),

  // String → Boolean
  active: z.coerce.boolean().default(true),

  // String → Date
  since: z.coerce.date().optional(),
});
```

### Optional vs Default

```typescript
// optional() - Field can be missing, returns undefined
const schema1 = z.object({
  name: z.string().optional(), // string | undefined
});

// default() - Field can be missing, returns default value
const schema2 = z.object({
  name: z.string().default("Anonymous"), // string (always)
});

// Use both - Optional with specific default
const schema3 = z.object({
  page: z.coerce.number().optional().default(1), // number (always 1 if missing)
});
```

### Transform and Refine

```typescript
// transform() - Modify the value
const emailSchema = z
  .string()
  .email()
  .transform((email) => email.toLowerCase().trim());

// refine() - Custom validation
const passwordSchema = z
  .string()
  .min(8)
  .refine(
    (pw) => /[A-Z]/.test(pw) && /[0-9]/.test(pw),
    "Must contain uppercase and number",
  );

// superRefine() - Access context for complex validation
const formSchema = z
  .object({
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords must match",
      });
    }
  });
```

---

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

// Error codes
const ErrorCodes = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
```

### Validation Error Response

```typescript
// validationError() formats Zod errors nicely
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "issues": [
        {
          "path": ["email"],
          "message": "Invalid email format"
        },
        {
          "path": ["name"],
          "message": "String must contain at least 1 character(s)"
        }
      ]
    },
    "requestId": "req_abc123"
  }
}
```

### Error Helper Functions

```typescript
// src/server/http/responses.ts

// 400 Bad Request
export function badRequest(message: string, ctx?: RequestContext): Response;

// 401 Unauthorized
export function unauthorized(message: string, ctx?: RequestContext): Response;

// 403 Forbidden
export function forbidden(message: string, ctx?: RequestContext): Response;

// 404 Not Found
export function notFound(message: string, ctx?: RequestContext): Response;

// 422 Validation Error (from ZodError)
export function validationError(
  error: ZodError,
  ctx?: RequestContext,
): Response;

// 500 Internal Error
export function internalError(message: string, ctx?: RequestContext): Response;
```

---

## Rate Limiting

### Rate Limit Tiers

```typescript
// src/server/rateLimit/index.ts

export const RateLimits = {
  // Public endpoints - stricter limits
  PUBLIC: {
    requests: 60, // Max requests
    window: 60, // Per minute
  },

  // Authenticated endpoints - relaxed limits
  AUTHENTICATED: {
    requests: 120,
    window: 60,
  },

  // Internal/admin endpoints - very relaxed
  INTERNAL: {
    requests: 1000,
    window: 60,
  },
} as const;
```

### Usage in Routes

```typescript
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(request);

  // Build rate limit key (IP + route)
  const key = buildRateLimitKey(ctx.ip, "/api/v1/sample");

  // Check rate limit
  const limiter = getRateLimiter();
  const result = await limiter.limit(key, RateLimits.PUBLIC);

  if (!result.allowed) {
    return jsonResponse(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
      },
      ctx,
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
        },
      },
    );
  }

  // Continue with request...
}
```

---

## Response Helpers

### jsonResponse

```typescript
// Success response with data
return jsonResponse({ data: users, total: 100 }, ctx, { status: 200 });

// With cache control
return jsonResponse({ data: publicData }, ctx, {
  cacheControl: "public, max-age=60, stale-while-revalidate=300",
});

// With custom headers
return jsonResponse({ data }, ctx, {
  headers: {
    "X-Custom-Header": "value",
  },
});
```

### RequestContext

```typescript
interface RequestContext {
  requestId: string; // Unique request ID for tracing
  ip?: string; // Client IP address
  userAgent?: string; // User-Agent header
  path: string; // Request path
  method: string; // HTTP method
}

// Create from request
const ctx = createRequestContext(request);
// ctx.requestId = "req_abc123_xyz789"
// ctx.ip = "192.168.1.1"
// ctx.path = "/api/v1/sample"
```

---

## Code Examples

### Complete GET Route

```typescript
// src/app/api/v1/users/route.ts

import { type NextRequest } from "next/server";
import {
  createRequestContext,
  jsonResponse,
  validationError,
  internalError,
} from "@/server/http/responses";
import { getUsersSchema, type GetUsersResponse } from "@/schemas/api/v1/users";
import { getSession } from "@/server/auth";

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  try {
    // Auth check (optional for this endpoint)
    const session = await getSession();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams);

    // Validate
    const validation = getUsersSchema.safeParse(query);
    if (!validation.success) {
      return validationError(validation.error, ctx);
    }

    const { page, limit, search } = validation.data;

    // Fetch data
    const { users, total } = await fetchUsers({
      page,
      limit,
      search,
      requesterId: session?.userId,
    });

    // Build response
    const response: GetUsersResponse = {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      requestId: ctx.requestId,
    };

    return jsonResponse(response, ctx);
  } catch (error) {
    logger.error("Failed to fetch users", { error, ctx });
    return internalError("Failed to fetch users", ctx);
  }
}
```

### Complete POST Route

```typescript
// src/app/api/v1/users/route.ts

import { type NextRequest } from "next/server";
import {
  createRequestContext,
  jsonResponse,
  badRequest,
  validationError,
  internalError,
} from "@/server/http/responses";
import { requireAuth } from "@/server/auth";
import {
  createUserSchema,
  type CreateUserResponse,
} from "@/schemas/api/v1/users";

export async function POST(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  try {
    // Require authentication
    const session = await requireAuth();

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body", ctx);
    }

    // Validate
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error, ctx);
    }

    // Create user
    const user = await createUser({
      ...validation.data,
      createdBy: session.userId,
    });

    // Response
    const response: CreateUserResponse = {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };

    return jsonResponse(response, ctx, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return unauthorized("Authentication required", ctx);
    }
    logger.error("Failed to create user", { error, ctx });
    return internalError("Failed to create user", ctx);
  }
}
```

---

## DO's and DON'Ts

### ✅ DO

1. **DO define schemas in `/schemas/api/`**

   ```typescript
   // schemas/api/v1/users.ts
   export const getUsersSchema = z.object({ ... });
   ```

2. **DO infer types from schemas**

   ```typescript
   export type GetUsersQuery = z.infer<typeof getUsersSchema>;
   ```

3. **DO use `safeParse()` for validation**

   ```typescript
   const result = schema.safeParse(data);
   if (!result.success) return validationError(result.error, ctx);
   ```

4. **DO create RequestContext first**

   ```typescript
   const ctx = createRequestContext(request);
   ```

5. **DO use `z.coerce` for query params**

   ```typescript
   page: z.coerce.number().default(1);
   ```

6. **DO add JSDoc comments to schemas**

   ```typescript
   /** @property email - User email (required) */
   ```

7. **DO use response helpers**

   ```typescript
   return jsonResponse(data, ctx, { status: 201 });
   ```

8. **DO handle JSON parse errors**

   ```typescript
   try {
     body = await request.json();
   } catch {
     return badRequest("Invalid JSON", ctx);
   }
   ```

9. **DO include requestId in responses**

   ```typescript
   { data, requestId: ctx.requestId }
   ```

10. **DO use rate limiting on public endpoints**
    ```typescript
    await limiter.limit(key, RateLimits.PUBLIC);
    ```

### ❌ DON'T

1. **DON'T manually define types**

   ```typescript
   // ❌ WRONG
   interface User {
     id: string;
   }
   ```

2. **DON'T use `any` in route handlers**

   ```typescript
   // ❌ WRONG
   const body: any = await request.json();
   ```

3. **DON'T trust unvalidated input**

   ```typescript
   // ❌ WRONG
   const { email } = await request.json();
   await saveUser(email); // Not validated!
   ```

4. **DON'T use `.parse()` without try/catch**

   ```typescript
   // ❌ WRONG - throws uncaught
   const data = schema.parse(input);
   ```

5. **DON'T skip error handling**

   ```typescript
   // ❌ WRONG - crashes on error
   export async function GET() {
     const data = await fetchData();
     return Response.json(data);
   }
   ```

6. **DON'T hardcode error messages**

   ```typescript
   // ❌ WRONG
   return new Response("Error", { status: 500 });
   ```

7. **DON'T mix schemas and contracts**

   ```typescript
   // ❌ WRONG - schemas should import contracts
   // contracts/user.ts
   import { userGetQuerySchema } from "@/schemas/api/v1/users";
   ```

8. **DON'T return raw database errors**

   ```typescript
   // ❌ WRONG - leaks implementation details
   return Response.json({ error: dbError.message });
   ```

9. **DON'T forget rate limiting**

   ```typescript
   // ❌ WRONG - no rate limiting on public endpoint
   export async function GET() { ... }
   ```

10. **DON'T use number for query params directly**
    ```typescript
    // ❌ WRONG - query params are strings!
    page: z.number();
    ```

---

## Quick Reference

### Schema Naming Convention

| Type      | Pattern                            | Example                  |
| --------- | ---------------------------------- | ------------------------ |
| GET Query | `{resource}GetQuerySchema`         | `usersGetQuerySchema`    |
| POST Body | `{resource}PostBodySchema`         | `usersPostBodySchema`    |
| PUT Body  | `{resource}PutBodySchema`          | `usersPutBodySchema`     |
| Response  | `{resource}{Method}ResponseSchema` | `usersGetResponseSchema` |
| Type      | `{Resource}{Method}{Part}`         | `UsersGetQuery`          |

### Import Pattern

```typescript
// Route handler
import {
  usersGetQuerySchema, // For validation
  type UsersGetQuery, // For type hints
  type UsersGetResponse, // For response type
} from "@/schemas/api/v1/users";
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [AUTH.md](./AUTH.md) - Authentication in routes
- [MEMORY.md](./MEMORY.md) - Memory-efficient responses
- [BEST_PRACTICES.md](./BEST_PRACTICES.md) - Coding standards
