/**
 * ============================================================================
 * COREX: Job Worker
 * Description: Process jobs from queues (pull-based worker)
 *
 * USAGE:
 *   // Run worker for default queue
 *   const worker = new JobWorker();
 *   await worker.start();
 *
 *   // Run worker for specific queues
 *   const worker = new JobWorker({
 *     queues: ['high', 'default', 'low'],
 *     concurrency: 3,
 *   });
 *   await worker.start();
 *
 *   // Graceful shutdown
 *   await worker.stop();
 *
 * FOR SERVERLESS (Next.js API routes):
 *   // Process batch of jobs in single request
 *   const result = await processJobBatch({
 *     queues: ['default'],
 *     maxJobs: 100,
 *     maxRuntime: 55000, // Leave 5s for response
 *   });
 * ============================================================================
 */

import "server-only";
import type {
  WorkerOptions,
  SerializedJob,
  JobResult,
  JobContext,
  JobPayload,
  MiddlewareContext,
  MiddlewareNext,
  JobMiddleware,
} from "./types";
import { JOB_DEFAULTS, calculateBackoff, jobFailed } from "./types";
import { jobRegistry } from "./registry";
import { getQueueDriver } from "./drivers";
import { getJobConfig, isJobsEnabled } from "./config";
import { logger } from "@/lib/logger";

// ============================================================================
// WORKER CLASS
// ============================================================================

/**
 * Job worker for continuous processing
 */
export class JobWorker {
  private options: Required<WorkerOptions>;
  private running = false;
  private processing = 0;
  private jobsProcessed = 0;
  private startTime = 0;
  private abortController: AbortController | null = null;

  constructor(options: WorkerOptions = {}) {
    const config = getJobConfig();

    this.options = {
      queues: options.queues ?? [config.defaultQueue],
      concurrency: options.concurrency ?? config.worker.concurrency,
      pollInterval: options.pollInterval ?? config.worker.pollInterval,
      maxJobs: options.maxJobs ?? 0,
      maxRuntime: options.maxRuntime ?? 0,
      shutdownTimeout: options.shutdownTimeout ?? config.worker.shutdownTimeout,
    };
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn("Worker is already running");
      return;
    }

    if (!isJobsEnabled()) {
      logger.warn("Jobs are disabled, worker will not start");
      return;
    }

    this.running = true;
    this.startTime = Date.now();
    this.abortController = new AbortController();

    logger.info("Starting job worker", {
      queues: this.options.queues,
      concurrency: this.options.concurrency,
    });

    // Start polling loop
    await this.pollLoop();
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info("Stopping job worker...");
    this.running = false;
    this.abortController?.abort();

    // Wait for in-progress jobs to complete
    const deadline = Date.now() + this.options.shutdownTimeout;
    while (this.processing > 0 && Date.now() < deadline) {
      await this.sleep(100);
    }

