/**
 * ============================================================================
 * COREX: Utility Functions
 * Description: Common utility functions used throughout the application
 *
 * This module provides helper functions that don't fit into a specific domain.
 * Functions here should be:
 * - Pure (no side effects)
 * - Reusable across the application
 * - Well-typed
 *
 * @module lib/utils
 * ============================================================================
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================================
// CLASS NAME UTILITIES
// ============================================================================

/**
 * Merge class names with Tailwind CSS conflict resolution
 *
 * Combines clsx for conditional classes with tailwind-merge for
 * intelligent Tailwind CSS class merging. This prevents conflicting
 * Tailwind classes from being applied (e.g., 'p-4' and 'p-2').
 *
 * @param inputs - Class values (strings, objects, arrays, conditionals)
 * @returns Merged class string with conflicts resolved
 *
 * @example
 * ```tsx
 * // Basic usage
 * cn('px-4 py-2', 'bg-blue-500')
 * // => 'px-4 py-2 bg-blue-500'
 *
 * // Conditional classes
 * cn('base-class', isActive && 'active-class')
 * // => 'base-class' or 'base-class active-class'
 *
 * // Object syntax
 * cn({ 'text-red-500': hasError, 'text-green-500': !hasError })
 * // => 'text-red-500' or 'text-green-500'
 *
 * // Conflict resolution (tailwind-merge)
 * cn('p-4', 'p-2')
 * // => 'p-2' (last value wins)
 *
 * // Complex example
 * cn(
 *   'px-4 py-2 rounded-lg',
 *   isDisabled && 'opacity-50 cursor-not-allowed',
 *   variant === 'primary' && 'bg-primary text-white',
 *   variant === 'secondary' && 'bg-secondary text-foreground',
 *   className
 * )
 * ```
 *
 * @see https://github.com/lukeed/clsx - Conditional class joining
 * @see https://github.com/dcastil/tailwind-merge - Tailwind conflict resolution
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
