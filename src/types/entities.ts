/**
 * ============================================================================
 * Entity Types - Domain Data Structures
 * ============================================================================
 *
 * Entities are the core data structures of your domain. They represent
 * the "things" your application works with.
 *
 * Entity Design Principles:
 * -------------------------
 * 1. IMMUTABILITY: Entities should be treated as immutable
 *    - Use readonly modifiers
 *    - Create new instances instead of mutating
 *
 * 2. IDENTITY: Each entity has a unique identifier
 *    - Use branded types for IDs to prevent mixing
 *
 * 3. VALIDATION: Entities assume data is valid
 *    - Validation happens at boundaries (contracts layer)
 *    - By the time data becomes an entity, it's trusted
 *
 * 4. NO BEHAVIOR: Entities are pure data
 *    - Business logic lives in the core layer
 *    - Entities are just shapes
 *
 * Performance Consideration:
 * -------------------------
 * - Keep entities lean - only include necessary fields
 * - Use separate DTOs for API responses (response shaping)
 * - Lazy load related entities when possible
 *
 * ============================================================================
 */

import type { Brand, Nullable } from "./base";

// ============================================================================
// ENTITY ID TYPES (Branded for type safety)
// ============================================================================

/**
 * User entity identifier
 */
export type UserId = Brand<string, "UserId">;

/**
 * Generic resource identifier
 */
export type ResourceId = Brand<string, "ResourceId">;

// ============================================================================
// BASE ENTITY
// ============================================================================

/**
 * Base properties shared by all entities
 *
 * @example
 * interface Product extends BaseEntity {
 *   name: string;
 *   price: number;
 * }
 */
export interface BaseEntity {
  /** Unique identifier */
  readonly id: string;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Last update timestamp */
  readonly updatedAt: Date;
}

/**
 * Auditable entity with user tracking
 */
export interface AuditableEntity extends BaseEntity {
  /** User who created this entity */
  readonly createdBy: Nullable<UserId>;

  /** User who last updated this entity */
  readonly updatedBy: Nullable<UserId>;
}

/**
 * Soft-deletable entity
 */
export interface SoftDeletableEntity extends BaseEntity {
  /** Deletion timestamp (null if not deleted) */
  readonly deletedAt: Nullable<Date>;
}

// ============================================================================
// USER ENTITY
// ============================================================================

/**
 * User account status
 */
export type UserStatus = "active" | "inactive" | "suspended" | "pending";

/**
 * User role for access control
 */
export type UserRole = "user" | "moderator" | "admin" | "super_admin";

/**
 * User entity
 */
export interface User extends AuditableEntity {
  readonly id: UserId;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly displayName: Nullable<string>;
  readonly avatarUrl: Nullable<string>;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly lastLoginAt: Nullable<Date>;
  readonly metadata: Record<string, unknown>;
}

/**
 * User preferences
 */
export interface UserPreferences {
  readonly userId: UserId;
  readonly theme: "light" | "dark" | "system";
  readonly locale: string;
  readonly timezone: string;
  readonly emailNotifications: boolean;
  readonly updatedAt: Date;
}

// ============================================================================
// SESSION ENTITY
// ============================================================================

/**
 * User session
 */
export interface Session {
  readonly id: string;
  readonly userId: UserId;
  readonly token: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly lastActivityAt: Date;
  readonly userAgent: Nullable<string>;
  readonly ipAddress: Nullable<string>;
}

// ============================================================================
// GENERIC ENTITIES (Templates)
// ============================================================================

/**
 * Generic item entity for CRUD operations
 * Extend this for your domain entities
 */
export interface Item extends BaseEntity {
  readonly name: string;
  readonly slug: string;
  readonly description: Nullable<string>;
  readonly status: "draft" | "published" | "archived";
  readonly ownerId: UserId;
}

/**
 * Tagged entity mixin
 */
export interface Tagged {
  readonly tags: readonly string[];
}

/**
 * Versioned entity mixin
 */
export interface Versioned {
  readonly version: number;
  readonly previousVersionId: Nullable<string>;
}

// ============================================================================
// VALUE OBJECTS
// ============================================================================

/**
 * Address value object
 */
export interface Address {
  readonly street: string;
  readonly city: string;
  readonly state: Nullable<string>;
  readonly postalCode: string;
  readonly country: string;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly pagination: PaginationInfo;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  readonly field: string;
  readonly direction: "asc" | "desc";
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  readonly field: string;
  readonly operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "in";
  readonly value: unknown;
}

/**
 * Query options for list operations
 */
export interface QueryOptions {
  readonly page?: number;
  readonly limit?: number;
  readonly sort?: SortConfig[];
  readonly filters?: FilterConfig[];
}

// ============================================================================
// ENTITY MAPPERS (Type utilities)
// ============================================================================

/**
 * Create input type (omit auto-generated fields)
 */
export type CreateInput<T extends BaseEntity> = Omit<
  T,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Update input type (all fields optional except id)
 */
export type UpdateInput<T extends BaseEntity> = Partial<
  Omit<T, "id" | "createdAt" | "updatedAt">
> & {
  readonly id: T["id"];
};

/**
 * Summary/list view type (subset of fields)
 */
export type Summary<T, K extends keyof T> = Pick<T, K>;

/**
 * Entity with relations loaded
 */
export type WithRelations<T, R extends Record<string, unknown>> = T & R;
