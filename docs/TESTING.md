# Testing Guide

> Comprehensive testing documentation for CoreX using Vitest, Testing Library, and React Query DevTools.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Test Configuration](#test-configuration)
- [Writing Tests](#writing-tests)
- [Component Testing](#component-testing)
- [Hook Testing](#hook-testing)
- [API Testing](#api-testing)
- [Mocking](#mocking)
- [React Query Testing](#react-query-testing)
- [React Query DevTools](#react-query-devtools)
- [Coverage](#coverage)
- [Best Practices](#best-practices)

---

## Overview

CoreX uses a modern testing stack:

| Tool                               | Purpose                        |
| ---------------------------------- | ------------------------------ |
| **Vitest**                         | Test runner (fast, ESM-native) |
| **Testing Library**                | DOM testing utilities          |
| **@testing-library/user-event**    | User interaction simulation    |
| **jsdom**                          | Browser environment simulation |
| **@tanstack/react-query-devtools** | Query debugging (dev only)     |

### Why Vitest?

- **Fast**: Native ESM support, no transpilation overhead
- **Compatible**: Jest-compatible API for easy migration
- **Integrated**: Works seamlessly with Vite ecosystem
- **Modern**: Built-in TypeScript support, watch mode, UI

---

## Quick Start

### Running Tests

```bash
# Run all tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run with coverage report
pnpm test:coverage

# Open Vitest UI (visual test runner)
pnpm test:ui
```

### File Naming Convention

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx      # Co-located test
├── lib/
│   └── utils.ts
tests/
└── integration/
    └── auth.test.ts          # Integration tests
```

---

## Test Configuration

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Browser-like environment
    environment: "jsdom",

    // Global APIs (describe, it, expect)
    globals: true,

    // Setup file for mocks and matchers
    setupFiles: ["./vitest.setup.ts"],

    // Test file patterns
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/**/*.{test,spec}.{ts,tsx}",
    ],

    // Coverage settings
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### vitest.setup.ts

The setup file configures global mocks and Testing Library matchers:

```typescript
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useParams: () => ({}),
}));

// Mock Next.js headers (for server components)
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Headers(),
}));
```

---

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from "vitest";

describe("MyFeature", () => {
  it("should do something", () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });

  it("should handle edge case", () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Common Matchers

```typescript
// Equality
expect(value).toBe(exact);
expect(value).toEqual(deepEqual);
expect(value).toStrictEqual(strictDeepEqual);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThanOrEqual(10);
expect(value).toBeCloseTo(0.3, 5); // For floats

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain("substring");

// Arrays/Objects
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(object).toHaveProperty("key", value);

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(ErrorClass);
expect(() => fn()).toThrowErrorMatchingInlineSnapshot();

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

### Testing Library Matchers (jest-dom)

```typescript
// Visibility
expect(element).toBeVisible();
expect(element).toBeInTheDocument();
expect(element).toBeEmptyDOMElement();

// Forms
expect(input).toHaveValue("text");
expect(checkbox).toBeChecked();
expect(input).toBeDisabled();
expect(input).toBeRequired();
expect(input).toHaveDisplayValue("displayed value");

// Accessibility
expect(element).toHaveAccessibleName("Name");
expect(element).toHaveAccessibleDescription("Description");

// Classes/Attributes
expect(element).toHaveClass("active");
expect(element).toHaveAttribute("href", "/path");
expect(element).toHaveStyle({ color: "red" });

// Text
expect(element).toHaveTextContent("Hello");
expect(element).toContainHTML("<span>Hello</span>");
```

---

## Component Testing

### Basic Component Test

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/ui";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive");
  });

  it("is disabled when prop is set", () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

### User Interactions

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Counter } from "./Counter";

describe("Counter", () => {
  it("increments count on click", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole("button", { name: /increment/i });

    expect(screen.getByText("Count: 0")).toBeInTheDocument();

    await user.click(button);

    expect(screen.getByText("Count: 1")).toBeInTheDocument();
  });

  it("calls onChange when value changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Counter onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /increment/i }));

    expect(onChange).toHaveBeenCalledWith(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Forms

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("submits with valid data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    // Fill in form fields
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");

    // Submit form
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  });

  it("shows validation errors", async () => {
    const user = userEvent.setup();

    render(<LoginForm onSubmit={vi.fn()} />);

    // Submit without filling fields
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });
});
```

### Testing Async Components

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { UserProfile } from "./UserProfile";

describe("UserProfile", () => {
  it("shows loading state", () => {
    render(<UserProfile userId="123" />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  });

  it("displays user data when loaded", async () => {
    render(<UserProfile userId="123" />);

    // Wait for async content
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("shows error state on failure", async () => {
    // Mock API failure
    server.use(
      http.get("/api/users/:id", () => {
        return HttpResponse.error();
      })
    );

    render(<UserProfile userId="invalid" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/error/i);
  });
});
```

---

## Hook Testing

### Testing Custom Hooks

```typescript
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCounter } from "./useCounter";

describe("useCounter", () => {
  it("initializes with default value", () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);
  });

  it("initializes with custom value", () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);
  });

  it("increments count", () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it("decrements count", () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });
});
```

### Testing Hooks with Props Changes

```typescript
import { renderHook } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));

    expect(result.current).toBe("hello");
  });

  it("updates value after delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 500 } },
    );

    // Change the value
    rerender({ value: "world", delay: 500 });

    // Still the old value
    expect(result.current).toBe("hello");

    // Fast-forward time
    vi.advanceTimersByTime(500);

    // Now updated
    expect(result.current).toBe("world");
  });
});
```

---

## API Testing

### Testing API Routes

```typescript
import { describe, it, expect, vi } from "vitest";
import { GET, POST } from "@/app/api/v1/users/route";
import { NextRequest } from "next/server";

describe("/api/v1/users", () => {
  describe("GET", () => {
    it("returns users list", async () => {
      const request = new NextRequest("http://localhost/api/v1/users");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("supports pagination", async () => {
      const request = new NextRequest(
        "http://localhost/api/v1/users?page=2&limit=10",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.meta.page).toBe(2);
      expect(data.meta.limit).toBe(10);
    });
  });

  describe("POST", () => {
    it("creates a new user", async () => {
      const request = new NextRequest("http://localhost/api/v1/users", {
        method: "POST",
        body: JSON.stringify({
          name: "John Doe",
          email: "john@example.com",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe("John Doe");
    });

    it("validates request body", async () => {
      const request = new NextRequest("http://localhost/api/v1/users", {
        method: "POST",
        body: JSON.stringify({ name: "" }), // Missing email
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
```

---

## Mocking

### Mocking Modules

```typescript
import { vi, describe, it, expect } from "vitest";

// Mock entire module
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}));

// Mock with factory
vi.mock("@/services/email", () => {
  return {
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
  };
});
```

### Mocking Functions

```typescript
import { vi } from "vitest";

describe("with mocked function", () => {
  it("tracks calls", () => {
    const mockFn = vi.fn();

    mockFn("arg1", "arg2");

    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("returns mock value", () => {
    const mockFn = vi.fn().mockReturnValue(42);

    expect(mockFn()).toBe(42);
  });

  it("returns different values", () => {
    const mockFn = vi
      .fn()
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
      .mockReturnValue(3);

    expect(mockFn()).toBe(1);
    expect(mockFn()).toBe(2);
    expect(mockFn()).toBe(3);
    expect(mockFn()).toBe(3); // Subsequent calls
  });

  it("mocks async functions", async () => {
    const mockFn = vi.fn().mockResolvedValue({ data: "result" });

    const result = await mockFn();

    expect(result).toEqual({ data: "result" });
  });
});
```

### Mocking Timers

```typescript
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";

describe("with timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles setTimeout", () => {
    const callback = vi.fn();

    setTimeout(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalled();
  });

  it("handles setInterval", () => {
    const callback = vi.fn();

    setInterval(callback, 100);

    vi.advanceTimersByTime(350);

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("runs all pending timers", () => {
    const callback = vi.fn();

    setTimeout(callback, 100);
    setTimeout(callback, 200);

    vi.runAllTimers();

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
```

### Spying on Methods

```typescript
import { vi } from "vitest";

describe("spying", () => {
  it("spies on object methods", () => {
    const obj = {
      method: (x: number) => x * 2,
    };

    const spy = vi.spyOn(obj, "method");

    obj.method(5);

    expect(spy).toHaveBeenCalledWith(5);
    expect(spy).toHaveReturnedWith(10);
  });

  it("spies on console", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    console.error("Test error");

    expect(spy).toHaveBeenCalledWith("Test error");

    spy.mockRestore();
  });
});
```

---

## React Query Testing

### Wrapper with QueryClient

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry in tests
        gcTime: 0, // Disable garbage collection
      },
    },
  });
}

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// Usage in tests
describe("Component with React Query", () => {
  it("fetches data", async () => {
    render(<DataComponent />, { wrapper: createWrapper() });

    // Test assertions...
  });
});
```

### Testing useQuery Hooks

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useUser } from "./useUser";

describe("useUser", () => {
  it("fetches user data", async () => {
    const { result } = renderHook(() => useUser("123"), {
      wrapper: createWrapper(),
    });

    // Initial loading state
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      id: "123",
      name: "John Doe",
    });
  });

  it("handles errors", async () => {
    // Mock API error
    server.use(
      http.get("/api/users/:id", () => {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }),
    );

    const { result } = renderHook(() => useUser("invalid"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### Testing useMutation

```typescript
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCreateUser } from "./useCreateUser";

