/**
 * ============================================================================
 * COREX: Vitest Setup
 * Description: Global test setup and configuration
 *
 * This file runs before each test file. Use it for:
 * - Global test utilities
 * - DOM matchers (jest-dom)
 * - Mock setup
 * - Environment configuration
 * ============================================================================
 */

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
// ============================================================================
// Global Mocks
// ============================================================================

/**
 * Mock Next.js router
 */
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

/**
 * Mock Next.js headers (for server components)
 */
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Headers(),
}));

// ============================================================================
// Global Test Utilities
// ============================================================================
