# Authentication & Authorization Guide

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Approach**: Zero-Trust Security

## Table of Contents

1. [Overview](#overview)
2. [Authentication Architecture](#authentication-architecture)
3. [Authorization Model](#authorization-model)
4. [Role Hierarchy](#role-hierarchy)
5. [Permission System](#permission-system)
6. [Session Management](#session-management)
7. [Route Protection](#route-protection)
8. [PermissionGate Component](#permissiongate-component)
9. [API Authentication](#api-authentication)
10. [Feature Flags](#feature-flags)
11. [Database Schema](#database-schema)
12. [Code Examples](#code-examples)
13. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

CoreX implements a **Zero-Trust** authentication and authorization system using Supabase Auth with custom role-based access control (RBAC) and permission-based access control (PBAC).

### Key Principles

| Principle                | Implementation                                   |
| ------------------------ | ------------------------------------------------ |
| **Zero-Trust**           | Every request is verified, never assume          |
| **Fail-Closed**          | Auth errors deny access, never grant             |
| **Graceful Degradation** | When auth disabled, system remains functional    |
| **Defense in Depth**     | Multiple layers (middleware → route → component) |

### Security Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY FEATURES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✓ Email/Password Authentication (Supabase)                                │
│  ✓ OAuth Providers (Google, GitHub, etc.)                                  │
│  ✓ Session Management with JWT                                             │
│  ✓ Automatic Token Refresh                                                 │
│  ✓ Role-Based Access Control (RBAC)                                        │
│  ✓ Permission-Based Access Control (PBAC)                                  │
│  ✓ Row Level Security (RLS) in PostgreSQL                                  │
│  ✓ CSRF Protection                                                         │
│  ✓ Rate Limiting                                                           │
│  ✓ Security Headers (CSP, HSTS, etc.)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  User                                    Application
    │                                          │
    │  1. Login Request                        │
    │  (email/password or OAuth)               │
    ├─────────────────────────────────────────▶│
    │                                          │
    │                                          ▼
    │                               ┌─────────────────────┐
    │                               │   Supabase Auth     │
    │                               │                     │
    │                               │ • Validate creds    │
    │                               │ • Generate JWT      │
    │                               │ • Create session    │
    │                               └──────────┬──────────┘
    │                                          │
    │  2. Set Session Cookie                   │
    │◀─────────────────────────────────────────┤
    │                                          │
    │  3. Subsequent Request                   │
    │  (with session cookie)                   │
    ├─────────────────────────────────────────▶│
    │                                          │
    │                                          ▼
    │                               ┌─────────────────────┐
    │                               │   Middleware        │
    │                               │                     │
    │                               │ • Parse cookie      │
    │                               │ • Verify JWT        │
    │                               │ • Refresh if needed │
    │                               └──────────┬──────────┘
    │                                          │
    │                                          ▼
    │                               ┌─────────────────────┐
    │                               │   Route Handler     │
    │                               │                     │
    │                               │ • Get AuthContext   │
    │                               │ • Check permissions │
    │                               │ • Execute logic     │
    │                               └──────────┬──────────┘
    │                                          │
    │  4. Response                             │
    │◀─────────────────────────────────────────┤
```

### Supabase Client Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SUPABASE CLIENT TYPES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────┐
  │  CLIENT-SIDE                   │  src/lib/supabase/client.ts
  │  (Browser)                     │
  │                                │
  │  • createBrowserClient()       │  Uses cookies from browser
  │  • For client components       │  Automatic token refresh
  │  • OAuth flows                 │
  └────────────────────────────────┘
              │
              │  Shared cookies
              ▼
  ┌────────────────────────────────┐
  │  SERVER-SIDE                   │  src/lib/supabase/server.ts
  │  (Server Components/Actions)   │
  │                                │
  │  • createServerClient()        │  Reads cookies via next/headers
  │  • For server components       │  Uses "server-only" import
  │  • For server actions          │
  └────────────────────────────────┘
              │
              │
              ▼
  ┌────────────────────────────────┐
  │  MIDDLEWARE                    │  src/lib/supabase/middleware.ts
  │  (Edge Runtime)                │
  │                                │
  │  • updateSession()             │  Updates session on every request
  │  • Handles token refresh       │  Modifies response cookies
  │  • Returns user + response     │
  └────────────────────────────────┘
```

---

## Authorization Model

### Multi-Layer Authorization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-LAYER AUTHORIZATION                                │
└─────────────────────────────────────────────────────────────────────────────┘

  Layer 1: MIDDLEWARE (Edge)
  ─────────────────────────
  ┌─────────────────────────────────────┐
  │ • Route pattern matching            │
  │ • Redirect unauthenticated users    │
  │ • No database access (fast)         │
  │ • Applied to ALL requests           │
  └─────────────────────────────────────┘
                    │
                    ▼
  Layer 2: ROUTE HANDLER (Server)
  ─────────────────────────────────
  ┌─────────────────────────────────────┐
  │ • requireAuth() - must be logged in │
  │ • requireRole() - must have role    │
  │ • requirePermission() - must have   │
  │ • Database access available         │
  └─────────────────────────────────────┘
                    │
                    ▼
  Layer 3: COMPONENT (Server/Client)
  ─────────────────────────────────────
  ┌─────────────────────────────────────┐
  │ • PermissionGate - conditional UI   │
  │ • hasAdminAccess() - UI visibility  │
  │ • Fine-grained feature access       │
  └─────────────────────────────────────┘
                    │
                    ▼
  Layer 4: DATABASE (PostgreSQL)
  ─────────────────────────────────────
  ┌─────────────────────────────────────┐
  │ • Row Level Security (RLS)          │
  │ • Policies enforce data access      │
  │ • Final security boundary           │
  └─────────────────────────────────────┘
```

---

## Role Hierarchy

### Role Levels

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROLE HIERARCHY                                      │
└─────────────────────────────────────────────────────────────────────────────┘

  Level 3: super_admin
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  • Full system access                                                   │
  │  • Can manage other admins                                              │
  │  • Access to system settings                                            │
  │  • Can bypass certain restrictions                                      │
  └─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  Level 2: admin
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  • Full admin panel access                                              │
  │  • Can manage users (except super_admin)                                │
  │  • Can manage content                                                   │
  │  • Cannot access system settings                                        │
  └─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  Level 1: moderator
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  • Limited admin panel access                                           │
  │  • Can view reports                                                     │
  │  • Can moderate content                                                 │
  │  • Cannot manage users                                                  │
  └─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  Level 0: user
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  • Standard user access                                                 │
  │  • Access to user dashboard                                             │
  │  • Own resource management                                              │
  │  • No admin features                                                    │
  └─────────────────────────────────────────────────────────────────────────┘
```

### Role Checking Functions

```typescript
// src/lib/auth/roles.ts

// Check if role has admin panel access (moderator+)
function hasAdminAccess(role: RoleInput): boolean;

// Check if role has full admin privileges (admin+)
function isFullAdmin(role: RoleInput): boolean;

// Check if role is exactly super_admin
function isSuperAdmin(role: RoleInput): boolean;

// Check if role is at least the specified level
function hasMinimumRole(role: RoleInput, minimumRole: UserRole): boolean;

// Get numeric level for comparison
function getRoleLevel(role: UserRole): number;
// user=0, moderator=1, admin=2, super_admin=3
```

---

## Permission System

### Permission Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PERMISSION FORMAT                                      │
└─────────────────────────────────────────────────────────────────────────────┘

  Format: <resource>.<action>

  Examples:
  ┌──────────────────────┬─────────────────────────────────────┐
  │  Permission          │  Description                        │
  ├──────────────────────┼─────────────────────────────────────┤
  │  admin.access        │  Access admin panel                 │
  │  users.read          │  View user list                     │
  │  users.write         │  Create/update users                │
  │  users.delete        │  Delete users                       │
  │  settings.read       │  View settings                      │
  │  settings.write      │  Modify settings                    │
  │  reports.view        │  View reports/analytics             │
  └──────────────────────┴─────────────────────────────────────┘
```

### Role-Permission Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ROLE → PERMISSION INHERITANCE                             │
└─────────────────────────────────────────────────────────────────────────────┘

  super_admin inherits ALL permissions
      │
      ├── admin inherits:
      │   ├── admin.access
      │   ├── users.read, users.write, users.delete
      │   ├── reports.view
      │   └── settings.read
      │
      ├── moderator inherits:
      │   ├── admin.access
      │   ├── users.read (read only)
      │   └── reports.view
      │
      └── user:
          └── (no admin permissions)

  ⚠️ Permissions are stored in database and resolved via RPC functions
```

### Database Permission Functions

```sql
-- Get all permissions for a user (includes role-based)
SELECT get_user_permissions(user_id);

-- Check if user has specific permission
SELECT has_permission(user_id, 'admin.access');
```

---

## Session Management

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SESSION LIFECYCLE                                      │
└─────────────────────────────────────────────────────────────────────────────┘

  Login
    │
    ▼
  ┌─────────────────┐
  │  Supabase Auth  │
  │  Creates JWT    │
  │  (access token) │
  │  + refresh token│
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐     Stored as HTTP-only cookies:
  │  Set Cookies    │     • sb-access-token (short-lived, ~1h)
  │                 │     • sb-refresh-token (long-lived, ~7d)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  On Each        │     Middleware checks token expiry
  │  Request        │     If expired, uses refresh token
  │  (Middleware)   │     Updates cookies with new tokens
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Session        │     AuthContext available:
  │  Available      │     { userId, email, role, permissions }
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Logout         │     Clear cookies
  │                 │     Revoke refresh token
  └─────────────────┘
```

### AuthContext Interface

```typescript
interface AuthContext {
  /** User ID from Supabase auth */
  userId: string;
  /** User email (optional) */
  email?: string;
  /** User role */
  role: UserRole;
  /** User permissions */
  permissions: Permission[];
  /** Session ID (if available) */
  sessionId?: string;
}
```

---

## Route Protection

### Middleware Configuration

```typescript
// src/middleware.ts

// Routes that require authentication
const protectedRoutes = ["/dashboard"];

// Auth routes (redirect authenticated users away)
const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];
```

### Route Protection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROUTE PROTECTION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  Request to /dashboard
         │
         ▼
  ┌────────────────────┐
  │ Auth Enabled?      │─── No ──▶ Allow (graceful degradation)
  └────────┬───────────┘
           │ Yes
           ▼
  ┌────────────────────┐
  │ Is Protected       │─── No ──▶ Continue to handler
  │ Route?             │
  └────────┬───────────┘
           │ Yes
           ▼
  ┌────────────────────┐
  │ User Authenticated?│─── No ──▶ Redirect to /login?redirect=/dashboard
  └────────┬───────────┘
           │ Yes
           ▼
  ┌────────────────────┐
  │ Continue to        │
  │ Route Handler      │
  └────────────────────┘


  Request to /login (by authenticated user)
         │
         ▼
  ┌────────────────────┐
  │ Auth Enabled?      │─── No ──▶ Allow
  └────────┬───────────┘
           │ Yes
           ▼
  ┌────────────────────┐
  │ Is Auth Route?     │─── No ──▶ Continue
  └────────┬───────────┘
           │ Yes
           ▼
  ┌────────────────────┐
  │ User Authenticated?│─── No ──▶ Continue (show login)
  └────────┬───────────┘
           │ Yes
           ▼
  ┌────────────────────┐
  │ Redirect to        │
  │ /dashboard         │
  └────────────────────┘
```

---

## PermissionGate Component

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PERMISSIONGATE COMPONENT                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  <PermissionGate>
         │
         ▼
  ┌────────────────────┐
  │ Permissions        │─── No ──▶ Render children (graceful)
  │ Enabled?           │
  └────────┬───────────┘
           │ Yes
           ▼
  ┌────────────────────┐
  │ User Authenticated?│─── No ──▶ Redirect or Fallback
  └────────┬───────────┘
           │ Yes
           ▼
  ┌────────────────────┐
  │ Check Permission   │─── No ──▶ Redirect or Fallback
  │ (if specified)     │
  └────────┬───────────┘
           │ Yes
           ▼
  ┌────────────────────┐
  │ Check Role         │─── No ──▶ Redirect or Fallback
  │ (if specified)     │
  └────────┬───────────┘
           │ Yes
           ▼
  ┌────────────────────┐
  │ Render Children    │
  └────────────────────┘
```

### Usage Examples

```tsx
// Basic permission check
<PermissionGate permission="admin.access">
  <AdminPanel />
</PermissionGate>

// Role check with fallback
<PermissionGate
  roles={['admin', 'super_admin']}
  fallback={<AccessDenied />}
>
  <SettingsPage />
</PermissionGate>

// With redirect on failure
<PermissionGate
  permission="reports.view"
  redirectTo="/dashboard"
>
  <ReportsPage />
</PermissionGate>

// Combined permission + role
<PermissionGate
  permission="users.delete"
  roles={['admin', 'super_admin']}
>
  <DeleteUserButton />
</PermissionGate>
```

---

## API Authentication

### Route Handler Pattern

```typescript
// src/app/api/v1/protected/route.ts
import { NextRequest } from "next/server";
import { requireAuth, requireRole, requirePermission } from "@/server/auth";

// Requires authentication
export async function GET(request: NextRequest) {
  const ctx = await requireAuth(); // Throws if not authenticated

  return Response.json({ userId: ctx.userId });
}

// Requires specific role
export async function POST(request: NextRequest) {
  const ctx = await requireRole("admin", "super_admin");

  // Only admins reach here
  return Response.json({ role: ctx.role });
}

// Requires specific permission
export async function DELETE(request: NextRequest) {
  const ctx = await requirePermission("users.delete");

  // Only users with permission reach here
  return Response.json({ success: true });
}
```

### Error Handling

```typescript
// Auth functions throw typed errors

class AuthenticationError extends Error {
  code = "UNAUTHORIZED";
  status = 401;
}

class AuthorizationError extends Error {
  code = "FORBIDDEN";
  status = 403;
}

// Route handler with error handling
export async function GET() {
  try {
    const ctx = await requireAuth();
    return Response.json({ user: ctx.userId });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }
    throw error;
  }
}
```

---

## Feature Flags

### Auth-Related Flags

```typescript
// src/lib/config/features.ts

export const features = {
  // Enable/disable entire auth system
  auth: process.env.NEXT_PUBLIC_ENABLE_AUTH === "1",

  // Enable/disable permission checks
  permissions: process.env.NEXT_PUBLIC_ENABLE_PERMISSIONS === "1",
};
```

### Flag Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FEATURE FLAG DEPENDENCIES                              │
└─────────────────────────────────────────────────────────────────────────────┘

  ENABLE_PERMISSIONS
         │
         └─── Requires: ENABLE_AUTH
              └─── Requires: ENABLE_DATABASE (for user_profiles)
                   └─── Requires: Supabase configuration

  When ENABLE_AUTH=0:
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  • getSession() returns null                                           │
  │  • requireAuth() throws                                                │
  │  • hasPermission() returns true (permissive)                          │
  │  • hasRole() returns true (permissive)                                │
  │  • PermissionGate renders children unconditionally                    │
  │  • Middleware skips auth redirects                                     │
  └─────────────────────────────────────────────────────────────────────────┘

  When ENABLE_PERMISSIONS=0 (but ENABLE_AUTH=1):
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  • Authentication still works                                          │
  │  • PermissionGate renders children unconditionally                    │
  │  • hasPermission() returns true                                        │
  │  • Role checks still work (from user_profiles)                        │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Auth Tables

```sql
-- Supabase manages auth.users automatically

-- User profiles table (extend with your fields)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User permissions (for fine-grained access)
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, permission)
);

-- Role type
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
```

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

---

## Code Examples

### Server Component with Auth

```tsx
// src/app/(private)/dashboard/page.tsx
import { requireAuth } from "@/server/auth";
import { PermissionGate } from "@/components/auth";

export default async function DashboardPage() {
  const ctx = await requireAuth(); // Redirect if not authenticated

  return (
    <div>
      <h1>Welcome, {ctx.email}</h1>
      <p>Role: {ctx.role}</p>

      <PermissionGate permission="admin.access">
        <a href="/admin">Admin Panel</a>
      </PermissionGate>
    </div>
  );
}
```

### Client Component Role Check

```tsx
// src/components/UserMenu.tsx
"use client";

import { hasAdminAccess } from "@/lib/auth/roles";
import type { UserRole } from "@/server/security/types";

interface UserMenuProps {
  role?: UserRole;
}

export function UserMenu({ role }: UserMenuProps) {
  return (
    <nav>
      <a href="/dashboard">Dashboard</a>
      {hasAdminAccess(role) && <a href="/admin">Admin</a>}
    </nav>
  );
}
```

### Protected API Route

```typescript
// src/app/api/v1/users/[id]/route.ts
import { NextRequest } from "next/server";
import { requireAuth, hasPermission } from "@/server/auth";
import { jsonResponse } from "@/server/http";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireAuth();

  // Users can only read their own data unless they have permission
  if (params.id !== ctx.userId) {
    const canReadAll = await hasPermission(ctx.userId, "users.read");
    if (!canReadAll) {
      return jsonResponse({ error: "Forbidden" }, ctx, { status: 403 });
    }
  }

  // Fetch and return user data...
}
```

---

## DO's and DON'Ts

### ✅ DO

1. **DO use `server-only`** for auth modules

   ```typescript
   import "server-only";
   ```

2. **DO check auth at multiple layers**

   ```
   Middleware → Route Handler → Component → Database (RLS)
   ```

3. **DO handle auth errors explicitly**

   ```typescript
   try {
     await requireAuth();
   } catch (e) {
     if (e instanceof AuthenticationError) { ... }
   }
   ```

4. **DO use PermissionGate for UI**

   ```tsx
   <PermissionGate permission="admin.access">
     <AdminButton />
   </PermissionGate>
   ```

5. **DO validate role/permission at data level**

   ```typescript
   if (!(await hasPermission(userId, "users.delete"))) {
     throw new AuthorizationError();
   }
   ```

6. **DO use typed UserRole**

   ```typescript
   const role: UserRole = "admin"; // Not string
   ```

7. **DO return null on auth errors** (fail-closed)

   ```typescript
   catch { return null; }
   ```

8. **DO use feature flags** for gradual rollout

   ```typescript
   if (!isAuthEnabled()) return null;
   ```

9. **DO implement RLS policies** for data security

   ```sql
   CREATE POLICY ... USING (auth.uid() = user_id);
   ```

10. **DO log security events**
    ```typescript
    logger.warn("Unauthorized access attempt", { userId, resource });
    ```

### ❌ DON'T

1. **DON'T import server auth in client**

   ```typescript
   // ❌ WRONG in client component
   import { getSession } from "@/server/auth";
   ```

2. **DON'T trust client-provided roles**

   ```typescript
   // ❌ WRONG
   const role = request.headers.get("x-user-role");
   ```

3. **DON'T use string literals for roles**

   ```typescript
   // ❌ WRONG
   if (user.role === "admin") // Use UserRole type
   ```

4. **DON'T skip auth on "internal" routes**

   ```typescript
   // ❌ WRONG
   // Anyone can call /api/internal/admin
   ```

5. **DON'T store sensitive data in JWT**

   ```typescript
   // ❌ WRONG - Don't add secrets to token
   ```

6. **DON'T bypass RLS with service role**

   ```typescript
   // ❌ WRONG for user-facing endpoints
   const supabase = createClient(url, SERVICE_KEY);
   ```

7. **DON'T forget to handle disabled features**

   ```typescript
   // ❌ WRONG - Crashes if auth disabled
   const { userId } = await requireAuth();
   ```

8. **DON'T return different errors for auth**

   ```typescript
   // ❌ WRONG - Reveals user existence
   if (!userExists) return "User not found";
   if (!passwordMatch) return "Wrong password";
   ```

9. **DON'T cache auth decisions long-term**

   ```typescript
   // ❌ WRONG - Permissions may change
   cache.set("user:123:isAdmin", true, "1d");
   ```

10. **DON'T rely only on UI for security**
    ```typescript
    // ❌ WRONG - Can be bypassed
    {isAdmin && <DeleteButton />} // Need server check too!
    ```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [MEMORY.md](./MEMORY.md) - Memory management
- [ROUTING.md](./ROUTING.md) - API routing & contracts
- [DATABASE.md](./DATABASE.md) - Database schema & migrations
