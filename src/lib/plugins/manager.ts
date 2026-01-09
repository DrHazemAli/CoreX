/**
 * ============================================================================
 * Plugin Manager - Core Plugin Orchestration
 * ============================================================================
 *
 * High-performance plugin management with:
 * - Lazy loading: 0ms startup cost for inactive plugins
 * - Dependency resolution: Topological sort for correct load order
 * - Hook pipeline: Composable data transformations
 * - Lifecycle management: activate/deactivate with cleanup
 * - Error isolation: Plugin errors don't crash the system
 *
 * Performance Guarantees:
 * - Plugin lookup: O(1)
 * - Hook execution: O(n) where n = handlers for that hook
 * - Activation: O(n log n) for dependency sorting
 *
 * Usage Example:
 * ```typescript
 * const manager = new PluginManager({ services });
 *
 * // Register plugins
 * await manager.register(myPlugin);
 *
 * // Activate all
 * await manager.activateAll();
 *
 * // Execute hooks
 * const result = await manager.executeHook('transform:data', inputData);
 * ```
 *
 * ============================================================================
 */

import type {
  Plugin,
  PluginMetadata,
  PluginState,
  PluginCapability,
} from "@/types/plugins";
import type { ServiceContainer } from "@/types/services";
import { PluginRegistry } from "./registry";
import { PluginLoader } from "./loader";
import { createPluginContext } from "./context";
import type { LoadedPlugin } from "./types";

/**
 * Plugin manager configuration
 */
export interface PluginManagerConfig {
  services: ServiceContainer;
  maxPlugins?: number;
  hookTimeout?: number;
  enableMetrics?: boolean;
}

/**
 * Plugin activation result
 */
interface ActivationResult {
  success: boolean;
  pluginId: string;
  error?: Error;
  duration: number;
}

/**
 * Hook execution metrics
 */
interface HookMetrics {
  hookName: string;
  executionCount: number;
  totalDuration: number;
  avgDuration: number;
  lastExecuted?: Date;
}

/**
 * Main plugin manager
 */
export class PluginManager {
  private readonly registry: PluginRegistry;
  private readonly loader: PluginLoader;
  private readonly services: ServiceContainer;
  private readonly config: Required<PluginManagerConfig>;
  private readonly metrics = new Map<string, HookMetrics>();
  private disposed = false;

  constructor(config: PluginManagerConfig) {
    this.registry = new PluginRegistry();
    this.loader = new PluginLoader();
    this.services = config.services;
    this.config = {
      services: config.services,
      maxPlugins: config.maxPlugins ?? 100,
      hookTimeout: config.hookTimeout ?? 5000,
      enableMetrics: config.enableMetrics ?? true,
    };
  }

  // ============================================================================
  // REGISTRATION
  // ============================================================================

  /**
   * Register a plugin instance
   */
  async register(plugin: Plugin): Promise<void> {
    this.ensureNotDisposed();
    this.ensureCapacity();

    // Validate capabilities
    this.validateCapabilities(plugin.metadata);

    // Create loaded plugin entry
    const loaded: LoadedPlugin = {
      metadata: plugin.metadata,
      instance: plugin,
      state: "loaded",
      loadedAt: new Date(),
    };

    this.registry.register(loaded);
  }

