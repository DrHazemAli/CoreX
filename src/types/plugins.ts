/**
 * ============================================================================
 * Plugin System Types - Extensibility Architecture
 * ============================================================================
 *
 * This module defines the plugin architecture for extending the application.
 * Plugins can add new features, override behaviors, and hook into the lifecycle.
 *
 * Plugin Architecture Principles:
 * ------------------------------
 * 1. ISOLATION: Plugins are sandboxed and can't directly modify core
 * 2. LIFECYCLE: Clear initialization, activation, and cleanup phases
 * 3. HOOKS: Well-defined extension points for customization
 * 4. CONFIGURATION: Each plugin has its own config schema
 * 5. DEPENDENCIES: Explicit plugin dependency declarations
 *
 * Plugin Types:
 * -------------
 * - Feature plugins: Add new functionality
 * - Adapter plugins: Integrate external services
 * - Theme plugins: Customize appearance
 * - Middleware plugins: Intercept requests/responses
 *
 * Security Considerations:
 * -----------------------
 * - Plugins run in the same process (no sandbox)
 * - Validate plugin configs before applying
 * - Use capability-based permissions
 * - Audit plugin actions
 *
 * ============================================================================
 */

import type { ServiceContainer, ServiceFactory } from "./services";
import type { Result } from "./errors";

// ============================================================================
// PLUGIN METADATA
// ============================================================================

/**
 * Semantic version string (e.g., "1.2.3")
 */
export type SemVer = `${number}.${number}.${number}`;

/**
 * Plugin capability permissions
 */
export type PluginCapability =
  | "http:request" // Can make HTTP requests
  | "http:intercept" // Can intercept HTTP requests
  | "storage:read" // Can read from storage
  | "storage:write" // Can write to storage
  | "db:read" // Can read from database
  | "db:write" // Can write to database
  | "cache:read" // Can read from cache
  | "cache:write" // Can write to cache
  | "events:publish" // Can publish events
  | "events:subscribe" // Can subscribe to events
  | "auth:read" // Can read auth state
  | "config:read" // Can read configuration
  | "config:write" // Can modify configuration
  | "ui:render" // Can render UI components
  | "api:extend"; // Can add API endpoints

/**
 * Plugin metadata for discovery and management
 */
export interface PluginMetadata {
  /**
   * Unique plugin identifier (e.g., "@company/plugin-name")
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Plugin version (semver)
   */
  readonly version: SemVer;

  /**
   * Plugin description
   */
  readonly description: string;

  /**
   * Plugin author
   */
  readonly author: {
    readonly name: string;
    readonly email?: string;
    readonly url?: string;
  };

  /**
   * Minimum app version required
   */
  readonly minAppVersion?: SemVer;

  /**
   * Maximum app version supported
   */
  readonly maxAppVersion?: SemVer;

  /**
   * Plugin dependencies
   */
  readonly dependencies?: Record<string, SemVer>;

  /**
   * Required capabilities
   */
  readonly capabilities: readonly PluginCapability[];

  /**
   * Plugin homepage/docs URL
   */
  readonly homepage?: string;

  /**
   * Plugin license
   */
  readonly license?: string;

  /**
   * Tags for discovery
   */
  readonly tags?: readonly string[];
}

// ============================================================================
// PLUGIN LIFECYCLE
// ============================================================================

/**
 * Plugin lifecycle states
 */
export type PluginState =
  | "unloaded" // Not yet loaded
  | "loaded" // Code loaded but not initialized
  | "initializing" // Running initialization
  | "active" // Fully operational
  | "deactivating" // Shutting down
  | "error"; // Failed to load/activate

/**
 * Plugin lifecycle context provided during activation
 */
export interface PluginContext {
  /**
   * Plugin's own metadata
   */
  readonly metadata: PluginMetadata;

  /**
   * Service container for dependency injection
   */
  readonly container: ServiceContainer;

  /**
   * Plugin configuration (validated)
   */
  readonly config: Record<string, unknown>;

  /**
   * Logger scoped to this plugin
   */
  readonly logger: PluginLogger;

  /**
   * Storage scoped to this plugin
   */
  readonly storage: PluginStorage;

  /**
   * Register cleanup function
   */
  onDeactivate(cleanup: () => Promise<void> | void): void;
}

/**
 * Scoped logger for plugins
 */
export interface PluginLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error, data?: Record<string, unknown>): void;
}

/**
 * Scoped storage for plugins
 */
export interface PluginStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  clear(): Promise<void>;
}

// ============================================================================
// PLUGIN INTERFACE
// ============================================================================

/**
 * Base plugin interface
 *
 * All plugins must implement this interface.
 *
 * @example
 * class MyPlugin implements Plugin {
 *   static metadata: PluginMetadata = {
 *     id: '@myorg/my-plugin',
 *     name: 'My Plugin',
 *     version: '1.0.0',
 *     description: 'Does something cool',
 *     author: { name: 'Me' },
 *     capabilities: ['events:subscribe'],
 *   };
 *
 *   async activate(context: PluginContext): Promise<void> {
 *     // Initialize plugin
 *   }
 *
 *   async deactivate(): Promise<void> {
 *     // Cleanup
 *   }
 * }
 */
export interface Plugin {
  /**
   * Plugin metadata (static property)
   */
  readonly metadata: PluginMetadata;

  /**
   * Called when plugin is activated
   */
  activate(context: PluginContext): Promise<void>;

