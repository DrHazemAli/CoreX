/**
 * ============================================================================
 * COREX: Job System Configuration
 * Description: Feature flags and configuration for the job queue system
 *
 * ENVIRONMENT VARIABLES:
 * - NEXT_PUBLIC_ENABLE_JOBS: Enable job queue system ("0" | "1")
 * - JOB_QUEUE_DRIVER: Queue driver type ("memory" | "database" | "sync")
 * - JOB_DEFAULT_QUEUE: Default queue name (default: "default")
 * - JOB_MAX_ATTEMPTS: Default max retry attempts (default: 3)
 * - JOB_WORKER_CONCURRENCY: Max concurrent jobs per worker (default: 1)
 * - JOB_WORKER_POLL_INTERVAL: Polling interval in ms (default: 1000)
 * ============================================================================
 */

import "server-only";

// ============================================================================
// FEATURE FLAG
// ============================================================================

/**
 * Check if job system is enabled
 *
 * When disabled:
 * - dispatch() logs warning and returns immediately
 * - dispatchSync() still works (inline execution)
 * - Worker endpoints return early
 */
export function isJobsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_JOBS === "1";
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface JobConfig {
  /**
   * Whether jobs are enabled
   */
  enabled: boolean;

  /**
   * Queue driver to use
   */
  driver: "memory" | "database" | "sync";

  /**
   * Default queue name
   */
  defaultQueue: string;

  /**
   * Default max retry attempts
   */
  maxAttempts: number;

  /**
   * Default job timeout in milliseconds
   */
  timeout: number;

  /**
   * Worker configuration
   */
  worker: {
    /**
     * Max concurrent jobs per worker
     */
    concurrency: number;

    /**
     * Polling interval in milliseconds
     */
    pollInterval: number;

    /**
     * Graceful shutdown timeout
     */
    shutdownTimeout: number;
  };
}

/**
 * Get job system configuration
 */
export function getJobConfig(): JobConfig {
  return {
    enabled: isJobsEnabled(),
    driver: (process.env.JOB_QUEUE_DRIVER as JobConfig["driver"]) ?? "memory",
    defaultQueue: process.env.JOB_DEFAULT_QUEUE ?? "default",
    maxAttempts: parseInt(process.env.JOB_MAX_ATTEMPTS ?? "3", 10),
    timeout: parseInt(process.env.JOB_TIMEOUT ?? "60000", 10),
    worker: {
      concurrency: parseInt(process.env.JOB_WORKER_CONCURRENCY ?? "1", 10),
      pollInterval: parseInt(
        process.env.JOB_WORKER_POLL_INTERVAL ?? "1000",
        10,
      ),
      shutdownTimeout: parseInt(
        process.env.JOB_WORKER_SHUTDOWN_TIMEOUT ?? "30000",
        10,
      ),
    },
  };
}

// ============================================================================
// QUEUE NAMES (Constants)
// ============================================================================

/**
 * Standard queue names for organizing jobs
 */
export const QUEUES = {
  /**
   * Default queue for general jobs
   */
  DEFAULT: "default",

  /**
   * High priority queue (processed first)
   */
  HIGH: "high",

  /**
   * Low priority queue (processed when others are empty)
   */
  LOW: "low",

  /**
   * Emails queue
   */
  EMAILS: "emails",

  /**
   * Notifications queue
   */
  NOTIFICATIONS: "notifications",

  /**
   * Data sync queue
   */
  SYNC: "sync",

  /**
   * Analytics/reporting queue
   */
  ANALYTICS: "analytics",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
