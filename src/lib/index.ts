/**
 * ============================================================================
 * COREX: Library Exports
 * Description: Central export point for utility functions and custom hooks
 *
 * This module provides a single import point for commonly used utilities,
 * reducing import statements and improving code organization.
 *
 * @example
 * ```tsx
 * import { cn, useMounted, useDebounce } from '@/lib';
 * ```
 * ============================================================================
 */

// Utility functions
export { cn } from "./utils";

// Custom hooks
export {
  useMounted,
  useEventListener,
  useMediaQuery,
  useClickOutside,
  useDebounce,
  usePrevious,
  useLocalStorage,
} from "./hooks";
