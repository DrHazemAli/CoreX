/**
 * ============================================================================
 * COREX: Job Dispatcher
 * Description: Dispatch jobs to queues (Laravel-like dispatch API)
 *
 * USAGE:
 *   // Dispatch immediately
 *   await dispatch('email:send', { to: 'user@example.com' });
 *
 *   // Dispatch with delay
 *   await dispatch('email:send', payload, { delay: 60 }); // 60 seconds
 *
 *   // Dispatch to specific queue
 *   await dispatch('email:send', payload, { queue: 'emails' });
 *
 *   // Dispatch sync (process immediately, no queue)
 *   await dispatchSync('email:send', payload);
 * ============================================================================
 */

import "server-only";
import { v4 as uuidv4 } from "uuid";
import type {
  JobPayload,
  SerializedJob,
  DispatchOptions,
  JobResult,
  JobContext,
} from "./types";
import { JOB_DEFAULTS, JOB_PRIORITY_VALUES, jobFailed } from "./types";
import { jobRegistry } from "./registry";
import { getQueueDriver } from "./drivers";
import { logger } from "@/lib/logger";
import { isJobsEnabled } from "./config";

// ============================================================================
// DISPATCHER
// ============================================================================

/**
 * Dispatch a job to the queue
 *
 * @param name - Job name (must be registered)
 * @param payload - Job payload data
 * @param options - Dispatch options
 * @returns Job ID
 */
export async function dispatch<TPayload extends JobPayload>(
  name: string,
  payload: TPayload,
  options: DispatchOptions = {},
): Promise<string> {
  // Check if jobs are enabled
  if (!isJobsEnabled()) {
    logger.warn(`Jobs disabled, skipping dispatch of "${name}"`);
    return "jobs-disabled";
  }

  // Get job definition
  const definition = jobRegistry.get<TPayload>(name);
  if (!definition) {
    throw new Error(`Job "${name}" is not registered`);
  }

  // Get queue driver
  const driver = getQueueDriver();

  // Handle unique key deduplication
  if (options.uniqueKey && driver.hasUniqueKey) {
    const exists = await driver.hasUniqueKey(options.uniqueKey);
    if (exists) {
      logger.debug(
        `Skipping duplicate job "${name}" with key: ${options.uniqueKey}`,
      );
      return "duplicate";
    }
  }

  // Calculate available time
  const now = new Date();
  let availableAt: Date;

  if (options.availableAt) {
    availableAt = options.availableAt;
  } else if (options.delay) {
    availableAt = new Date(now.getTime() + options.delay * 1000);
  } else {
    availableAt = now;
  }

  // Determine priority
  const priority =
    options.priority ?? definition.priority ?? JOB_DEFAULTS.priority;
  // eslint-disable-next-line security/detect-object-injection -- priority is typed JobPriority union
  const priorityValue = JOB_PRIORITY_VALUES[priority];

  // Create serialized job
  const job: SerializedJob<TPayload> = {
    id: uuidv4(),
    name,
    payload,
    queue: options.queue ?? definition.queue ?? JOB_DEFAULTS.queue,
    priority: priorityValue,
    attempts: 0,
    maxAttempts:
      options.maxAttempts ?? definition.maxAttempts ?? JOB_DEFAULTS.maxAttempts,
    createdAt: now.toISOString(),
    availableAt: availableAt.toISOString(),
    reservedAt: null,
    failedAt: null,
    completedAt: null,
    error: null,
    metadata: options.metadata ?? {},
  };

  // Push to queue
  await driver.push(job);

  // Set unique key if provided
  if (options.uniqueKey && driver.setUniqueKey) {
    // TTL of 24 hours for unique key
    await driver.setUniqueKey(options.uniqueKey, job.id, 86400);
  }

  logger.info(`Dispatched job "${name}"`, {
    jobId: job.id,
    queue: job.queue,
    availableAt: job.availableAt,
  });

  return job.id;
}

/**
 * Dispatch a job synchronously (process immediately, no queue)
 *
 * @param name - Job name
 * @param payload - Job payload
 * @returns Job result
 */
export async function dispatchSync<
  TPayload extends JobPayload,
  TOutput = unknown,
