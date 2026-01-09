# Best Practices Guide

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Framework**: Next.js 16 + TypeScript 5 + Supabase

## Table of Contents

1. [Code Organization](#code-organization)
2. [TypeScript Patterns](#typescript-patterns)
3. [React Patterns](#react-patterns)
4. [Next.js Patterns](#nextjs-patterns)
5. [API Design](#api-design)
6. [Database Patterns](#database-patterns)
7. [Error Handling](#error-handling)
8. [Security](#security)
9. [Performance](#performance)
10. [Testing](#testing)
11. [Code Review Checklist](#code-review-checklist)

---

## Code Organization

### File Structure Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FILE STRUCTURE PRINCIPLES                              │
└─────────────────────────────────────────────────────────────────────────────┘

  DOMAIN-DRIVEN ORGANIZATION
  ──────────────────────────

  ❌ Avoid: Organizing by technical type only
  ──────────────────────────────────────────
  src/
  ├── components/    ← All components mixed
  ├── hooks/         ← All hooks mixed
  └── services/      ← All services mixed

  ✅ Prefer: Organizing by domain + technical type
  ────────────────────────────────────────────────
  src/
  ├── app/                  ← Routing layer
  │   └── (auth)/          ← Auth domain routes
  ├── server/              ← Server-only code
  │   ├── auth/            ← Auth domain server
  │   └── services/        ← Domain services
  └── components/          ← Shared UI components
      └── auth/            ← Auth domain components
```

### Import Organization

```typescript
// 1. External packages (React, Next.js, etc.)
import { useState, useCallback } from "react";
import { NextRequest } from "next/server";

// 2. Internal aliases (absolute imports)
import { Button } from "@/components/ui";
import { createRequestContext } from "@/server/http";

// 3. Relative imports (same domain)
import { useLocalState } from "./hooks";
import type { FormData } from "./types";
```

### Barrel Exports

```typescript
// src/components/ui/index.ts
export { Button } from "./Button";
export { Card } from "./Card";
export { Input } from "./Input";
// ...

// Usage - clean imports
import { Button, Card, Input } from "@/components/ui";
```

---

## TypeScript Patterns

### Type-First Development

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TYPE-FIRST APPROACH                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  1. Define types/schemas FIRST
         │
         ▼
  2. Implement functions that use types
         │
         ▼
  3. Types serve as documentation
         │
         ▼
  4. Compiler catches mismatches
```

### Zod as Single Source of Truth

```typescript
// ✅ Define schema once, derive types
import { z } from 'zod';

// Schema definition
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  createdAt: z.string().datetime(),
});

// Derived types
export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.input<typeof UserSchema.omit({ id: true, createdAt: true })>;

// ❌ Avoid: Separate type definitions that can drift
interface User {
  id: string;
  email: string;
  // Might forget to add new fields...
}
```

### Discriminated Unions for State

```typescript
// ✅ Discriminated union pattern
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function Component() {
  const [state, setState] = useState<AsyncState<User>>({ status: 'idle' });

  // TypeScript knows `data` exists when status is 'success'
  if (state.status === 'success') {
    return <div>{state.data.name}</div>;
  }
}
```

### Strict Type Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

### Use `unknown` over `any`

```typescript
// ❌ Bad: any disables type checking
function parse(data: any): User {
  return data; // No validation!
}

// ✅ Good: unknown requires validation
function parse(data: unknown): User {
  const result = UserSchema.safeParse(data);
  if (!result.success) throw new Error("Invalid data");
  return result.data;
}
```

---

## React Patterns

### Component Structure

```tsx
// Component file structure
// 1. Types/interfaces at the top
interface ButtonProps {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  onClick?: () => void;
}

// 2. Component definition
export function Button({
  variant = "primary",
  children,
  onClick,
}: ButtonProps) {
  // 3. Hooks first
  const [isHovered, setIsHovered] = useState(false);

  // 4. Derived values
  const className = cn(buttonVariants({ variant }), isHovered && "ring-2");

  // 5. Handlers
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  // 6. Early returns / guards
  if (!children) return null;

  // 7. Main render
  return (
    <button className={className} onClick={handleClick}>
      {children}
    </button>
  );
}
```

### Composition Over Configuration

```tsx
// ❌ Bad: Prop explosion
<Card
  showHeader={true}
  headerTitle="Title"
  headerAction={<Button>Action</Button>}
  showFooter={true}
  footerContent={<span>Footer</span>}
/>

// ✅ Good: Composition pattern
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Action><Button>Action</Button></Card.Action>
  </Card.Header>
  <Card.Content>Content here</Card.Content>
  <Card.Footer>Footer here</Card.Footer>
</Card>
```

### Custom Hooks for Logic

```typescript
// Extract logic into custom hooks
function useUser(userId: string) {
  const { data, error, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => api.getUser(userId),
  });

  return { user: data, error, isLoading };
}

// Clean component
function UserProfile({ userId }: { userId: string }) {
  const { user, isLoading } = useUser(userId);

  if (isLoading) return <Loading />;
  return <div>{user?.name}</div>;
}
```

### Avoid Prop Drilling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PROP DRILLING SOLUTIONS                                │
└─────────────────────────────────────────────────────────────────────────────┘

  PROBLEM: Passing props through many levels
  ──────────────────────────────────────────

  App
   └─► Layout (user)
        └─► Sidebar (user)
             └─► Navigation (user)
                  └─► UserAvatar (user)  ← Prop drilled 4 levels!

  SOLUTIONS:
  ──────────

  1. CONTEXT (for rarely-changing data)
  ┌─────────────────────────────────────────┐
  │ <UserContext.Provider value={user}>     │
  │   <Layout>                              │
  │     <Sidebar>                           │
  │       <Navigation>                      │
  │         <UserAvatar /> ← useUser()      │
  │       </Navigation>                     │
  │     </Sidebar>                          │
  │   </Layout>                             │
  │ </UserContext.Provider>                 │
  └─────────────────────────────────────────┘

  2. COMPOSITION (for component rendering)
  ┌─────────────────────────────────────────┐
  │ <Layout                                 │
  │   sidebar={<Sidebar avatar={<Avatar />}/>}│
  │ />                                      │
  └─────────────────────────────────────────┘
```

---

## Next.js Patterns

### Server vs Client Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 SERVER vs CLIENT COMPONENTS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  USE SERVER COMPONENTS FOR:
  ──────────────────────────
  • Data fetching
  • Database queries
  • Backend services
  • Sensitive logic
  • Static content

  USE CLIENT COMPONENTS FOR:
  ──────────────────────────
  • useState, useEffect
  • Event handlers
  • Browser APIs
  • Interactivity
  • Third-party UI libs

  PATTERN: Server wraps Client
  ────────────────────────────

  // page.tsx (Server Component)
  async function Page() {
    const data = await fetchData(); // Server-side
    return <ClientComponent data={data} />;
  }

  // ClientComponent.tsx
  "use client";
  function ClientComponent({ data }) {
    const [state, setState] = useState(data);
    // Client-side interactivity
  }
```

### Route Handler Patterns

```typescript
// src/app/api/v1/users/route.ts
import { NextRequest } from "next/server";
import {
  createRequestContext,
  jsonResponse,
  errorResponse,
} from "@/server/http";
import {
  GetUsersRequestSchema,
  GetUsersResponseSchema,
} from "@/schemas/api/v1/users";

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(request);

  try {
    // 1. Validate input
    const params = GetUsersRequestSchema.safeParse({
      page: request.nextUrl.searchParams.get("page"),
      limit: request.nextUrl.searchParams.get("limit"),
    });

    if (!params.success) {
      return errorResponse(400, "Invalid parameters", ctx, {
        errors: params.error.flatten().fieldErrors,
      });
    }

    // 2. Business logic
    const users = await userService.list(params.data);

    // 3. Validate output (optional but recommended)
    const response = GetUsersResponseSchema.parse(users);

    return jsonResponse(response, ctx);
  } catch (error) {
    ctx.logger.error("Failed to list users", { error });
    return errorResponse(500, "Internal server error", ctx);
  }
}
```

### Middleware Patterns

```typescript
// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static files and API routes handled elsewhere
  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  // Authentication check
  const session = await getSession(request);

  if (isProtectedRoute(pathname) && !session) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

---

## API Design

### Contract-First Development

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONTRACT-FIRST FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  1. Define Contract (Zod schema)
         │
         ▼
  2. Generate Types from Contract
         │
         ▼
  3. Implement Route Handler
         │
         ▼
  4. Validate Request with Contract
         │
         ▼
  5. Return Response matching Contract
```

### RESTful Conventions

| Method | Route             | Action      | Status Codes  |
| ------ | ----------------- | ----------- | ------------- |
| GET    | /api/v1/users     | List users  | 200, 400, 401 |
| GET    | /api/v1/users/:id | Get user    | 200, 404      |
| POST   | /api/v1/users     | Create user | 201, 400, 409 |
| PATCH  | /api/v1/users/:id | Update user | 200, 400, 404 |
| DELETE | /api/v1/users/:id | Delete user | 204, 404      |

### Response Format

```typescript
// Success response
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}

// Error response
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": { "email": ["Invalid email format"] }
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

---

## Database Patterns

### Query Safety

```typescript
// ✅ Always use parameterized queries (Supabase does this)
const { data } = await supabase.from("users").select("*").eq("id", userId); // Safe - parameterized

// ❌ Never concatenate user input into queries
// This is impossible with Supabase client, but avoid in raw SQL
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

### Transaction Patterns

```typescript
// Use Supabase RPC for transactions
const { data, error } = await supabase.rpc('transfer_funds', {
  from_account: fromId,
  to_account: toId,
  amount: amount,
});

// In SQL function:
CREATE OR REPLACE FUNCTION transfer_funds(...)
RETURNS void AS $$
BEGIN
  -- Atomic operations
  UPDATE accounts SET balance = balance - amount WHERE id = from_account;
  UPDATE accounts SET balance = balance + amount WHERE id = to_account;
END;
$$ LANGUAGE plpgsql;
```

---

## Error Handling

### Error Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ERROR HANDLING FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Request
     │
     ▼
  ┌───────────────────┐
  │ Route Handler     │
  │ try/catch         │
  └─────────┬─────────┘
            │
    ┌───────┼───────┐
    │       │       │
    ▼       ▼       ▼
  Validation  Business  System
   Errors     Errors    Errors
    400       4xx/5xx    500
```

### Error Classes

```typescript
// src/contracts/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}
```

### Error Handling in Routes

```typescript
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(request);

  try {
    const data = await fetchData();
    return jsonResponse(data, ctx);
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(400, error.message, ctx, {
        code: error.code,
        details: error.details,
      });
    }

    if (error instanceof NotFoundError) {
      return errorResponse(404, error.message, ctx);
    }

    // Log unexpected errors
    ctx.logger.error("Unexpected error", { error });
    return errorResponse(500, "Internal server error", ctx);
  }
}
```

---

## Security

### Security Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SECURITY CHECKLIST                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  Authentication
  ──────────────
  □ Use Supabase Auth (battle-tested)
  □ Validate sessions on every request
  □ Implement session expiry
  □ Use secure cookies (httpOnly, sameSite, secure)

  Authorization
  ─────────────
  □ Implement RBAC/PBAC
  □ Check permissions server-side
  □ Use RLS in database
  □ Validate ownership before operations

  Input Validation
  ────────────────
  □ Validate all inputs with Zod
  □ Sanitize output (XSS prevention)
  □ Limit input sizes
  □ Rate limit endpoints

  Data Protection
  ───────────────
  □ Use HTTPS everywhere
  □ Don't log sensitive data
  □ Encrypt sensitive fields at rest
  □ Hash passwords (Supabase handles this)
```

### Never Trust Client Input

```typescript
// ❌ Bad: Trust client-provided role
const { role } = await request.json();
await createUser({ role }); // User could set role: 'admin'!

// ✅ Good: Determine role server-side
const session = await getSession(request);
const newUserRole = session.user.role === "admin" ? body.role : "user";
```

### Environment Variables

```typescript
// ✅ Use type-safe environment access
import { env } from "@/lib/env";

// env.ts validates all required variables at startup
const apiKey = env.EXTERNAL_API_KEY; // TypeScript-safe

// ❌ Never expose secrets to client
// NEVER use NEXT_PUBLIC_ prefix for secrets
```

---

## Performance

### Performance Principles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PERFORMANCE PYRAMID                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────┐
                    │ Profile │ ← Measure before optimizing
                   ─┴─────────┴─
                  ┌─────────────┐
                  │   Cache    │ ← Multi-level caching
                 ─┴─────────────┴─
                ┌─────────────────┐
                │  Lazy Load     │ ← Load on demand
               ─┴─────────────────┴─
              ┌─────────────────────┐
              │   Minimize Work    │ ← Do less, sooner
             ─┴─────────────────────┴─
            ┌─────────────────────────┐
            │  Efficient Data Fetching│ ← Right data, right time
           ─┴─────────────────────────┴─
```

### Data Fetching Optimization

```typescript
// ✅ Fetch only what you need
const { data } = await supabase
  .from("users")
  .select("id, name, email") // Not select('*')
  .limit(20);

// ✅ Parallel fetching
const [users, posts] = await Promise.all([fetchUsers(), fetchPosts()]);

// ✅ Use React Query for client caching
const { data } = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
  staleTime: 5 * 60 * 1000, // Cache for 5 min
});
```

### Bundle Size

```typescript
// ✅ Dynamic imports for heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Loading />,
  ssr: false, // If not needed on server
});

// ✅ Tree-shake imports
import { Button } from '@/components/ui'; // Named export
// Not: import UI from '@/components/ui'; // Imports everything
```

---

## Testing

### Testing Pyramid

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TESTING PYRAMID                                        │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────┐
                    │   E2E   │  ← Few, slow, high confidence
                   ─┴─────────┴─
                ┌───────────────┐
                │ Integration   │  ← Some, medium speed
               ─┴───────────────┴─
            ┌───────────────────────┐
            │        Unit           │  ← Many, fast, low confidence
           ─┴───────────────────────┴─
```

### Unit Testing Patterns

```typescript
// src/__tests__/utils.test.ts
import { describe, it, expect } from "vitest";
import { formatDate, calculateTotal } from "@/lib/utils";

describe("formatDate", () => {
  it("formats ISO date to readable string", () => {
    const result = formatDate("2024-01-15T00:00:00Z");
    expect(result).toBe("January 15, 2024");
  });

  it("returns empty string for invalid date", () => {
    const result = formatDate("invalid");
    expect(result).toBe("");
  });
});
```

### Integration Testing

```typescript
// src/__tests__/api/users.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestClient, seedDatabase } from "../helpers";

describe("GET /api/v1/users", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  it("returns paginated users", async () => {
    const client = createTestClient();
    const response = await client.get("/api/v1/users?page=1&limit=10");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(10);
    expect(response.body.meta.total).toBeGreaterThan(0);
  });
});
```

---

## Code Review Checklist

### Before Submitting PR

```markdown
## Code Quality

- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Tests pass (`pnpm test`)
- [ ] No console.log or debugging code

## Security

- [ ] Input validated with Zod
- [ ] Auth checked on protected routes
- [ ] No secrets in code or logs
- [ ] RLS policies updated if needed

## Performance

- [ ] No N+1 queries
- [ ] Appropriate caching in place
- [ ] Bundle size considered

## Documentation

- [ ] Complex logic has comments
- [ ] Public APIs have JSDoc
- [ ] README updated if needed
```

---

## Quick Reference

### File Naming

| Type       | Convention           | Example                     |
| ---------- | -------------------- | --------------------------- |
| Components | PascalCase           | `Button.tsx`                |
| Hooks      | camelCase with `use` | `useAuth.ts`                |
| Utils      | camelCase            | `formatDate.ts`             |
| Types      | PascalCase           | `User.ts`                   |
| Routes     | folder-based         | `app/api/v1/users/route.ts` |
| Tests      | `.test.ts` suffix    | `Button.test.tsx`           |

### Import Aliases

| Alias          | Path              |
| -------------- | ----------------- |
| `@/`           | `src/`            |
| `@/components` | `src/components/` |
| `@/lib`        | `src/lib/`        |
| `@/types`      | `src/types/`      |
| `@/server`     | `src/server/`     |

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [MEMORY.md](./MEMORY.md) - Memory management
- [AUTH.md](./AUTH.md) - Authentication & authorization
- [ROUTING.md](./ROUTING.md) - API routing
- [COMPONENTS.md](./COMPONENTS.md) - UI components
- [SERVICES.md](./SERVICES.md) - Services & DI
- [CACHING.md](./CACHING.md) - Caching strategies
- [JOB_QUEUE.md](./JOB_QUEUE.md) - Background jobs