  /**
   * Register a plugin from path (lazy loaded)
   */
  async registerFromPath(path: string): Promise<void> {
    this.ensureNotDisposed();
    this.ensureCapacity();

    const loaded = await this.loader.load(path);

    if (loaded.state === "error") {
      throw loaded.error ?? new Error(`Failed to load plugin from '${path}'`);
    }

    this.validateCapabilities(loaded.metadata);
    this.registry.register(loaded);
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<void> {
    this.ensureNotDisposed();

    const plugin = this.registry.get(pluginId);
    if (!plugin) return;

    // Deactivate first if active
    if (plugin.state === "active") {
      await this.deactivate(pluginId);
    }

    this.registry.unregister(pluginId);
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  /**
   * Activate a single plugin
   */
  async activate(pluginId: string): Promise<ActivationResult> {
    this.ensureNotDisposed();
    const start = performance.now();

    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      return {
        success: false,
        pluginId,
        error: new Error(`Plugin '${pluginId}' not found`),
        duration: performance.now() - start,
      };
    }

    // Check if already active
    if (plugin.state === "active") {
      return { success: true, pluginId, duration: 0 };
    }

    // Check dependencies
    if (!this.registry.areDependenciesSatisfied(pluginId)) {
      const missing = this.registry
        .getDependencies(pluginId)
        .filter((depId) => {
          const dep = this.registry.get(depId);
          return !dep || dep.state !== "active";
        });

      return {
        success: false,
        pluginId,
        error: new Error(`Missing dependencies: ${missing.join(", ")}`),
        duration: performance.now() - start,
      };
    }

    try {
      this.registry.updateState(pluginId, "initializing");

      // Create context for the plugin
      const context = createPluginContext({
        metadata: plugin.metadata,
        services: this.services,
        config: {}, // Plugins can have their own config
      });

      // Call activate
      if (plugin.instance.activate) {
        await Promise.race([
          plugin.instance.activate(context),
          this.createTimeout(this.config.hookTimeout, "activation"),
        ]);
      }

      this.registry.updateState(pluginId, "active");

      return {
        success: true,
        pluginId,
        duration: performance.now() - start,
      };
    } catch (error) {
      this.registry.updateState(pluginId, "error", error as Error);

      return {
        success: false,
        pluginId,
        error: error as Error,
        duration: performance.now() - start,
      };
    }
  }

  /**
   * Activate all plugins in dependency order
   */
  async activateAll(): Promise<ActivationResult[]> {
    this.ensureNotDisposed();

    const order = this.registry.getActivationOrder();
    const results: ActivationResult[] = [];

    for (const pluginId of order) {
      const plugin = this.registry.get(pluginId);
      if (plugin && plugin.state !== "active") {
        const result = await this.activate(pluginId);
        results.push(result);

        // Stop on error if plugin is required
        if (!result.success) {
          const deps = this.registry.getDependents(pluginId);
          for (const depId of deps) {
            results.push({
              success: false,
              pluginId: depId,
              error: new Error(`Dependency '${pluginId}' failed to activate`),
              duration: 0,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Deactivate a single plugin
   */
  async deactivate(pluginId: string): Promise<void> {
    this.ensureNotDisposed();

    const plugin = this.registry.get(pluginId);
    if (!plugin || plugin.state !== "active") return;

    // Check for dependents
    const dependents = this.registry.getDependents(pluginId);
    const activeDependents = dependents.filter((depId) => {
      const dep = this.registry.get(depId);
      return dep?.state === "active";
    });

    if (activeDependents.length > 0) {
      throw new Error(
        `Cannot deactivate '${pluginId}': required by active plugins: ${activeDependents.join(", ")}`,
      );
    }

    try {
      this.registry.updateState(pluginId, "deactivating");

      if (plugin.instance.deactivate) {
        await Promise.race([
          plugin.instance.deactivate(),
          this.createTimeout(this.config.hookTimeout, "deactivation"),
        ]);
      }

      this.registry.updateState(pluginId, "loaded");
    } catch (error) {
      this.registry.updateState(pluginId, "error", error as Error);
      throw error;
    }
  }

  /**
   * Deactivate all plugins (reverse order)
   */
  async deactivateAll(): Promise<void> {
    const order = this.registry.getActivationOrder().reverse();

    for (const pluginId of order) {
      const plugin = this.registry.get(pluginId);
      if (plugin?.state === "active") {
        try {
          await this.deactivate(pluginId);
        } catch (error) {
          console.error(`Failed to deactivate '${pluginId}':`, error);
        }
      }
    }
  }

  // ============================================================================
  // HOOKS
  // ============================================================================

  /**
   * Execute a hook pipeline
   *
   * @template T - Data type flowing through the pipeline
   * @param hookName - Name of the hook to execute
   * @param data - Initial data to pass through handlers
   * @returns Transformed data after all handlers
   */
  async executeHook<T>(hookName: string, data: T): Promise<T> {
    this.ensureNotDisposed();
    const start = performance.now();

    const handlers = this.registry.getHookHandlers<T>(hookName);

    let result = data;
    for (const { handler, pluginId } of handlers) {
      try {
        result = await Promise.race([
          handler(result),
          this.createTimeout(this.config.hookTimeout, `hook:${hookName}`),
        ]);
      } catch (error) {
        console.error(
          `Hook '${hookName}' handler from '${pluginId}' failed:`,
          error,
        );
        // Continue with other handlers
      }
    }

    // Update metrics
    if (this.config.enableMetrics) {
      this.updateMetrics(hookName, performance.now() - start);
    }

    return result;
  }

  /**
   * Execute hook with early exit on condition
   */
  async executeHookUntil<T>(
    hookName: string,
    data: T,
    predicate: (result: T) => boolean,
  ): Promise<T> {
    this.ensureNotDisposed();

    const handlers = this.registry.getHookHandlers<T>(hookName);

    let result = data;
    for (const { handler, pluginId } of handlers) {
      try {
        result = await handler(result);
        if (predicate(result)) {
          break;
        }
      } catch (error) {
        console.error(
          `Hook '${hookName}' handler from '${pluginId}' failed:`,
          error,
        );
      }
    }

    return result;
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.registry.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): LoadedPlugin[] {
    return this.registry.getAll();
  }

  /**
   * Get plugins by state
   */
  getPluginsByState(state: PluginState): LoadedPlugin[] {
    return this.registry.getByState(state);
  }

  /**
   * Check if plugin is registered
   */
  hasPlugin(pluginId: string): boolean {
    return this.registry.has(pluginId);
  }

  /**
   * Get hook metrics
   */
  getHookMetrics(hookName?: string): HookMetrics[] {
    if (hookName) {
      const metric = this.metrics.get(hookName);
      return metric ? [metric] : [];
    }
    return [...this.metrics.values()];
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return this.registry.getStats();
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  /**
   * Dispose of the plugin manager
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;

    await this.deactivateAll();
    this.registry.clear();
    this.metrics.clear();
    this.disposed = true;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new Error("PluginManager has been disposed");
    }
  }

  private ensureCapacity(): void {
    if (this.registry.getAll().length >= this.config.maxPlugins) {
      throw new Error(
        `Maximum plugin limit (${this.config.maxPlugins}) reached`,
      );
    }
  }

  private validateCapabilities(metadata: PluginMetadata): void {
    const allowed: PluginCapability[] = [
      "http:request",
      "http:intercept",
      "storage:read",
      "storage:write",
      "db:read",
      "db:write",
      "cache:read",
      "cache:write",
      "events:publish",
      "events:subscribe",
      "auth:read",
      "config:read",
      "config:write",
      "ui:render",
      "api:extend",
    ];

    const capabilities = metadata.capabilities ?? [];
    for (const cap of capabilities) {
      if (!allowed.includes(cap)) {
        throw new Error(`Unknown capability: '${cap}'`);
      }
    }
  }

  private createTimeout(ms: number, operation: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Plugin ${operation} timed out after ${ms}ms`));
      }, ms);
    });
  }

  private updateMetrics(hookName: string, duration: number): void {
    const existing = this.metrics.get(hookName);

    if (existing) {
      const newCount = existing.executionCount + 1;
      const newTotal = existing.totalDuration + duration;
      this.metrics.set(hookName, {
        hookName,
        executionCount: newCount,
        totalDuration: newTotal,
        avgDuration: newTotal / newCount,
        lastExecuted: new Date(),
      });
    } else {
      this.metrics.set(hookName, {
        hookName,
        executionCount: 1,
        totalDuration: duration,
        avgDuration: duration,
        lastExecuted: new Date(),
      });
    }
  }
}
