/**
 * ============================================================================
 * Plugin Types - Internal Runtime Types
 * ============================================================================
 */

import type {
  Plugin,
  PluginMetadata,
  PluginState,
  PluginContext,
} from "@/types/plugins";

/**
 * Loaded plugin with runtime state
 */
export interface LoadedPlugin {
  readonly metadata: PluginMetadata;
  readonly instance: Plugin;
  readonly state: PluginState;
  readonly loadedAt: Date;
  readonly activatedAt?: Date;
  readonly error?: Error;
}

/**
 * Plugin instance with bound context
 */
export interface PluginInstance {
  readonly plugin: Plugin;
  readonly context: PluginContext;
}

/**
 * Plugin resolution result
 */
export interface PluginResolution {
  readonly id: string;
  readonly path: string;
  readonly dependencies: string[];
}

/**
 * Hook handler with priority
 */
export interface HookHandler<T = unknown> {
  readonly pluginId: string;
  readonly priority: number;
  readonly handler: (data: T) => T | Promise<T>;
}

/**
 * Plugin load options
 */
export interface PluginLoadOptions {
  readonly lazy?: boolean;
  readonly timeout?: number;
  readonly sandbox?: boolean;
}