>(name: string, payload: TPayload): Promise<JobResult<TOutput>> {
  // Get job definition
  const definition = jobRegistry.get<TPayload, TOutput>(name);
  if (!definition) {
    return jobFailed(`Job "${name}" is not registered`);
  }

  // Create context
  const jobId = uuidv4();
  const context: JobContext = {
    jobId,
    attempt: 1,
    maxAttempts: 1,
    metadata: {},
    log: (level, message) => {
      // eslint-disable-next-line security/detect-object-injection -- level is typed "debug" | "info" | "warn" | "error"
      logger[level](`[${name}:${jobId}] ${message}`);
    },
  };

  logger.debug(`Processing sync job "${name}"`, { jobId });

  try {
    // Execute handler directly
    const result = await definition.handle(payload, context);

    if (result.success) {
      logger.debug(`Sync job "${name}" completed`, { jobId });
    } else {
      logger.warn(`Sync job "${name}" failed`, { jobId, error: result.error });
    }

    return result as JobResult<TOutput>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Sync job "${name}" threw exception`, {
      jobId,
      error: message,
    });
    return jobFailed(message);
  }
}

/**
 * Dispatch a job and process it after the response is sent
 * (Works with Next.js response streaming)
 *
 * @param name - Job name
 * @param payload - Job payload
 */
export function dispatchAfterResponse<TPayload extends JobPayload>(
  name: string,
  payload: TPayload,
): void {
  // Use setImmediate/nextTick to process after response
  setImmediate(async () => {
    try {
      await dispatchSync(name, payload);
    } catch (error) {
      logger.error(`After-response job "${name}" failed`, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

/**
 * Dispatch multiple jobs in a batch
 *
 * @param jobs - Array of job dispatch configurations
 * @returns Array of job IDs
 */
export async function dispatchBatch<TPayload extends JobPayload>(
  jobs: Array<{
    name: string;
    payload: TPayload;
    options?: DispatchOptions;
  }>,
): Promise<string[]> {
  const ids: string[] = [];

  for (const job of jobs) {
    const id = await dispatch(job.name, job.payload, job.options);
    ids.push(id);
  }

  return ids;
}

/**
 * Chain multiple jobs (each runs after the previous completes)
 *
 * @param jobs - Array of job configurations to run in sequence
 * @returns ID of the first job
 */
export async function chain<TPayload extends JobPayload>(
  jobs: Array<{
    name: string;
    payload: TPayload;
    options?: DispatchOptions;
  }>,
): Promise<string> {
  if (jobs.length === 0) {
    throw new Error("Cannot create chain with no jobs");
  }

  // For now, dispatch all jobs with sequential delays
  // A more sophisticated implementation would use parent-child relationships
  const baseDelay = 0;
  const delayIncrement = 1; // 1 second between jobs

  let firstId = "";
  const totalJobs = jobs.length;

  for (const [index, job] of jobs.entries()) {
    const delay = baseDelay + index * delayIncrement;

    const id = await dispatch(job.name, job.payload, {
      ...job.options,
      delay,
      metadata: {
        ...job.options?.metadata,
        chainIndex: index,
        chainLength: totalJobs,
      },
    });

    if (index === 0) {
      firstId = id;
    }
  }

  return firstId;
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * Get the current size of a queue
 */
export async function queueSize(
  queue: string = JOB_DEFAULTS.queue,
): Promise<number> {
  if (!isJobsEnabled()) {
    return 0;
  }

  const driver = getQueueDriver();
  return driver.size(queue);
}

/**
 * Clear all jobs from a queue
 */
export async function clearQueue(
  queue: string = JOB_DEFAULTS.queue,
): Promise<void> {
  if (!isJobsEnabled()) {
    return;
  }

  const driver = getQueueDriver();
  await driver.clear(queue);
  logger.info(`Cleared queue: ${queue}`);
}

/**
 * Get a job by ID
 */
export async function getJob(jobId: string): Promise<SerializedJob | null> {
  if (!isJobsEnabled()) {
    return null;
  }

  const driver = getQueueDriver();
  return driver.get(jobId);
}

/**
 * Delete a job by ID
 */
export async function deleteJob(jobId: string): Promise<void> {
  if (!isJobsEnabled()) {
    return;
  }

  const driver = getQueueDriver();
  await driver.delete(jobId);
}
