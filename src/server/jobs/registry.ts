/**
 * ============================================================================
 * COREX: Job Registry
 * Description: Central registry for job definitions (singleton pattern)
 *
 * USAGE:
 *   // Define a job
 *   registry.register({
 *     name: 'email:send',
 *     handle: async (payload, ctx) => {
 *       await sendEmail(payload);
 *       return jobSuccess();
 *     },
 *   });
 *
 *   // Get a job definition
 *   const job = registry.get('email:send');
 * ============================================================================
 */

import "server-only";
import type {
  JobDefinition,
  JobPayload,
  JobHandler,
  JobMiddleware,
} from "./types";
import { JOB_DEFAULTS } from "./types";
import { logger } from "@/lib/logger";

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * Job registry for storing and retrieving job definitions
 */
class JobRegistry {
  private jobs: Map<string, JobDefinition<JobPayload, unknown>> = new Map();
  private globalMiddleware: JobMiddleware[] = [];

  /**
   * Register a new job definition
   */
  register<TPayload extends JobPayload, TOutput = unknown>(
    definition: JobDefinition<TPayload, TOutput>,
  ): void {
    if (this.jobs.has(definition.name)) {
      logger.warn(`Job "${definition.name}" is being re-registered`);
    }

    // Apply defaults
    const normalized: JobDefinition<JobPayload, unknown> = {
      ...definition,
      queue: definition.queue ?? JOB_DEFAULTS.queue,
      maxAttempts: definition.maxAttempts ?? JOB_DEFAULTS.maxAttempts,
      timeout: definition.timeout ?? JOB_DEFAULTS.timeout,
      priority: definition.priority ?? JOB_DEFAULTS.priority,
      backoff: definition.backoff ?? JOB_DEFAULTS.backoff,
      middleware: definition.middleware ?? [],
    } as JobDefinition<JobPayload, unknown>;

    this.jobs.set(definition.name, normalized);
    logger.debug(`Registered job: ${definition.name}`);
  }

  /**
   * Get a job definition by name
   */
  get<TPayload extends JobPayload = JobPayload, TOutput = unknown>(
    name: string,
  ): JobDefinition<TPayload, TOutput> | undefined {
    return this.jobs.get(name) as JobDefinition<TPayload, TOutput> | undefined;
  }

  /**
   * Check if a job is registered
   */
  has(name: string): boolean {
    return this.jobs.has(name);
  }

  /**
   * Get all registered job names
   */
  names(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Get the handler for a job
   */
  getHandler<TPayload extends JobPayload = JobPayload, TOutput = unknown>(
    name: string,
  ): JobHandler<TPayload, TOutput> | undefined {
    const job = this.get<TPayload, TOutput>(name);
    return job?.handle;
  }

  /**
   * Add global middleware (applied to all jobs)
   */
  use(middleware: JobMiddleware): void {
    this.globalMiddleware.push(middleware);
  }

  /**
   * Get all middleware for a job (global + job-specific)
   */
  getMiddleware(name: string): JobMiddleware[] {
    const job = this.get(name);
    return [...this.globalMiddleware, ...(job?.middleware ?? [])];
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.jobs.clear();
    this.globalMiddleware = [];
  }

  /**
   * Get count of registered jobs
   */
  count(): number {
    return this.jobs.size;
  }
}

// Singleton instance
export const jobRegistry = new JobRegistry();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Define and register a job (fluent API)
 */
export function defineJob<TPayload extends JobPayload, TOutput = unknown>(
  definition: JobDefinition<TPayload, TOutput>,
): JobDefinition<TPayload, TOutput> {
  jobRegistry.register(definition);
  return definition;
}
