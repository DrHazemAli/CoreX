/**
 * ============================================================================
 * Plugin Registry - O(1) Plugin Storage & Retrieval
 * ============================================================================
 *
 * Thread-safe plugin registry with:
 * - Constant-time lookups
 * - Dependency graph tracking
 * - State management
 * - Event emission
 *
 * ============================================================================
 */

import type { PluginState } from "@/types/plugins";
import type { LoadedPlugin, HookHandler } from "./types";

/**
 * Registry events
 */
export type RegistryEvent =
  | { type: "plugin:registered"; pluginId: string }
  | { type: "plugin:unregistered"; pluginId: string }
  | { type: "plugin:state-changed"; pluginId: string; state: PluginState }
  | { type: "hook:registered"; hookName: string; pluginId: string };

type RegistryListener = (event: RegistryEvent) => void;

/**
 * High-performance plugin registry
 */
export class PluginRegistry {
  private readonly plugins = new Map<string, LoadedPlugin>();
  private readonly hooks = new Map<string, HookHandler[]>();
  private readonly dependencies = new Map<string, Set<string>>();
  private readonly dependents = new Map<string, Set<string>>();
  private readonly listeners = new Set<RegistryListener>();

  /**
   * Register a loaded plugin
   */
  register(plugin: LoadedPlugin): void {
    const { id } = plugin.metadata;

    if (this.plugins.has(id)) {
      throw new Error(`Plugin '${id}' is already registered`);
    }

    // Store plugin
    this.plugins.set(id, plugin);

    // Track dependencies (Record<string, SemVer> -> array of ids)
    const depsRecord = plugin.metadata.dependencies ?? {};
    const deps = Object.keys(depsRecord);
    this.dependencies.set(id, new Set(deps));

    // Update reverse dependency graph
    for (const depId of deps) {
      if (!this.dependents.has(depId)) {
        this.dependents.set(depId, new Set());
      }
      this.dependents.get(depId)!.add(id);
    }

    this.emit({ type: "plugin:registered", pluginId: id });
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    // Check for dependents
    const dependents = this.dependents.get(pluginId);
    if (dependents && dependents.size > 0) {
      throw new Error(
        `Cannot unregister '${pluginId}': required by ${[...dependents].join(", ")}`,
      );
    }

    // Remove from dependency graph
    const deps = this.dependencies.get(pluginId);
    if (deps) {
      for (const depId of deps) {
        this.dependents.get(depId)?.delete(pluginId);
      }
      this.dependencies.delete(pluginId);
    }

    // Remove hooks
    for (const [hookName, handlers] of this.hooks) {
      const filtered = handlers.filter((h) => h.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.hooks.delete(hookName);
      } else {
        this.hooks.set(hookName, filtered);
      }
    }

    this.plugins.delete(pluginId);
    this.emit({ type: "plugin:unregistered", pluginId });
  }

  /**
   * Get a plugin by ID - O(1)
   */
  get(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Check if plugin is registered - O(1)
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getAll(): LoadedPlugin[] {
    return [...this.plugins.values()];
  }

  /**
   * Get plugins by state
   */
  getByState(state: PluginState): LoadedPlugin[] {
    return [...this.plugins.values()].filter((p) => p.state === state);
  }

  /**
   * Update plugin state
   */
  updateState(pluginId: string, state: PluginState, error?: Error): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    // Create updated plugin (immutable)
    const updated: LoadedPlugin = {
      ...plugin,
      state,
      error,
      activatedAt: state === "active" ? new Date() : plugin.activatedAt,
    };

    this.plugins.set(pluginId, updated);
    this.emit({ type: "plugin:state-changed", pluginId, state });
  }

  /**
   * Register a hook handler
   */
  registerHook<T>(
    hookName: string,
    pluginId: string,
    handler: (data: T) => T | Promise<T>,
    priority: number = 10,
  ): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const handlers = this.hooks.get(hookName)!;
    handlers.push({
      pluginId,
      priority,
      handler: handler as HookHandler["handler"],
    });

    // Sort by priority (lower = earlier)
    handlers.sort((a, b) => a.priority - b.priority);

    this.emit({ type: "hook:registered", hookName, pluginId });
  }

  /**
   * Get handlers for a hook - O(1)
   */
  getHookHandlers<T>(hookName: string): HookHandler<T>[] {
    return (this.hooks.get(hookName) ?? []) as HookHandler<T>[];
  }

  /**
   * Get plugin dependencies
   */
  getDependencies(pluginId: string): string[] {
    return [...(this.dependencies.get(pluginId) ?? [])];
  }

  /**
   * Get plugins that depend on this plugin
   */
  getDependents(pluginId: string): string[] {
    return [...(this.dependents.get(pluginId) ?? [])];
  }

  /**
   * Check if all dependencies are satisfied
   */
  areDependenciesSatisfied(pluginId: string): boolean {
    const deps = this.dependencies.get(pluginId);
    if (!deps) return true;

    for (const depId of deps) {
      const dep = this.plugins.get(depId);
      if (!dep || dep.state !== "active") {
        return false;
      }
    }

    return true;
  }

  /**
   * Get topological order for activation
   */
  getActivationOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected involving '${id}'`);
      }

      visiting.add(id);

      const deps = this.dependencies.get(id);
      if (deps) {
        for (const depId of deps) {
          if (this.plugins.has(depId)) {
            visit(depId);
          }
        }
      }

      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const id of this.plugins.keys()) {
      visit(id);
    }

    return order;
  }

  /**
   * Subscribe to registry events
   */
  subscribe(listener: RegistryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: RegistryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Registry listener error:", error);
      }
    }
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.hooks.clear();
    this.dependencies.clear();
    this.dependents.clear();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalPlugins: number;
    activePlugins: number;
    totalHooks: number;
    byState: Record<PluginState, number>;
  } {
    const plugins = [...this.plugins.values()];
    const byState: Record<string, number> = {};

    for (const plugin of plugins) {
      byState[plugin.state] = (byState[plugin.state] ?? 0) + 1;
    }

    return {
      totalPlugins: plugins.length,
      activePlugins: byState["active"] ?? 0,
      totalHooks: this.hooks.size,
      byState: byState as Record<PluginState, number>,
    };
  }
}