describe("useCreateUser", () => {
  it("creates a user", async () => {
    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        name: "Jane Doe",
        email: "jane@example.com",
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      name: "Jane Doe",
    });
  });
});
```

---

## React Query DevTools

The React Query DevTools provide a powerful interface for debugging queries in development.

### Configuration

DevTools are automatically included in development mode:

```tsx
// src/lib/query/provider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
```

### DevTools Features

| Feature           | Description                              |
| ----------------- | ---------------------------------------- |
| **Query List**    | View all cached queries and their states |
| **Query Details** | Inspect data, loading states, error info |
| **Refetch**       | Manually refetch any query               |
| **Invalidate**    | Invalidate queries to trigger refetch    |
| **Remove**        | Remove queries from cache                |
| **Time Travel**   | See query state history                  |
| **Stale Timer**   | Visual indicator of stale time countdown |

### DevTools UI Guide

1. **Click the floating button** (bottom-right) to open DevTools
2. **Query States**:
   - 🟢 Fresh: Data is up-to-date
   - 🟡 Stale: Data may need refetch
   - 🔵 Fetching: Currently loading
   - 🔴 Error: Query failed
   - ⚪ Inactive: Not currently in use

3. **Inspecting a Query**:
   - Click any query to see its details
   - View the cached data structure
   - Check `dataUpdatedAt` timestamp
   - See error details if failed

4. **Actions**:
   - **Refetch**: Trigger immediate refetch
   - **Invalidate**: Mark as stale and refetch
   - **Reset**: Clear data and error, refetch
   - **Remove**: Delete from cache

### DevTools Configuration Options

```tsx
<ReactQueryDevtools
  // Start with panel closed
  initialIsOpen={false}
  // Button position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  buttonPosition="bottom-right"
  // Panel position: 'top' | 'bottom' | 'left' | 'right'
  position="bottom"
  // Custom styles for the panel
  styleNonce="my-nonce"
  // Shadow DOM for isolation
  shadowDOMTarget={document.getElementById("devtools-container")}