  /**
   * Called when plugin is deactivated
   */
  deactivate(): Promise<void>;
}

/**
 * Plugin constructor type
 */
export interface PluginConstructor {
  new (): Plugin;
  readonly metadata: PluginMetadata;
}

// ============================================================================
// PLUGIN HOOKS (Extension Points)
// ============================================================================

/**
 * Hook priority levels
 */
export type HookPriority = "first" | "early" | "normal" | "late" | "last";

/**
 * Hook registration options
 */
export interface HookOptions {
  priority?: HookPriority;
  once?: boolean;
}

/**
 * Request hook context
 */
export interface RequestHookContext {
  url: string;
  method: string;
  headers: Headers;
  body?: unknown;
}

/**
 * Response hook context
 */
export interface ResponseHookContext {
  status: number;
  headers: Headers;
  body?: unknown;
  request: RequestHookContext;
}

/**
 * Available hook types
 */
export interface PluginHooks {
  /**
   * Called before a request is processed
   */
  "request:before": (
    context: RequestHookContext,
  ) => Promise<RequestHookContext | void>;

  /**
   * Called after a response is generated
   */
  "response:after": (
    context: ResponseHookContext,
  ) => Promise<ResponseHookContext | void>;

  /**
   * Called when app starts
   */
  "app:start": () => Promise<void>;

  /**
   * Called when app shuts down
   */
  "app:shutdown": () => Promise<void>;

  /**
   * Called when user logs in
   */
  "auth:login": (userId: string) => Promise<void>;

  /**
   * Called when user logs out
   */
  "auth:logout": (userId: string) => Promise<void>;

  /**
   * Called when entity is created
   */
  "entity:created": (type: string, entity: unknown) => Promise<void>;

  /**
   * Called when entity is updated
   */
  "entity:updated": (
    type: string,
    entity: unknown,
    changes: unknown,
  ) => Promise<void>;

  /**
   * Called when entity is deleted
   */
  "entity:deleted": (type: string, entityId: string) => Promise<void>;
}

// ============================================================================
// PLUGIN MANAGER
// ============================================================================

/**
 * Plugin instance with state
 */
export interface PluginInstance {
  readonly plugin: Plugin;
  readonly state: PluginState;
  readonly loadedAt?: Date;
  readonly activatedAt?: Date;
  readonly error?: Error;
}

/**
 * Plugin manager interface
 */
export interface PluginManager {
  /**
   * Register a plugin
   */
  register(plugin: PluginConstructor): void;

  /**
   * Load a plugin by ID
   */
  load(pluginId: string): Promise<Result<void>>;

  /**
   * Unload a plugin by ID
   */
  unload(pluginId: string): Promise<Result<void>>;

  /**
   * Activate a loaded plugin
   */
  activate(
    pluginId: string,
    config?: Record<string, unknown>,
  ): Promise<Result<void>>;

  /**
   * Deactivate an active plugin
   */
  deactivate(pluginId: string): Promise<Result<void>>;

  /**
   * Get plugin instance
   */
  get(pluginId: string): PluginInstance | undefined;

  /**
   * Get all registered plugins
   */
  getAll(): readonly PluginInstance[];

  /**
   * Get all active plugins
   */
  getActive(): readonly PluginInstance[];

  /**
   * Check if plugin is registered
   */
  has(pluginId: string): boolean;

  /**
   * Add hook listener
   */
  hook<K extends keyof PluginHooks>(
    hookName: K,
    handler: PluginHooks[K],
    options?: HookOptions,
  ): () => void;

  /**
   * Execute hook handlers
   */
  executeHook<K extends keyof PluginHooks>(
    hookName: K,
    ...args: Parameters<PluginHooks[K]>
  ): Promise<void>;
}

// ============================================================================
// PLUGIN CONFIGURATION
// ============================================================================

/**
 * Plugin config schema (JSON Schema subset)
 */
export interface PluginConfigSchema {
  readonly type: "object";
  readonly properties: Record<
    string,
    {
      type: "string" | "number" | "boolean" | "array" | "object";
      description?: string;
      default?: unknown;
      required?: boolean;
      enum?: readonly unknown[];
    }
  >;
  readonly required?: readonly string[];
}

/**
 * Configurable plugin interface
 */
export interface ConfigurablePlugin extends Plugin {
  /**
   * Configuration schema
   */
  readonly configSchema: PluginConfigSchema;

  /**
   * Validate configuration
   */
  validateConfig(
    config: Record<string, unknown>,
  ): Result<Record<string, unknown>>;
}

// ============================================================================
// PLUGIN EXTENSION TYPES
// ============================================================================

/**
 * API extension definition
 */
export interface ApiExtension {
  readonly path: string;
  readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  readonly handler: (req: Request) => Promise<Response>;
  readonly middleware?: Array<(req: Request) => Promise<Request | Response>>;
}

/**
 * Service extension definition
 */
export interface ServiceExtension<T = unknown> {
  readonly id: string;
  readonly factory: ServiceFactory<T>;
  readonly singleton?: boolean;
}

/**
 * Plugin with extensions
 */
export interface ExtensiblePlugin extends Plugin {
  /**
   * API endpoints to add
   */
  readonly apiExtensions?: readonly ApiExtension[];

  /**
   * Services to register
   */
  readonly serviceExtensions?: readonly ServiceExtension[];
}
