/**
 * ============================================================================
 * Base Types - Primitives, Branded Types, and Utilities
 * ============================================================================
 *
 * This module contains foundational types that other modules build upon.
 * These are pure TypeScript types with no runtime dependencies.
 *
 * Key Concepts:
 * -------------
 * 1. BRANDED TYPES: Compile-time type safety for primitive values
 *    - Prevents mixing up IDs of different entities
 *    - No runtime overhead (types are erased at compile time)
 *
 * 2. UTILITY TYPES: Common type transformations
 *    - DeepPartial, DeepReadonly, etc.
 *
 * 3. RESULT TYPES: Explicit error handling without exceptions
 *    - Forces callers to handle both success and failure cases
 *
 * Performance Note:
 * -----------------
 * All types here are compile-time only. They add zero runtime overhead.
 * TypeScript erases all type information during compilation.
 *
 * ============================================================================
 */

// ============================================================================
// BRANDED TYPES (Nominal Typing for TypeScript)
// ============================================================================

/**
 * Brand symbol for creating nominal types
 * This enables type-safe IDs that can't be accidentally mixed
 *
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type PostId = Brand<string, 'PostId'>;
 *
 * const userId: UserId = 'user_123' as UserId;
 * const postId: PostId = 'post_456' as PostId;
 *
 * // ❌ Type error: Can't assign PostId to UserId
 * const wrongId: UserId = postId;
 */
declare const __brand: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  readonly [__brand]: TBrand;
};

// Common branded types
export type UserId = Brand<string, "UserId">;
export type SessionId = Brand<string, "SessionId">;
export type RequestId = Brand<string, "RequestId">;
export type EntityId = Brand<string, "EntityId">;

// ============================================================================
// TIMESTAMP TYPES
// ============================================================================

/**
 * Unix timestamp in milliseconds
 */
export type Timestamp = Brand<number, "Timestamp">;

/**
 * ISO 8601 date string
 */
export type ISODateString = Brand<string, "ISODateString">;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties deeply partial
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Make all properties deeply readonly
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = T extends object
  ? { [P in keyof T]-?: DeepRequired<T[P]> }
  : T;

/**
 * Extract keys of type T that have values of type V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Make specific keys optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific keys required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Extract the resolved type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Create a union from object values
 */
export type ValueOf<T> = T[keyof T];

/**
 * Ensure a type is not empty
 */
export type NonEmpty<T> = T extends Record<string, never> ? never : T;

// ============================================================================
// NULLABLE TYPES
// ============================================================================

/**
 * Represents a value that may be null
 */
export type Nullable<T> = T | null;

/**
 * Represents a value that may be undefined
 */
export type Optional<T> = T | undefined;

/**
 * Represents a value that may be null or undefined
 */
export type Maybe<T> = T | null | undefined;

// ============================================================================
// FUNCTION TYPES
// ============================================================================

/**
 * Any function signature
 */
export type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Async function signature
 */
export type AsyncFunction<
  TArgs extends unknown[] = unknown[],
  TReturn = unknown,
> = (...args: TArgs) => Promise<TReturn>;

/**
 * Predicate function
 */
export type Predicate<T> = (value: T) => boolean;

/**
 * Comparator function for sorting
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * Mapper function
 */
export type Mapper<TInput, TOutput> = (input: TInput) => TOutput;

// ============================================================================
// RECORD TYPES
// ============================================================================

/**
 * Dictionary with string keys
 */
export type Dictionary<T> = Record<string, T>;

/**
 * Dictionary with string keys, values may be undefined
 */
export type PartialDictionary<T> = Record<string, T | undefined>;

/**
 * JSON-serializable value
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * JSON object (not array or primitive)
 */
export type JsonObject = { [key: string]: JsonValue };

// ============================================================================
// TUPLE UTILITIES
// ============================================================================

/**
 * Get first element of tuple
 */
export type Head<T extends unknown[]> = T extends [infer H, ...unknown[]]
  ? H
  : never;

/**
 * Get all but first element of tuple
 */
export type Tail<T extends unknown[]> = T extends [unknown, ...infer R]
  ? R
  : never;

/**
 * Get last element of tuple
 */
export type Last<T extends unknown[]> = T extends [...unknown[], infer L]
  ? L
  : never;

// ============================================================================
// LITERALS
// ============================================================================

/**
 * Ensure a string is a literal type, not widened to string
 */
export type Literal<T extends string> = T;

/**
 * Create a const assertion helper
 */
export const asConst = <T>(value: T): T => value;

// ============================================================================
// ENVIRONMENT TYPES
// ============================================================================

/**
 * Node environment types
 */
export type NodeEnv = "development" | "production" | "test";

/**
 * Runtime environment
 */
export type Runtime = "node" | "edge" | "browser";