/>
```

### Production DevTools

For debugging in production (use sparingly):

```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools/production";

// Only import in production when needed
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import("@tanstack/react-query-devtools/production").then((d) => ({
    default: d.ReactQueryDevtools,
  })),
);

function App() {
  const [showDevtools, setShowDevtools] = React.useState(false);

  React.useEffect(() => {
    // Enable with Ctrl+Shift+D or custom trigger
    window.toggleDevtools = () => setShowDevtools((old) => !old);
  }, []);

  return (
    <>
      {showDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtoolsProduction />
        </React.Suspense>
      )}
    </>
  );
}
```

---

## Coverage

### Running Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Configuration

```typescript
// vitest.config.ts
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  reportsDirectory: "./coverage",
  exclude: [
    "node_modules/",
    ".next/",
    "scripts/",
    "**/*.d.ts",
    "**/*.config.{ts,js,mjs}",
    "**/index.ts",           // Barrel exports
    "src/components/ui/**",  // UI primitives
    "src/types/**",          // Type definitions
  ],
  // Enforce thresholds (optional)
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

### Coverage Report

```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   85.2  |    78.5  |   82.1  |   85.2  |
 src/lib/utils.ts      |   100   |    100   |   100   |   100   |
 src/services/auth.ts  |    78   |     72   |    80   |    78   |
-----------------------|---------|----------|---------|---------|
```

