# Code Style Guide

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Style**: TypeScript + React + Next.js

## Table of Contents

1. [Overview](#overview)
2. [Naming Conventions](#naming-conventions)
3. [File Organization](#file-organization)
4. [TypeScript Style](#typescript-style)
5. [React Style](#react-style)
6. [Import Order](#import-order)
7. [Comments & Documentation](#comments--documentation)
8. [Formatting](#formatting)
9. [Code Patterns](#code-patterns)
10. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

Consistent code style improves readability, reduces cognitive load, and makes code reviews easier.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CODE STYLE ENFORCEMENT                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  Write Code
       │
       ▼
  ┌─────────────────┐
  │   Prettier      │  ← Automatic formatting
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   ESLint        │  ← Style rules enforcement
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   TypeScript    │  ← Type consistency
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   Code Review   │  ← Team conventions
  └─────────────────┘
```

---

## Naming Conventions

### General Rules

| Type           | Convention               | Example                       |
| -------------- | ------------------------ | ----------------------------- |
| **Variables**  | camelCase                | `userName`, `isActive`        |
| **Constants**  | UPPER_SNAKE              | `MAX_RETRIES`, `API_URL`      |
| **Functions**  | camelCase                | `getUserById`, `formatDate`   |
| **Classes**    | PascalCase               | `UserService`, `ApiClient`    |
| **Interfaces** | PascalCase               | `User`, `ApiResponse`         |
| **Types**      | PascalCase               | `ButtonVariant`, `Theme`      |
| **Enums**      | PascalCase               | `UserRole`, `Status`          |
| **Components** | PascalCase               | `UserCard`, `DataTable`       |
| **Hooks**      | camelCase with `use`     | `useAuth`, `useLocalStorage`  |
| **Files**      | kebab-case or PascalCase | `api-client.ts`, `Button.tsx` |

### Detailed Guidelines

```typescript
// Variables - descriptive camelCase
const userName = "John";
const isAuthenticated = true;
const userPermissions = ["read", "write"];

// Constants - UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;
const API_BASE_URL = "https://api.example.com";

// Functions - verb + noun
function getUserById(id: string): User {}
function formatCurrency(amount: number): string {}
function validateEmail(email: string): boolean {}

// Boolean variables - is/has/can/should prefix
const isLoading = true;
const hasPermission = false;
const canEdit = true;
const shouldRefresh = false;

// Event handlers - handle + Event
function handleClick() {}
function handleSubmit(e: FormEvent) {}
function handleUserChange(user: User) {}

// Callbacks - on + Event
interface Props {
  onClick: () => void;
  onSubmit: (data: FormData) => void;
  onUserChange: (user: User) => void;
}
```

### File Naming

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx          # PascalCase for components
│   │   ├── DataTable.tsx
│   │   └── index.ts            # Barrel exports
│   └── auth/
│       └── PermissionGate.tsx
├── lib/
│   ├── utils.ts                # kebab-case for utilities
│   ├── api-client.ts
│   └── hooks.ts
├── types/
│   ├── entities.ts             # kebab-case for type files
│   └── http.ts
└── server/
    ├── auth/
    │   └── session.ts
    └── cache/
        └── index.ts
```

---

## File Organization

### Component File Structure

```tsx
// 1. Imports - grouped and ordered
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "./types";

// 2. Types/Interfaces (if not in separate file)
interface LocalState {
  isOpen: boolean;
}

// 3. Constants
const ANIMATION_DURATION = 200;

// 4. Helper functions (pure, can be hoisted)
function formatLabel(text: string): string {
  return text.trim().toLowerCase();
}

// 5. Component definition
export function Button({
  children,
  variant = "primary",
  onClick,
}: ButtonProps) {
  // 5a. Hooks (always first in component)
  const [isHovered, setIsHovered] = useState(false);

  // 5b. Derived state
  const className = cn(buttonVariants({ variant }), isHovered && "ring-2");

  // 5c. Callbacks
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  // 5d. Effects (after callbacks)
  useEffect(() => {
    // Side effects
  }, []);

  // 5e. Early returns / guards
  if (!children) return null;

  // 5f. Main render
  return (
    <button
      className={className}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
}

// 6. Sub-components (if needed)
Button.Icon = function ButtonIcon({ icon }: { icon: ReactNode }) {
  return <span className="mr-2">{icon}</span>;
};

// 7. Default export (if needed)
export default Button;
```

### Module File Structure

```typescript
// 1. Module documentation
/**
 * ============================================================================
 * COREX: User Service
 * Description: User management operations
 * ============================================================================
 */

// 2. Server-only directive (if applicable)
import "server-only";

// 3. External imports
import { z } from "zod";

// 4. Internal imports
import { db } from "@/dal";
import type { User } from "@/types";

// 5. Types/Interfaces
interface CreateUserInput {
  email: string;
  name: string;
}

// 6. Constants
const DEFAULT_ROLE = "user";

// 7. Main exports
export async function createUser(input: CreateUserInput): Promise<User> {
  // Implementation
}

export async function getUserById(id: string): Promise<User | null> {
  // Implementation
}

// 8. Internal helpers (not exported)
function validateInput(input: unknown): asserts input is CreateUserInput {
  // Validation logic
}
```

---

## TypeScript Style

### Type Definitions

```typescript
// Prefer interfaces for object shapes
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Use type for unions, intersections, primitives
type UserRole = "user" | "admin" | "moderator";
type UserId = string;
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

// Extend interfaces
interface AdminUser extends User {
  adminLevel: number;
  permissions: string[];
}

// Generic constraints
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
}
```

### Function Signatures

```typescript
// Explicit return types for public functions
export function formatDate(date: Date): string {
  return date.toISOString();
}

// Optional parameters with defaults
export function paginate<T>(
  items: T[],
  page: number = 1,
  limit: number = 20,
): PaginatedResult<T> {
  // Implementation
}

// Object parameters for multiple options
export function createUser(options: {
  email: string;
  name: string;
  role?: UserRole;
}): Promise<User> {
  // Implementation
}

// Overloads for different signatures
function process(input: string): string;
function process(input: number): number;
function process(input: string | number): string | number {
  return input;
}
```

### Type Guards

```typescript
// Type guard functions
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value
  );
}

// Assertion functions
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new Error("Invalid user");
  }
}

// Usage
if (isUser(data)) {
  // data is typed as User here
  console.log(data.email);
}
```

---

## React Style

### Component Patterns

```tsx
// ✅ Function components with explicit props
interface CardProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Card({ title, children, footer }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div>{children}</div>
      {footer && <footer>{footer}</footer>}
    </div>
  );
}

// ✅ Forwarding refs
interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", children, ...props }, ref) {
    return (
      <button ref={ref} className={buttonVariants({ variant })} {...props}>
        {children}
      </button>
    );
  },
);
```

### Hook Patterns

```typescript
// Custom hook with proper typing
function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        localStorage.setItem(key, JSON.stringify(newValue));
        return newValue;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
```

### JSX Formatting

```tsx
// Short props - single line
<Button variant="primary" onClick={handleClick}>Submit</Button>

// Multiple props - multi-line
<Button
  variant="primary"
  size="large"
  disabled={isLoading}
  onClick={handleClick}
>
  Submit
</Button>

// Conditional rendering
{isLoading && <Spinner />}

{isError ? (
  <ErrorMessage error={error} />
) : (
  <Content data={data} />
)}

// List rendering
{items.map((item) => (
  <ListItem key={item.id} item={item} />
))}
```

---

## Import Order

### Standard Order

```typescript
// 1. React imports
import { useState, useEffect, useCallback } from "react";
import type { ReactNode, ComponentProps } from "react";

// 2. Next.js imports
import { NextRequest, NextResponse } from "next/server";
import Image from "next/image";
import Link from "next/link";

// 3. Third-party libraries
import { z } from "zod";
import { cva } from "class-variance-authority";

// 4. Internal absolute imports (@/)
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

// 5. Internal server imports (if applicable)
import { createRequestContext } from "@/server/http";
import { getSession } from "@/server/auth";

// 6. Relative imports
import { LocalComponent } from "./LocalComponent";
import { useLocalHook } from "./hooks";
import type { LocalType } from "./types";

// 7. Style imports (if any)
import styles from "./Component.module.css";
```

### Barrel Exports

```typescript
// src/components/ui/index.ts
export { Button } from "./Button";
export { Card } from "./Card";
export { Input } from "./Input";
export { Modal } from "./Modal";
export { Select } from "./Select";

// Export types
export type { ButtonProps } from "./Button";
export type { CardProps } from "./Card";

// Usage - clean imports
import { Button, Card, Input } from "@/components/ui";
```

---

## Comments & Documentation

### JSDoc Comments

````typescript
/**
 * Formats a date into a human-readable string.
 *
 * @param date - The date to format
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns The formatted date string
 *
 * @example
 * ```ts
 * formatDate(new Date('2024-01-15')) // "January 15, 2024"
 * formatDate(new Date('2024-01-15'), 'de-DE') // "15. Januar 2024"
 * ```
 */
export function formatDate(date: Date, locale = "en-US"): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
````

### Inline Comments

```typescript
// ✅ Good: Explains WHY, not WHAT
// Skip validation in development to speed up hot reload
if (process.env.NODE_ENV === "production") {
  validateInput(data);
}

// ✅ Good: Explains complex logic
// Binary search for O(log n) lookup - array must be sorted
const index = binarySearch(sortedItems, target);

// ❌ Bad: States the obvious
// Set user name to "John"
const userName = "John";

// ❌ Bad: Outdated comment
// TODO: Remove this when API v2 is ready (API v3 is now live)
```

### Section Headers

```typescript
/**
 * ============================================================================
 * COREX: Module Name
 * Description: Brief description of the module
 * ============================================================================
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_RETRIES = 3;

// ============================================================================
// TYPES
// ============================================================================

interface Config {
  // ...
}

// ============================================================================
// MAIN EXPORTS
// ============================================================================

export function mainFunction() {
  // ...
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function helperFunction() {
  // ...
}
```

---

## Formatting

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Line Length

```typescript
// ✅ Good: Under 100 characters
const result = items.filter((item) => item.isActive);

// ✅ Good: Multi-line for long expressions
const result = items
  .filter((item) => item.isActive && item.hasPermission)
  .map((item) => transformItem(item))
  .sort((a, b) => a.priority - b.priority);

// ❌ Bad: Too long
const result = items
  .filter((item) => item.isActive && item.hasPermission && item.isNotDeleted)
  .map((item) => transformItem(item))
  .sort((a, b) => a.priority - b.priority);
```

### Object & Array Formatting

```typescript
// Short objects - single line
const user = { id: "1", name: "John" };

// Long objects - multi-line with trailing comma
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3,
  headers: {
    "Content-Type": "application/json",
  },
};

// Arrays
const shortArray = [1, 2, 3];

const longArray = [
  "first-very-long-item",
  "second-very-long-item",
  "third-very-long-item",
];
```

---

## Code Patterns

### Error Handling

```typescript
// ✅ Specific error types
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// ✅ Result pattern for expected failures
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await db.users.findById(id);
    if (!user) {
      return { success: false, error: new Error("User not found") };
    }
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### Early Returns

```typescript
// ✅ Good: Early returns reduce nesting
function processUser(user: User | null): string {
  if (!user) return "No user";
  if (!user.isActive) return "Inactive user";
  if (!user.hasPermission) return "No permission";

  return `Processing ${user.name}`;
}

// ❌ Bad: Deep nesting
function processUserBad(user: User | null): string {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        return `Processing ${user.name}`;
      } else {
        return "No permission";
      }
    } else {
      return "Inactive user";
    }
  } else {
    return "No user";
  }
}
```

### Destructuring

```typescript
// ✅ Good: Destructure with defaults
function createUser({ email, name, role = "user" }: CreateUserInput) {
  // ...
}

// ✅ Good: Rename while destructuring
const { data: user, error: userError } = await getUser(id);

// ✅ Good: Nested destructuring (carefully)
const {
  user: { name, email },
  permissions,
} = context;
```

---

## DO's and DON'Ts

### ✅ DO

1. **DO use descriptive names**

   ```typescript
   const isUserAuthenticated = checkAuth();
   ```

2. **DO prefer `const` over `let`**

   ```typescript
   const items = getItems(); // Prefer const
   ```

3. **DO use early returns**

   ```typescript
   if (!data) return null;
   ```

4. **DO group related code**

   ```typescript
   // Hooks together, handlers together
   ```

5. **DO add JSDoc for public APIs**

   ```typescript
   /** @param date - The date to format */
   ```

6. **DO use type inference where clear**

   ```typescript
   const name = "John"; // Type is obvious
   ```

7. **DO format consistently**

   ```typescript
   // Let Prettier handle it
   ```

8. **DO use meaningful file names**

   ```
   user-service.ts, UserCard.tsx
   ```

9. **DO separate concerns**

   ```typescript
   // Logic in hooks, UI in components
   ```

10. **DO keep functions small**
    ```typescript
    // Single responsibility
    ```

### ❌ DON'T

1. **DON'T use abbreviations**

   ```typescript
   // ❌ const usr = getUser();
   // ✅ const user = getUser();
   ```

2. **DON'T use magic numbers**

   ```typescript
   // ❌ if (status === 1)
   // ✅ if (status === STATUS.ACTIVE)
   ```

3. **DON'T mix naming conventions**

   ```typescript
   // ❌ user_name, userName, UserName
   ```

4. **DON'T nest deeply**

   ```typescript
   // ❌ if (a) { if (b) { if (c) { ... } } }
   ```

5. **DON'T comment obvious code**

   ```typescript
   // ❌ // Set x to 5
   // x = 5;
   ```

6. **DON'T use `any`**

   ```typescript
   // ❌ function process(data: any)
   ```

7. **DON'T repeat yourself**

   ```typescript
   // ❌ Copy-paste code
   ```

8. **DON'T mix tabs and spaces**

   ```typescript
   // Use Prettier
   ```

9. **DON'T leave dead code**

   ```typescript
   // ❌ // const oldFunction = ...
   ```

10. **DON'T use unclear booleans**
    ```typescript
    // ❌ doSomething(true, false, true)
    // ✅ doSomething({ async: true, cache: false, log: true })
    ```

---

## Related Documentation

- [LINTING.md](./LINTING.md) - ESLint rules
- [BEST_PRACTICES.md](./BEST_PRACTICES.md) - General practices
- [COMPONENTS.md](./COMPONENTS.md) - Component patterns
