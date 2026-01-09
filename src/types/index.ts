/**
 * ============================================================================
 * COREX: Centralized Type System
 * ============================================================================
 *
 * This module serves as the single source of truth for all TypeScript types.
 * It implements Clean Architecture principles with plugin support.
 *
 * Architecture Principles:
 * -----------------------
 * 1. DEPENDENCY INVERSION: High-level modules don't depend on low-level modules.
 *    Both depend on abstractions (interfaces defined here).
 *
 * 2. INTERFACE SEGREGATION: Many specific interfaces are better than one general.
 *    Each interface has a single purpose.
 *
 * 3. OPEN/CLOSED: Open for extension (plugins), closed for modification.
 *    Core types are stable; plugins extend functionality.
 *
 * 4. SINGLE RESPONSIBILITY: Each type module handles one domain.
 *
 * Directory Structure:
 * -------------------
 * types/
 * ├── index.ts           # Re-exports all types (this file)
 * ├── base.ts            # Primitive types, branded types, utilities
 * ├── entities.ts        # Domain entities (pure data structures)
 * ├── services.ts        # Service interfaces (dependency injection)
 * ├── plugins.ts         # Plugin system types
 * ├── http.ts            # HTTP request/response types
 * ├── events.ts          # Domain events for event-driven architecture
 * └── errors.ts          # Error types and result types
 *
 * Usage:
 * ------
 * ```ts
 * // Import specific types
 * import type { User, Repository, Plugin } from '@/types';
 *
 * // Import from specific modules
 * import type { Plugin, PluginContext } from '@/types/plugins';
 * ```
 *
 * ============================================================================
 */

// Base types and utilities (excluding UserId which is also in entities)
export type {
  Brand,
  Timestamp,
  ISODateString,
  DeepPartial,
  DeepReadonly,
  DeepRequired,
  Nullable,
  Maybe,
  Dictionary,
  JsonValue,
  JsonObject,
  SessionId,
  RequestId,
  EntityId,
} from "./base";

// Domain entities
export * from "./entities";

// Service interfaces (for dependency injection) - excluding EventHandler/EventSubscription conflicts
export type {
  Repository,
  ReadOnlyRepository,
  CacheService,
  AuthCredentials,
  AuthService,
  PermissionContext,
  AuthorizationService,
  RateLimitResult,
  RateLimiterService,
  LogLevel,
  LogContext,
  LoggerService,
  EventBusService,
  FileMetadata,
  StorageService,
  ServiceIdentifier,
  ServiceFactory,
  ServiceContainer,
} from "./services";

// Plugin system
export * from "./plugins";

// HTTP types
export * from "./http";

// Domain events
export * from "./events";

// Error handling
export * from "./errors";
