/**
 * ============================================================================
 * COREX: Job Queue System
 * Description: Laravel-inspired job queue for background processing
 *
 * FEATURES:
 * ✓ Optional via feature flag (NEXT_PUBLIC_ENABLE_JOBS)
 * ✓ Multiple queue drivers (memory, database, sync)
 * ✓ Distributed worker support
 * ✓ Job middleware (timeout, retry, rate limit, etc.)
 * ✓ Priority queues
 * ✓ Delayed/scheduled jobs
 * ✓ Job batching and chaining
 * ✓ Automatic retries with backoff
 * ✓ Dead letter queue for failed jobs
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         Job Queue System                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  dispatch() ──► QueueDriver ──► Worker ──► JobHandler                  │
 * │                    │                           │                        │
 * │              ┌─────┴─────┐               ┌─────┴─────┐                  │
 * │              │  Memory   │               │ Middleware │                  │
 * │              │  Database │               │  Pipeline  │                  │
 * │              │  (Redis)  │               └───────────┘                  │
 * │              └───────────┘                                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * QUICK START:
 *
 * 1. Enable jobs in .env:
 *    NEXT_PUBLIC_ENABLE_JOBS=1
 *
 * 2. Define a job:
 *    import { defineJob, jobSuccess } from '@/server/jobs';
 *
 *    defineJob({
 *      name: 'email:send',
 *      async handle(payload, ctx) {
 *        await sendEmail(payload);
 *        return jobSuccess();
 *      },
 *    });
 *
 * 3. Dispatch a job:
 *    import { dispatch } from '@/server/jobs';
 *
 *    await dispatch('email:send', { to: 'user@example.com' });
 *
 * 4. Run worker (via API route or standalone):
 *    await processJobBatch({ maxJobs: 100 });
 *
 * @see docs/ARCHITECTURE.md for detailed documentation
 * ============================================================================
 */

// ============================================================================
// CORE EXPORTS
// ============================================================================

// Configuration & Feature Flag
export { isJobsEnabled, getJobConfig, QUEUES, type QueueName } from "./config";

// Types
export {
  // Status & Priority
  type JobStatus,
  type JobPriority,
  JOB_PRIORITY_VALUES,
  JOB_DEFAULTS,

  // Payload & Serialization
  type JobPayload,
  type SerializedJob,
  type JobMetadata,

  // Results
  type JobResult,
  jobSuccess,
  jobFailed,

  // Handler & Context
  type JobHandler,
  type JobContext,
  type JobDefinition,

  // Backoff
  type BackoffType,
  type BackoffStrategy,
  calculateBackoff,

  // Middleware
  type JobMiddleware,
  type MiddlewareContext,
  type MiddlewareNext,

  // Dispatch Options
  type DispatchOptions,

  // Queue Driver Interface
  type QueueDriver,

  // Worker Options
  type WorkerOptions,

  // Events
  type JobEventType,
  type JobEvent,
  type JobEventListener,
} from "./types";

// ============================================================================
// REGISTRY
// ============================================================================

export { jobRegistry, defineJob } from "./registry";

// ============================================================================
// DISPATCHER
// ============================================================================

export {
  dispatch,
  dispatchSync,
  dispatchAfterResponse,
  dispatchBatch,
  chain,
  queueSize,
  clearQueue,
  getJob,
  deleteJob,
} from "./dispatcher";

// ============================================================================
// WORKER
// ============================================================================

export {
  JobWorker,
  processJobBatch,
  type WorkerStats,
  type BatchProcessOptions,
  type BatchProcessResult,
} from "./worker";

// ============================================================================
// MIDDLEWARE
// ============================================================================

export {
  withTimeout,
  withRetry,
  withoutOverlapping,
  rateLimited,
  throttleExceptions,
  skip,
  withLogging,
  type RetryOptions,
  type RateLimitOptions,
  type ThrottleExceptionsOptions,
} from "./middleware";

// ============================================================================
// DRIVERS
// ============================================================================

export {
  getQueueDriver,
  createQueueDriver,
  setQueueDriver,
  resetQueueDriver,
  getConfiguredDriverType,
  type QueueDriverType,
  MemoryQueueDriver,
  DatabaseQueueDriver,
} from "./drivers";

// ============================================================================
// SCHEMAS (for API validation)
// ============================================================================

export {
  // Base schemas
  jobStatusSchema,
  jobPrioritySchema,
  backoffTypeSchema,
  backoffStrategySchema,
  jobMetadataSchema,
  jobPayloadSchema,
  serializedJobSchema,
  dispatchOptionsSchema,
  workerOptionsSchema,

  // API schemas
  dispatchJobRequestSchema,
  dispatchJobResponseSchema,
  jobStatusResponseSchema,
  listJobsRequestSchema,
  listJobsResponseSchema,
  runWorkerRequestSchema,
  runWorkerResponseSchema,

  // Schema types
  type SerializedJobSchema,
  type DispatchOptionsSchema,
  type WorkerOptionsSchema,
  type DispatchJobRequest,
  type DispatchJobResponse,
  type JobStatusResponse,
  type ListJobsRequest,
  type ListJobsResponse,
  type RunWorkerRequest,
  type RunWorkerResponse,
} from "./schemas";
