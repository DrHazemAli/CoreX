/**
 * ============================================================================
 * Plugin Context - Sandboxed Plugin Environment
 * ============================================================================
 *
 * Provides isolated context for each plugin with:
 * - Scoped logging
 * - Sandboxed storage
 * - Service access (controlled via container)
 *
 * ============================================================================
 */

import type {
  PluginContext,
  PluginMetadata,
  PluginLogger,
  PluginStorage,
} from "@/types/plugins";
import type { ServiceContainer } from "@/types/services";

/**
 * Context creation options
 */
interface ContextOptions {
  metadata: PluginMetadata;
  services: ServiceContainer;
  config: Record<string, unknown>;
}

/**
 * Create a sandboxed plugin context
 */
export function createPluginContext(options: ContextOptions): PluginContext {
  const { metadata, services, config } = options;
  // eslint-disable-next-line sonarjs/no-unused-collection -- Used by onDeactivate callback below
  const cleanupFunctions: Array<() => Promise<void> | void> = [];

  // Create scoped logger
  const createScopedLogger = (): PluginLogger => {
    const prefix = `[Plugin:${metadata.id}]`;

    return {
      debug: (message: string, data?: Record<string, unknown>) => {
        console.debug(`${prefix} ${message}`, data);
      },
      info: (message: string, data?: Record<string, unknown>) => {
        console.info(`${prefix} ${message}`, data);
      },
      warn: (message: string, data?: Record<string, unknown>) => {
        console.warn(`${prefix} ${message}`, data);
      },
      error: (
        message: string,
        error?: Error,
        data?: Record<string, unknown>,
      ) => {
        console.error(`${prefix} ${message}`, error, data);
      },
    };
  };

  // Create sandboxed storage
  const createStorage = (): PluginStorage => {
    const storageKey = `plugin:${metadata.id}`;
    const cache = new Map<string, unknown>();

    return {
      get: async <T>(key: string): Promise<T | null> => {
        // Try memory cache first
        if (cache.has(key)) {
          return cache.get(key) as T;
        }

        // Try persistent storage
        if (typeof localStorage !== "undefined") {
          try {
            const item = localStorage.getItem(`${storageKey}:${key}`);
            if (item) {
              const value = JSON.parse(item) as T;
              cache.set(key, value);
              return value;
            }
          } catch {
            // Ignore parse errors
          }
        }

        return null;
      },

      set: async <T>(key: string, value: T): Promise<void> => {
        cache.set(key, value);

        if (typeof localStorage !== "undefined") {
          try {
            localStorage.setItem(`${storageKey}:${key}`, JSON.stringify(value));
          } catch {
            // Ignore storage errors (quota, etc.)
          }
        }
      },

      delete: async (key: string): Promise<void> => {
        cache.delete(key);

        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(`${storageKey}:${key}`);
        }
      },

      list: async (): Promise<string[]> => {
        const keys: string[] = [...cache.keys()];

        if (typeof localStorage !== "undefined") {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`${storageKey}:`)) {
              const actualKey = key.slice(storageKey.length + 1);
              if (!keys.includes(actualKey)) {
                keys.push(actualKey);
              }
            }
          }
        }

        return keys;
      },

      clear: async (): Promise<void> => {
        cache.clear();

        if (typeof localStorage !== "undefined") {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`${storageKey}:`)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));
        }
      },
    };
  };

  return {
    metadata,
    container: services,
    config,
    logger: createScopedLogger(),
    storage: createStorage(),
    onDeactivate: (cleanup: () => Promise<void> | void) => {
      cleanupFunctions.push(cleanup);
    },
  };
}
