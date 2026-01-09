/**
 * ============================================================================
 * Plugin System - Runtime Implementation
 * ============================================================================
 *
 * High-performance plugin architecture with:
 * - Lazy loading for minimal startup overhead
 * - Sandboxed execution contexts
 * - Hot reload support
 * - Lifecycle management
 * - Event-driven communication
 *
 * Performance Characteristics:
 * - Plugin registry: O(1) lookup
 * - Hook execution: O(n) where n = registered handlers
 * - Lazy loading: 0ms startup cost for inactive plugins
 *
 * ============================================================================
 */

export { PluginManager } from "./manager";
export { PluginRegistry } from "./registry";
export { PluginLoader } from "./loader";
export { createPluginContext } from "./context";
export type { PluginInstance, LoadedPlugin } from "./types";
