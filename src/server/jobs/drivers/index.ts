/**
 * ============================================================================
 * COREX: Queue Drivers Index
 * Description: Queue driver factory and exports
 *
 * DRIVER SELECTION:
 * - 'memory': In-memory queue (default for development)
 * - 'database': Supabase/PostgreSQL queue (production)
 * - 'sync': Synchronous processing (no queue, for testing)
 *
 * Configuration via environment:
 * - JOB_QUEUE_DRIVER: 'memory' | 'database' | 'sync'
 * ============================================================================
 */

import "server-only";
import type { QueueDriver, SerializedJob } from "../types";
import { MemoryQueueDriver } from "./memory";
import { DatabaseQueueDriver } from "./database";
import { isDatabaseEnabled } from "@/lib/config/features";
import { logger } from "@/lib/logger";

// ============================================================================
// DRIVER TYPES
// ============================================================================

export type QueueDriverType = "memory" | "database" | "sync";

// ============================================================================
// SYNC QUEUE DRIVER (No-op for testing)
// ============================================================================

/**
 * Sync driver that doesn't queue - jobs are processed inline
 */
class SyncQueueDriver implements QueueDriver {
  private jobs: Map<string, SerializedJob> = new Map();

  async push(job: SerializedJob): Promise<void> {
    // Store but don't queue - jobs will be processed inline
    this.jobs.set(job.id, job);
  }

  async pop(): Promise<SerializedJob | null> {
    // Never returns jobs - they're processed inline
    return null;
  }

  async complete(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }

  async fail(jobId: string, error: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.failedAt = new Date().toISOString();
      job.error = error;
    }
  }

  async release(jobId: string, delay: number): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.availableAt = new Date(Date.now() + delay).toISOString();
      job.reservedAt = null;
    }
  }

  async get(jobId: string): Promise<SerializedJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async delete(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }

  async size(): Promise<number> {
    return this.jobs.size;
  }

  async clear(): Promise<void> {
    this.jobs.clear();
  }
}

// ============================================================================
// DRIVER FACTORY
// ============================================================================

/**
 * Singleton driver instance
 */
let driverInstance: QueueDriver | null = null;
let currentDriverType: QueueDriverType | null = null;

/**
 * Get the configured driver type from environment
 */
export function getConfiguredDriverType(): QueueDriverType {
  const envDriver = process.env.JOB_QUEUE_DRIVER as QueueDriverType | undefined;

  if (envDriver && ["memory", "database", "sync"].includes(envDriver)) {
    return envDriver;
  }

  // Auto-select based on environment
  if (isDatabaseEnabled()) {
    return "database";
  }

  return "memory";
}

/**
 * Create a queue driver instance
 */
export function createQueueDriver(type: QueueDriverType): QueueDriver {
  switch (type) {
    case "memory":
      logger.debug("Using memory queue driver");
      return new MemoryQueueDriver();

    case "database":
      if (!isDatabaseEnabled()) {
        logger.warn("Database not enabled, falling back to memory driver");
        return new MemoryQueueDriver();
      }
      logger.debug("Using database queue driver");
      return new DatabaseQueueDriver();

    case "sync":
      logger.debug("Using sync queue driver");
      return new SyncQueueDriver();

    default:
      logger.warn(`Unknown driver type: ${type}, using memory driver`);
      return new MemoryQueueDriver();
  }
}

/**
 * Get the singleton queue driver instance
 */
export function getQueueDriver(): QueueDriver {
  const configuredType = getConfiguredDriverType();

  // Create new driver if type changed or not initialized
  if (!driverInstance || currentDriverType !== configuredType) {
    driverInstance = createQueueDriver(configuredType);
    currentDriverType = configuredType;
  }

  return driverInstance;
}

/**
 * Set a custom queue driver (for testing)
 */
export function setQueueDriver(driver: QueueDriver): void {
  driverInstance = driver;
  currentDriverType = null; // Mark as custom
}

/**
 * Reset the driver singleton (for testing)
 */
export function resetQueueDriver(): void {
  driverInstance = null;
  currentDriverType = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { MemoryQueueDriver } from "./memory";
export { DatabaseQueueDriver } from "./database";
