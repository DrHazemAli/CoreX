/**
 * ============================================================================
 * Service Interfaces - Dependency Injection Contracts
 * ============================================================================
 *
 * This module defines interfaces for all services in the application.
 * Following the Dependency Inversion Principle (DIP), high-level modules
 * depend on these abstractions, not concrete implementations.
 *
 * Why Service Interfaces?
 * ----------------------
 * 1. TESTABILITY: Easily mock services in tests
 * 2. FLEXIBILITY: Swap implementations without changing consumers
 * 3. DECOUPLING: Layers don't know about each other's internals
 * 4. PLUGIN SUPPORT: Plugins can provide alternative implementations
 *
 * Interface Design Guidelines:
 * ---------------------------
 * - Keep interfaces focused (Interface Segregation Principle)
 * - Use async methods for I/O operations
 * - Return Result types for operations that can fail
 * - Avoid exposing implementation details
 *
 * ============================================================================
 */

import type { Result } from "./errors";
import type {
  User,
  UserId,
  PaginatedResult,
  QueryOptions,
  Session,
} from "./entities";

// ============================================================================
// REPOSITORY INTERFACES (Data Access)
// ============================================================================

/**
 * Base repository interface for CRUD operations
 *
 * @template T - Entity type
 * @template TId - Entity ID type
 * @template TCreate - Create input type
 * @template TUpdate - Update input type
 *
 * @example
 * interface UserRepository extends Repository<User, UserId, CreateUserInput, UpdateUserInput> {
 *   findByEmail(email: string): Promise<User | null>;
 * }
 */
export interface Repository<
  T,
  TId = string,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> {
  /**
   * Find entity by ID
   */
  findById(id: TId): Promise<T | null>;

  /**
   * Find all entities matching query options
   */
  findMany(options?: QueryOptions): Promise<PaginatedResult<T>>;

  /**
   * Create a new entity
   */
  create(data: TCreate): Promise<T>;

  /**
   * Update an existing entity
   */
  update(id: TId, data: TUpdate): Promise<T>;

  /**
   * Delete an entity
   */
  delete(id: TId): Promise<void>;

  /**
   * Check if entity exists
   */
  exists(id: TId): Promise<boolean>;
}

/**
 * Read-only repository for query-heavy use cases
 */
export interface ReadOnlyRepository<T, TId = string> {
  findById(id: TId): Promise<T | null>;
  findMany(options?: QueryOptions): Promise<PaginatedResult<T>>;
  exists(id: TId): Promise<boolean>;
  count(options?: QueryOptions): Promise<number>;
}

// ============================================================================
// CACHE INTERFACE
// ============================================================================

/**
 * Cache service interface
 *
 * @example
 * const user = await cache.get<User>('user:123');
 * await cache.set('user:123', user, 3600);
 */
export interface CacheService {
  /**
   * Get cached value
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;

  /**
   * Delete from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Delete multiple keys by pattern
   */
  deletePattern(pattern: string): Promise<void>;

  /**
   * Check if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Get or set with factory function
   */
  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T>;
}

// ============================================================================
// AUTHENTICATION INTERFACE
// ============================================================================

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Auth service interface
 */
export interface AuthService {
  /**
   * Sign in with credentials
   */
  signIn(credentials: AuthCredentials): Promise<Result<Session>>;

  /**
   * Sign out current session
   */
  signOut(sessionId: string): Promise<Result<void>>;

  /**
   * Verify session token
   */
  verifySession(token: string): Promise<Result<Session>>;

  /**
   * Get current user from session
   */
  getCurrentUser(sessionId: string): Promise<Result<User>>;

  /**
   * Refresh session token
   */
  refreshSession(sessionId: string): Promise<Result<Session>>;
}

// ============================================================================
// AUTHORIZATION INTERFACE
// ============================================================================

/**
 * Permission check context
 */
export interface PermissionContext {
  userId: UserId;
  resourceType: string;
  resourceId?: string;
  action: string;
}

/**
 * Authorization service interface
 */
export interface AuthorizationService {
  /**
   * Check if user has permission
   */
  hasPermission(context: PermissionContext): Promise<boolean>;

  /**
   * Check multiple permissions
   */
  hasAllPermissions(contexts: PermissionContext[]): Promise<boolean>;

  /**
   * Check if any permission is granted
   */
  hasAnyPermission(contexts: PermissionContext[]): Promise<boolean>;

  /**
   * Get all permissions for user
   */
  getUserPermissions(userId: UserId): Promise<string[]>;
}

// ============================================================================
// RATE LIMITER INTERFACE
// ============================================================================

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Rate limiter service interface
 */
export interface RateLimiterService {
  /**
   * Check and consume rate limit
   */
  check(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult>;

  /**
   * Get current usage without consuming
   */
  getUsage(key: string): Promise<{ count: number; resetAt: Date }>;

  /**
   * Reset rate limit for key
   */
  reset(key: string): Promise<void>;
}

// ============================================================================
// LOGGER INTERFACE
// ============================================================================

/**
 * Log level
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Log context
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Logger service interface
 */
export interface LoggerService {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  fatal(message: string, error?: Error, context?: LogContext): void;

  /**
   * Create child logger with preset context
   */
  child(context: LogContext): LoggerService;
}

// ============================================================================
// EVENT BUS INTERFACE
// ============================================================================

/**
 * Event handler function
 */
export type EventHandler<T = unknown> = (event: T) => Promise<void> | void;

/**
 * Event subscription
 */
export interface EventSubscription {
  unsubscribe(): void;
}

/**
 * Event bus for domain events
 */
export interface EventBusService {
  /**
   * Publish an event
   */
  publish<T>(eventType: string, event: T): Promise<void>;

  /**
   * Subscribe to an event type
   */
  subscribe<T>(eventType: string, handler: EventHandler<T>): EventSubscription;

  /**
   * Subscribe to an event type (once)
   */
  once<T>(eventType: string, handler: EventHandler<T>): EventSubscription;
}

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

/**
 * File metadata
 */
export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
}

/**
 * Upload options
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}

/**
 * Storage service interface
 */
export interface StorageService {
  /**
   * Upload a file
   */
  upload(
    key: string,
    data: Buffer | Blob,
    options?: UploadOptions,
  ): Promise<string>;

  /**
   * Download a file
   */
  download(key: string): Promise<Buffer>;

  /**
   * Delete a file
   */
  delete(key: string): Promise<void>;

  /**
   * Get file metadata
   */
  getMetadata(key: string): Promise<FileMetadata | null>;

  /**
   * Generate signed URL for temporary access
   */
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;

  /**
   * List files in a directory
   */
  list(prefix: string): Promise<FileMetadata[]>;
}

// ============================================================================
// SERVICE CONTAINER (Dependency Injection)
// ============================================================================

/**
 * Service identifier type
 */
export type ServiceIdentifier = string | symbol;

/**
 * Service factory function
 */
export type ServiceFactory<T> = () => T;

/**
 * Service container for dependency injection
 *
 * @example
 * // Register services
 * container.register('cache', () => new RedisCache());
 * container.registerSingleton('db', () => new Database());
 *
 * // Resolve services
 * const userRepo = container.get<UserRepository>('userRepo');
 */
export interface ServiceContainer {
  /**
   * Register a service factory
   */
  register<T>(id: string, factory: ServiceFactory<T>): void;

  /**
   * Get a service instance - throws if not found
   */
  get<T>(id: string): T;

  /**
   * Get a service instance - returns undefined if not found
   */
  getOptional<T>(id: string): T | undefined;

  /**
   * Check if service is registered
   */
  has(id: string): boolean;
}