    if (this.processing > 0) {
      logger.warn(
        `Worker stopped with ${this.processing} jobs still processing`,
      );
    } else {
      logger.info("Worker stopped gracefully");
    }
  }

  /**
   * Main polling loop
   */
  private async pollLoop(): Promise<void> {
    while (this.running && !this.shouldStop()) {
      // Fill up to concurrency limit
      while (this.processing < this.options.concurrency && this.running) {
        const job = await this.fetchJob();
        if (!job) {
          break; // No more jobs available
        }

        // Process job in background
        this.processJob(job).catch((error) => {
          logger.error("Job processing error", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
        });
      }

      // Wait before next poll
      if (this.running) {
        await this.sleep(this.options.pollInterval);
      }
    }

    this.running = false;
  }

  /**
   * Check if worker should stop
   */
  private shouldStop(): boolean {
    if (
      this.options.maxJobs > 0 &&
      this.jobsProcessed >= this.options.maxJobs
    ) {
      return true;
    }

    if (this.options.maxRuntime > 0) {
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.options.maxRuntime) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fetch next job from queues
   */
  private async fetchJob(): Promise<SerializedJob | null> {
    const driver = getQueueDriver();

    // Try each queue in priority order
    for (const queue of this.options.queues) {
      const job = await driver.pop(queue);
      if (job) {
        return job;
      }
    }

    return null;
  }

  /**
   * Process a single job
   */
  private async processJob(job: SerializedJob): Promise<void> {
    this.processing++;

    try {
      const result = await executeJob(job, this.abortController?.signal);
      const driver = getQueueDriver();

      if (result.success) {
        await driver.complete(job.id);
        this.jobsProcessed++;
        return;
      }

      // Handle failure
      await this.handleJobFailure(job, result, driver);
    } finally {
      this.processing--;
    }
  }

  /**
   * Handle job failure - retry or mark as failed
   */
  private async handleJobFailure(
    job: SerializedJob,
    result: JobResult,
    driver: ReturnType<typeof getQueueDriver>,
  ): Promise<void> {
    const errorMessage = result.error ?? "Unknown error";

    if (job.attempts < job.maxAttempts) {
      // Retry with backoff
      const definition = jobRegistry.get(job.name);
      const backoff = definition?.backoff ?? JOB_DEFAULTS.backoff;
      const delay = calculateBackoff(backoff, job.attempts);
      await driver.release(job.id, delay);
      return;
    }

    // Permanent failure
    await driver.fail(job.id, errorMessage);
    this.jobsProcessed++;
    await this.invokeOnFailedCallback(job, errorMessage);
  }

  /**
   * Invoke onFailed callback if defined
   */
  private async invokeOnFailedCallback(
    job: SerializedJob,
    errorMessage: string,
  ): Promise<void> {
    const definition = jobRegistry.get(job.name);
    if (!definition?.onFailed) return;

    try {
      await definition.onFailed(
        job.payload,
        new Error(errorMessage),
        createJobContext(job),
      );
    } catch (error) {
      logger.error("onFailed callback error", {
        jobId: job.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get worker stats
   */
  getStats(): WorkerStats {
    return {
      running: this.running,
      processing: this.processing,
      jobsProcessed: this.jobsProcessed,
      uptime: this.running ? Date.now() - this.startTime : 0,
    };
  }
}

export interface WorkerStats {
  running: boolean;
  processing: number;
  jobsProcessed: number;
  uptime: number;
}

// ============================================================================
// JOB EXECUTION
// ============================================================================

/**
 * Create job context for handler
 */
function createJobContext(
  job: SerializedJob,
  signal?: AbortSignal,
): JobContext {
  return {
    jobId: job.id,
    attempt: job.attempts,
    maxAttempts: job.maxAttempts,
    metadata: job.metadata,
    log: (level, message) => {
      // eslint-disable-next-line security/detect-object-injection -- level is typed "debug" | "info" | "warn" | "error"
      logger[level](`[${job.name}:${job.id}] ${message}`);
    },
    signal,
  };
}

/**
 * Execute a job with middleware
 */
async function executeJob(
  job: SerializedJob,
  signal?: AbortSignal,
): Promise<JobResult> {
  const definition = jobRegistry.get(job.name);

  if (!definition) {
    logger.error(`No handler registered for job: ${job.name}`);
    return jobFailed(`No handler registered for job: ${job.name}`);
  }

  const context = createJobContext(job, signal);
  const startTime = Date.now();

  logger.debug(`Processing job: ${job.name}`, {
    jobId: job.id,
    attempt: job.attempts,
    queue: job.queue,
  });

  try {
    // Get middleware chain
    const middleware = jobRegistry.getMiddleware(job.name);

    // Build execution chain
    const handler = async (): Promise<JobResult> => {
      return definition.handle(job.payload, context);
    };

    // Execute with middleware
    const result = await executeWithMiddleware(
      { job, context },
      middleware,
      handler,
    );

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info(`Job completed: ${job.name}`, {
        jobId: job.id,
        duration,
      });
    } else {
      logger.warn(`Job failed: ${job.name}`, {
        jobId: job.id,
        duration,
        error: result.error,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";

    logger.error(`Job threw exception: ${job.name}`, {
      jobId: job.id,
      duration,
      error: message,
    });

    return jobFailed(message);
  }
}

/**
 * Execute handler with middleware chain
 */
async function executeWithMiddleware<TPayload extends JobPayload>(
  ctx: MiddlewareContext<TPayload>,
  middleware: JobMiddleware[],
  handler: () => Promise<JobResult>,
): Promise<JobResult> {
  // Build chain from right to left
  let next: MiddlewareNext = handler;

  for (let i = middleware.length - 1; i >= 0; i--) {
    // eslint-disable-next-line security/detect-object-injection -- i is a controlled loop index
    const currentMiddleware = middleware[i];
    const currentNext = next;
    next = () =>
      currentMiddleware(ctx as MiddlewareContext<JobPayload>, currentNext);
  }

  return next();
}

// ============================================================================
// BATCH PROCESSING (For Serverless)
// ============================================================================

export interface BatchProcessOptions {
  /**
   * Queues to process
   */
  queues?: string[];

  /**
   * Maximum jobs to process
   */
  maxJobs?: number;

  /**
   * Maximum runtime in milliseconds
   */
  maxRuntime?: number;
}

export interface BatchProcessResult {
  /**
   * Total jobs processed
   */
  processed: number;

  /**
   * Jobs completed successfully
   */
  completed: number;

  /**
   * Jobs failed
   */
  failed: number;

  /**
   * Total duration in milliseconds
   */
  duration: number;
}

/**
 * Process a batch of jobs (for serverless/HTTP workers)
 *
 * This is designed for use in API routes where you need to
 * process jobs within a request timeout.
 */
export async function processJobBatch(
  options: BatchProcessOptions = {},
): Promise<BatchProcessResult> {
  const config = getJobConfig();
  const queues = options.queues ?? [config.defaultQueue];
  const maxJobs = options.maxJobs ?? 100;
  const maxRuntime = options.maxRuntime ?? 55000; // 55 seconds default

  const startTime = Date.now();
  const result: BatchProcessResult = {
    processed: 0,
    completed: 0,
    failed: 0,
    duration: 0,
  };

  if (!isJobsEnabled()) {
    logger.warn("Jobs are disabled");
    return result;
  }

  const driver = getQueueDriver();

  while (result.processed < maxJobs) {
    // Check timeout
    if (Date.now() - startTime >= maxRuntime) break;

    // Fetch next job from any queue
    const job = await fetchNextJobFromQueues(driver, queues);
    if (!job) break;

    // Process and record result
    await processAndRecordBatchJob(job, driver, result);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Fetch next available job from queues in priority order
 */
async function fetchNextJobFromQueues(
  driver: ReturnType<typeof getQueueDriver>,
  queues: string[],
): Promise<SerializedJob | null> {
  for (const queue of queues) {
    const job = await driver.pop(queue);
    if (job) return job;
  }
  return null;
}

/**
 * Process a job and record the result in batch stats
 */
async function processAndRecordBatchJob(
  job: SerializedJob,
  driver: ReturnType<typeof getQueueDriver>,
  result: BatchProcessResult,
): Promise<void> {
  const jobResult = await executeJob(job);
  result.processed++;

  if (jobResult.success) {
    await driver.complete(job.id);
    result.completed++;
    return;
  }

  // Handle failure
  if (job.attempts < job.maxAttempts) {
    const definition = jobRegistry.get(job.name);
    const backoff = definition?.backoff ?? JOB_DEFAULTS.backoff;
    const delay = calculateBackoff(backoff, job.attempts);
    await driver.release(job.id, delay);
  } else {
    await driver.fail(job.id, jobResult.error ?? "Unknown error");
    result.failed++;
  }
}
