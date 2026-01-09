# Security Guide

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Priority**: CRITICAL

## Table of Contents

1. [Overview](#overview)
2. [Security Architecture](#security-architecture)
3. [Input Validation](#input-validation)
4. [Output Sanitization](#output-sanitization)
5. [Authentication Security](#authentication-security)
6. [Authorization & Access Control](#authorization--access-control)
7. [Security Headers](#security-headers)
8. [Rate Limiting](#rate-limiting)
9. [Data Protection](#data-protection)
10. [Vulnerability Prevention](#vulnerability-prevention)
11. [Security Checklist](#security-checklist)
12. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

CoreX implements defense-in-depth security with multiple layers of protection.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SECURITY ARCHITECTURE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  Request
     │
     ▼
  ┌─────────────────┐
  │ Security Headers│  ← CSP, HSTS, X-Frame-Options
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Rate Limiting  │  ← Prevent abuse, DDoS mitigation
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Authentication  │  ← Verify identity (Supabase Auth)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Authorization   │  ← Check permissions (RBAC/PBAC)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Input Validation│  ← Zod schemas, sanitization
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Business Logic  │  ← Protected operations
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Output Encoding │  ← XSS prevention
  └─────────────────┘
```

### Security Principles

| Principle            | Implementation                  |
| -------------------- | ------------------------------- |
| **Defense in Depth** | Multiple security layers        |
| **Least Privilege**  | Minimal permissions by default  |
| **Zero Trust**       | Verify every request            |
| **Fail Secure**      | Safe defaults on error          |
| **Input Validation** | Validate all inputs server-side |
| **Output Encoding**  | Escape all outputs              |

---

## Security Architecture

### Module Structure

```
src/server/security/
├── index.ts           # Unified exports
├── types.ts           # Security type definitions
├── sanitize.ts        # Input/output sanitization
└── headers.ts         # Security headers (CSP, etc.)
```

### Core Security Types

```typescript
// src/server/security/types.ts

export type UserRole = "user" | "moderator" | "admin" | "super_admin";

export interface SecurityContext {
  userId: string | null;
  role: UserRole | null;
  permissions: string[];
  sessionId: string | null;
  ip: string;
  userAgent: string;
}

export interface AuthContext {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
}

export type Permission =
  | "read:users"
  | "write:users"
  | "delete:users"
  | "admin:system";
```

---

## Input Validation

### Validation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INPUT VALIDATION PIPELINE                              │
└─────────────────────────────────────────────────────────────────────────────┘

  Raw Input
     │
     ▼
  ┌─────────────────┐
  │ Type Coercion   │  ← Convert strings to proper types
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Schema Validate │  ← Zod schema validation
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Sanitize        │  ← Strip dangerous patterns
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Normalize       │  ← Consistent format
  └────────┬────────┘
           │
           ▼
  Safe Input
```

### Zod Validation Patterns

```typescript
import { z } from "zod";

// String validation with sanitization
const SafeStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .refine((val) => !/<script/i.test(val), "Script tags not allowed");

// Email validation
const EmailSchema = z.string().email().toLowerCase().max(254);

// URL validation
const UrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith("https://"), "Only HTTPS URLs allowed");

// UUID validation
const UuidSchema = z.string().uuid();

// Pagination (with limits)
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

### Request Validation

```typescript
export async function POST(request: NextRequest) {
  const ctx = createRequestContext(request);

  // Parse and validate body
  const body = await request.json().catch(() => ({}));
  const result = CreateUserSchema.safeParse(body);

  if (!result.success) {
    return errorResponse(400, "Validation failed", ctx, {
      errors: result.error.flatten().fieldErrors,
    });
  }

  // result.data is now type-safe and validated
  const { email, name } = result.data;
}
```

---

## Output Sanitization

### HTML Escaping

```typescript
// src/server/security/sanitize.ts

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "");
}
```

### String Sanitization

```typescript
/**
 * Sanitize string for safe display
 */
export function sanitizeString(str: string): string {
  if (typeof str !== "string") return "";

  let sanitized = str;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Remove JavaScript protocol
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: URIs
  sanitized = sanitized.replace(/data:/gi, "");

  // Remove vbscript protocol
  sanitized = sanitized.replace(/vbscript:/gi, "");

  // Remove on* event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, "");

  return sanitized.trim();
}
```

### URL Sanitization

```typescript
const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];

/**
 * Sanitize and validate a URL
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== "string") return null;

  try {
    const parsed = new URL(url);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}
```

### Object Sanitization

```typescript
/**
 * Deep sanitize an object, escaping all string values
 */
export function sanitizeObject<T>(obj: T, depth = 10): T {
  if (depth <= 0) return obj;

  if (typeof obj === "string") {
    return sanitizeString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth - 1)) as T;
  }

  if (obj && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value, depth - 1);
    }
    return sanitized as T;
  }

  return obj;
}
```

---

## Authentication Security

### Session Management

```typescript
// Session security best practices
const SESSION_CONFIG = {
  // Short-lived access tokens
  accessTokenLifetime: 60 * 60, // 1 hour

  // Longer refresh tokens
  refreshTokenLifetime: 7 * 24 * 60 * 60, // 7 days

  // Cookie settings
  cookie: {
    httpOnly: true, // Prevent XSS access
    secure: true, // HTTPS only
    sameSite: "lax", // CSRF protection
    path: "/",
  },
};
```

### Password Requirements

```typescript
const PasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[a-z]/, "Must contain lowercase letter")
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[^a-zA-Z0-9]/, "Must contain special character");
```

### Token Security

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TOKEN SECURITY                                         │
└─────────────────────────────────────────────────────────────────────────────┘

  ✅ DO
  ──────
  • Use short-lived access tokens (1 hour max)
  • Store refresh tokens in httpOnly cookies
  • Validate tokens on every request
  • Implement token rotation

  ❌ DON'T
  ─────────
  • Store tokens in localStorage (XSS vulnerable)
  • Use long-lived access tokens
  • Include sensitive data in JWT payload
  • Trust client-provided tokens without validation
```

---

## Authorization & Access Control

### Role-Based Access Control (RBAC)

```typescript
// Role hierarchy
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  super_admin: ["super_admin", "admin", "moderator", "user"],
  admin: ["admin", "moderator", "user"],
  moderator: ["moderator", "user"],
  user: ["user"],
};

function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole]?.includes(requiredRole) ?? false;
}
```

### Permission-Based Access Control (PBAC)

```typescript
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: ["read:users", "write:users", "delete:users", "admin:system"],
  admin: ["read:users", "write:users", "delete:users"],
  moderator: ["read:users", "write:users"],
  user: ["read:users"],
};

function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
```

### Row Level Security (RLS)

```sql
-- Enable RLS on table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users read own data"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Admins can see all data
CREATE POLICY "Admins read all"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);
```

---

## Security Headers

### Content Security Policy (CSP)

```typescript
// Development CSP (permissive)
const DEV_CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "connect-src": ["'self'", "wss://*.supabase.co", "ws://localhost:*"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
};

// Production CSP (strict)
const PROD_CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'strict-dynamic'"], // + nonce
  "style-src": ["'self'", "'unsafe-inline'"], // Tailwind needs this
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "connect-src": ["'self'", "https://*.supabase.co"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "upgrade-insecure-requests": true,
};
```

### Other Security Headers

```typescript
// next.config.ts
const SECURITY_HEADERS = [
  // HSTS - Force HTTPS
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Prevent clickjacking
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Prevent MIME sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Control referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Restrict browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];
```

---

## Rate Limiting

### Rate Limit Configuration

```typescript
// Per-route rate limits
const RATE_LIMITS = {
  // Auth endpoints - strict
  "/api/auth/login": { requests: 5, window: 60 }, // 5/min
  "/api/auth/signup": { requests: 3, window: 60 }, // 3/min
  "/api/auth/reset": { requests: 2, window: 60 }, // 2/min

  // Public API - moderate
  "/api/v1/*": { requests: 100, window: 60 }, // 100/min

  // Internal API - higher
  "/api/internal/*": { requests: 1000, window: 60 }, // 1000/min
};
```

### Rate Limiter Implementation

```typescript
import { getCache } from "@/server/cache";

async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const cache = getCache();
  const key = `ratelimit:${identifier}`;

  const current = (await cache.get<number>(key)) ?? 0;

  if (current >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await cache.set(key, current + 1, windowSeconds);

  return { allowed: true, remaining: limit - current - 1 };
}
```

---

## Data Protection

### Sensitive Data Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATA CLASSIFICATION                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐
  │    CRITICAL     │  Passwords, API keys, tokens
  │                 │  • Never log
  │                 │  • Never expose in responses
  │                 │  • Encrypt at rest
  └─────────────────┘

  ┌─────────────────┐
  │   SENSITIVE     │  Email, phone, address
  │                 │  • Mask in logs
  │                 │  • Limit access
  │                 │  • Audit access
  └─────────────────┘

  ┌─────────────────┐
  │    INTERNAL     │  User IDs, timestamps
  │                 │  • Safe to log
  │                 │  • Control exposure
  └─────────────────┘

  ┌─────────────────┐
  │    PUBLIC       │  Display names, avatars
  │                 │  • Can be exposed
  └─────────────────┘
```

### Secure Logging

```typescript
// ❌ Bad - logs sensitive data
logger.info("User login", { email, password });

// ✅ Good - redacts sensitive data
logger.info("User login", {
  email: maskEmail(email), // test@example.com → t***@example.com
  hasPassword: !!password,
});
```

### Environment Variables

```typescript
// src/lib/env.ts
const envSchema = z.object({
  // Public (safe for client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Private (server-only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
});

// Validate at startup
export const env = envSchema.parse(process.env);
```

---

## Vulnerability Prevention

### XSS Prevention

```typescript
// ✅ React escapes by default
<div>{userInput}</div>

// ⚠️ Dangerous - bypasses escaping
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ If needed, sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### SQL Injection Prevention

```typescript
// ✅ Supabase uses parameterized queries
const { data } = await supabase.from("users").select("*").eq("id", userId); // Safe - parameterized

// ❌ Never concatenate SQL (if using raw queries)
// const query = `SELECT * FROM users WHERE id = '${userId}'`;  // Vulnerable!
```

### CSRF Protection

```typescript
// Next.js Server Actions have built-in CSRF protection
// For API routes, use:

// 1. SameSite cookies (automatic with Supabase)
// 2. Verify Origin header
function verifyCsrf(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) return false;

  const originUrl = new URL(origin);
  return originUrl.host === host;
}
```

### Prototype Pollution Prevention

```typescript
// ✅ Safe JSON parsing
export function safeJsonParse<T>(json: string): T | null {
  try {
    const parsed = JSON.parse(json);

    // Check for prototype pollution attempts
    if (parsed && typeof parsed === "object") {
      if (
        "__proto__" in parsed ||
        "constructor" in parsed ||
        "prototype" in parsed
      ) {
        return null; // Reject suspicious objects
      }
    }

    return parsed as T;
  } catch {
    return null;
  }
}
```

---

## Security Checklist

### Pre-Deployment Checklist

```markdown
## Authentication

- [ ] Passwords hashed (Supabase handles this)
- [ ] Session timeout configured
- [ ] Secure cookie flags set
- [ ] Password requirements enforced

## Authorization

- [ ] RLS enabled on all tables
- [ ] Permission checks on all routes
- [ ] Server-side authorization (not client-only)

## Input Validation

- [ ] All inputs validated with Zod
- [ ] File uploads restricted and validated
- [ ] Size limits on all inputs

## Output Security

- [ ] XSS escaping in place
- [ ] Sensitive data not exposed
- [ ] Error messages don't leak info

## Headers

- [ ] CSP configured
- [ ] HSTS enabled
- [ ] X-Frame-Options set
- [ ] Referrer-Policy set

## Infrastructure

- [ ] HTTPS everywhere
- [ ] Rate limiting enabled
- [ ] Secrets in environment variables
- [ ] No secrets in code or logs
```

---

## DO's and DON'Ts

### ✅ DO

1. **DO validate all inputs server-side**

   ```typescript
   const result = Schema.safeParse(input);
   if (!result.success) return error;
   ```

2. **DO use parameterized queries**

   ```typescript
   supabase.from("users").eq("id", userId);
   ```

3. **DO set security headers**

   ```typescript
   headers: SECURITY_HEADERS;
   ```

4. **DO check permissions on every request**

   ```typescript
   if (!hasPermission(user.role, requiredPermission)) return 403;
   ```

5. **DO use httpOnly cookies for tokens**

   ```typescript
   cookie: { httpOnly: true, secure: true }
   ```

6. **DO rate limit sensitive endpoints**

   ```typescript
   if (!(await checkRateLimit(ip, 5, 60))) return 429;
   ```

7. **DO sanitize user-generated content**

   ```typescript
   const safe = sanitizeString(userInput);
   ```

8. **DO use HTTPS everywhere**

   ```typescript
   'upgrade-insecure-requests': true
   ```

9. **DO implement audit logging**

   ```typescript
   logger.info("Action", { userId, action, resource });
   ```

10. **DO use short-lived tokens**
    ```typescript
    accessTokenLifetime: 3600; // 1 hour
    ```

### ❌ DON'T

1. **DON'T trust client input**

   ```typescript
   // ❌ const role = body.role;
   // ✅ const role = determineRole(session);
   ```

2. **DON'T expose stack traces**

   ```typescript
   // ❌ return { error: error.stack };
   // ✅ return { error: 'Something went wrong' };
   ```

3. **DON'T store secrets in code**

   ```typescript
   // ❌ const API_KEY = 'sk_live_xxx';
   // ✅ const API_KEY = env.API_KEY;
   ```

4. **DON'T log sensitive data**

   ```typescript
   // ❌ logger.info({ password });
   // ✅ logger.info({ hasPassword: !!password });
   ```

5. **DON'T disable HTTPS**

   ```typescript
   // ❌ secure: false
   ```

6. **DON'T use `eval()` or `Function()`**

   ```typescript
   // ❌ eval(userCode);
   ```

7. **DON'T trust JWT without verification**

   ```typescript
   // ❌ const payload = JSON.parse(atob(token.split('.')[1]));
   // ✅ const { data, error } = await supabase.auth.getUser();
   ```

8. **DON'T skip authorization checks**

   ```typescript
   // ❌ Assuming authenticated = authorized
   ```

9. **DON'T use innerHTML**

   ```typescript
   // ❌ dangerouslySetInnerHTML={{ __html: userInput }}
   ```

10. **DON'T hardcode URLs in CSP**
    ```typescript
    // ❌ connect-src: 'https://specific-domain.com'
    // ✅ Use environment-based configuration
    ```

---

## Related Documentation

- [AUTH.md](./AUTH.md) - Authentication implementation
- [ROUTING.md](./ROUTING.md) - Input validation patterns
- [BEST_PRACTICES.md](./BEST_PRACTICES.md) - Coding standards
- [MEMORY.md](./MEMORY.md) - Secure data handling
