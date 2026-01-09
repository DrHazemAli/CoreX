/**
 * ============================================================================
 * Plugin Loader - Lazy Loading & Dynamic Import
 * ============================================================================
 *
 * Handles plugin loading with:
 * - Lazy loading for 0ms startup cost
 * - Dynamic imports for code splitting
 * - Validation before loading
 * - Timeout protection
 *
 * ============================================================================
 */

import type { Plugin, PluginMetadata, SemVer } from "@/types/plugins";
import type { LoadedPlugin, PluginLoadOptions } from "./types";

/**
 * Default load options
 */
const DEFAULT_OPTIONS: Required<PluginLoadOptions> = {
  lazy: true,
  timeout: 5000,
  sandbox: true,
};

/**
 * Plugin loader for dynamic loading
 */
export class PluginLoader {
  private readonly loadPromises = new Map<string, Promise<LoadedPlugin>>();

  /**
   * Load a plugin from a module path
   */
  async load(
    path: string,
    options: PluginLoadOptions = {},
  ): Promise<LoadedPlugin> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Check for existing load in progress
    const existingLoad = this.loadPromises.get(path);
    if (existingLoad) {
      return existingLoad;
    }

    // Create load promise with timeout
    const loadPromise = this.doLoad(path, opts);
    this.loadPromises.set(path, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.loadPromises.delete(path);
    }
  }

  /**
   * Internal load implementation
   */
  private async doLoad(
    path: string,
    options: Required<PluginLoadOptions>,
  ): Promise<LoadedPlugin> {
    try {
      // Dynamic import with timeout
      const modulePromise = this.importModule(path);
      const timeoutPromise = this.createTimeout(options.timeout, path);

      const loadedModule = await Promise.race([modulePromise, timeoutPromise]);

      // Extract plugin from module
      const plugin = this.extractPlugin(loadedModule, path);

      // Validate plugin
      this.validatePlugin(plugin);

      return {
        metadata: plugin.metadata,
        instance: plugin,
        state: "loaded",
        loadedAt: new Date(),
      };
    } catch (error) {
      const defaultMetadata: PluginMetadata = {
        id: path,
        name: path,
        version: "0.0.0" as SemVer,
        description: "Failed to load",
        author: { name: "Unknown" },
        capabilities: [],
      };
      return {
        metadata: defaultMetadata,
        instance: null as unknown as Plugin,
        state: "error",
        loadedAt: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Import module dynamically
   */
  private async importModule(path: string): Promise<unknown> {
    try {
      return await import(path);
    } catch {
      // Fallback: try as relative path
      return await import(`./${path}`);
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number, path: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`Plugin load timeout: '${path}' took longer than ${ms}ms`),
        );
      }, ms);
    });
  }

  /**
   * Extract plugin from module
   */
  private extractPlugin(loadedModule: unknown, path: string): Plugin {
    // Check for default export
    if (
      loadedModule &&
      typeof loadedModule === "object" &&
      "default" in loadedModule &&
      this.isPlugin(loadedModule.default)
    ) {
      return loadedModule.default as Plugin;
    }

    // Check for named 'plugin' export
    if (
      loadedModule &&
      typeof loadedModule === "object" &&
      "plugin" in loadedModule &&
      this.isPlugin((loadedModule as Record<string, unknown>).plugin)
    ) {
      return (loadedModule as Record<string, unknown>).plugin as Plugin;
    }

    // Check if module itself is a plugin
    if (this.isPlugin(loadedModule)) {
      return loadedModule as Plugin;
    }

    throw new Error(`Module '${path}' does not export a valid plugin`);
  }

  /**
   * Check if value is a valid plugin
   */
  private isPlugin(value: unknown): boolean {
    if (!value || typeof value !== "object") return false;

    const plugin = value as Record<string, unknown>;

    return (
      "metadata" in plugin &&
      typeof plugin.metadata === "object" &&
      plugin.metadata !== null &&
      "id" in (plugin.metadata as object) &&
      "name" in (plugin.metadata as object) &&
      "version" in (plugin.metadata as object)
    );
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: Plugin): void {
    const { metadata } = plugin;

    // Validate required metadata
    if (!metadata.id || typeof metadata.id !== "string") {
      throw new Error("Plugin must have a string id");
    }

    if (!metadata.name || typeof metadata.name !== "string") {
      throw new Error("Plugin must have a string name");
    }

    if (!metadata.version || typeof metadata.version !== "string") {
      throw new Error("Plugin must have a string version");
    }

    // Validate version format (semver-ish)
    if (!/^\d+\.\d+\.\d+/.test(metadata.version)) {
      throw new Error(`Invalid plugin version: '${metadata.version}'`);
    }

    // Validate lifecycle methods
    if (plugin.activate && typeof plugin.activate !== "function") {
      throw new Error("Plugin activate must be a function");
    }

    if (plugin.deactivate && typeof plugin.deactivate !== "function") {
      throw new Error("Plugin deactivate must be a function");
    }
  }

  /**
   * Load plugin from a factory function
   */
  async loadFromFactory(
    factory: () => Plugin | Promise<Plugin>,
  ): Promise<LoadedPlugin> {
    try {
      const plugin = await factory();
      this.validatePlugin(plugin);

      return {
        metadata: plugin.metadata,
        instance: plugin,
        state: "loaded",
        loadedAt: new Date(),
      };
    } catch (error) {
      const defaultMetadata: PluginMetadata = {
        id: "unknown",
        name: "Unknown",
        version: "0.0.0" as SemVer,
        description: "Failed to load from factory",
        author: { name: "Unknown" },
        capabilities: [],
      };
      return {
        metadata: defaultMetadata,
        instance: null as unknown as Plugin,
        state: "error",
        loadedAt: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a plugin from inline definition
   */
  createPlugin(
    metadata: PluginMetadata,
    handlers: Partial<Pick<Plugin, "activate" | "deactivate">>,
  ): Plugin {
    return {
      metadata,
      activate: handlers.activate ?? (async () => {}),
      deactivate: handlers.deactivate ?? (async () => {}),
    };
  }
}