---

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Testing implementation
it("calls setState", () => {
  const setStateSpy = vi.spyOn(React, "useState");
  // ...
});

// ✅ Testing behavior
it("shows count after clicking increment", async () => {
  render(<Counter />);
  await user.click(screen.getByRole("button"));
  expect(screen.getByText("1")).toBeInTheDocument();
});
```

### 2. Use Semantic Queries

```typescript
// ❌ Fragile selectors
screen.getByTestId("submit-btn");
document.querySelector(".btn-primary");

// ✅ Semantic queries (in order of preference)
screen.getByRole("button", { name: /submit/i });
screen.getByLabelText(/email/i);
screen.getByText(/welcome/i);
screen.getByPlaceholderText(/search/i);
```

### 3. Avoid Testing Third-Party Code

```typescript
// ❌ Testing Radix UI internals
it("opens dropdown on click", async () => {
  // Testing Radix behavior
});

// ✅ Testing your integration
it("shows menu items when profile clicked", async () => {
  render(<UserMenu />);
  await user.click(screen.getByRole("button", { name: /profile/i }));
  expect(screen.getByRole("menuitem", { name: /logout/i })).toBeVisible();
});
```

### 4. Prefer userEvent over fireEvent

```typescript
// ❌ Low-level events
fireEvent.click(button);
fireEvent.change(input, { target: { value: "text" } });

// ✅ Realistic user interactions
await user.click(button);
await user.type(input, "text");
await user.selectOptions(select, "option1");
await user.keyboard("{Enter}");
```

### 5. Clean Up After Tests

```typescript
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup(); // Usually automatic with Vitest
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
```

### 6. Use Test Factories

```typescript
// test/factories.ts
export function createUser(overrides = {}) {
  return {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
    ...overrides,
  };
}

// In tests
const user = createUser({ name: "Custom Name" });
```

### 7. Group Related Tests

```typescript
describe("LoginForm", () => {
  describe("validation", () => {
    it("requires email");
    it("requires password");
    it("validates email format");
  });

  describe("submission", () => {
    it("submits with valid data");
    it("shows error on failure");
    it("disables button while loading");
  });

  describe("accessibility", () => {
    it("has proper labels");
    it("announces errors");
  });
});
```

---

## Related Documentation

- [Best Practices](./BEST_PRACTICES.md) - Development standards
- [Components](./COMPONENTS.md) - UI component patterns
- [Architecture](./ARCHITECTURE.md) - System design

---

<div align="center">
  <strong>Happy Testing! 🧪</strong>
</div>
