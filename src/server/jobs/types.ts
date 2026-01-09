/**
 * ============================================================================
 * COREX: Job System Types
 * Description: Core types for the Laravel-inspired job queue system
 *
 * ARCHITECTURE OVERVIEW:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                           Job System                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  ┌─────────────┐  dispatch()  ┌─────────────┐  process()  ┌──────────┐ │
 * │  │   Client    │ ──────────── │    Queue    │ ──────────► │  Worker  │ │
 * │  │ (Producer)  │              │   Driver    │             │(Consumer)│ │
 * │  └─────────────┘              └─────────────┘             └──────────┘ │
 * │         │                            │                          │      │
 * │         │                            │                          │      │
 * │         └────────────────────────────┼──────────────────────────┘      │
 * │                                      │                                  │
 * │                               ┌──────┴──────┐                          │
 * │                               │  JobStore   │                          │
 * │                               │  (State)    │                          │
 * │                               └─────────────┘                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * DISTRIBUTED SUPPORT:
 * - Jobs are uniquely identified by UUID
 * - Optimistic locking prevents double-processing
 * - Failed jobs are retried with exponential backoff
 * - Dead letter queue for jobs that exceed max attempts
 * ============================================================================
 */

// ============================================================================
// BRANDED TYPES
// ============================================================================

/**
 * Branded type for Job IDs (UUID strings)
 */
export type JobId = string & { readonly __brand: "JobId" };

/**
 * Branded type for Queue names
 */
export type QueueName = string & { readonly __brand: "QueueName" };

// ============================================================================
// JOB STATUS & PRIORITIES
// ============================================================================

/**
 * Job lifecycle states (Laravel-compatible)
 */
export type JobStatus =
  | "pending" // Waiting to be processed
  | "processing" // Currently being processed by a worker
  | "completed" // Successfully processed
  | "failed" // Failed after all retry attempts
  | "retrying"; // Failed but will be retried

/**
 * Job priority levels (higher number = higher priority)
 */
export type JobPriority = "low" | "default" | "high" | "critical";

export const JOB_PRIORITY_VALUES: Record<JobPriority, number> = {
  low: 0,
  default: 10,
  high: 20,
  critical: 30,
} as const;

// ============================================================================
// JOB PAYLOAD
// ============================================================================

/**
 * Base constraint for job payloads
 * Must be JSON-serializable
 */
export type JobPayload = Record<string, unknown>;

/**
 * Serialized job representation (what's stored in the queue)
 */
export interface SerializedJob<TPayload extends JobPayload = JobPayload> {
  id: string;
  name: string;
  payload: TPayload;
  queue: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  availableAt: string;
  reservedAt: string | null;
  failedAt: string | null;
  completedAt: string | null;
  error: string | null;
  metadata: JobMetadata;
}

/**
 * Job metadata for tracking and debugging
 */
export interface JobMetadata {
  /**
   * Correlation ID for distributed tracing
   */
  correlationId?: string;

  /**
   * User ID who triggered the job (if applicable)
   */
  userId?: string;

  /**
   * Tags for filtering and grouping jobs
   */
  tags?: string[];

  /**
   * Custom metadata
   */
  [key: string]: unknown;
}

// ============================================================================
// JOB RESULT
// ============================================================================

/**
 * Result returned by a job handler
 */
export interface JobResult<TOutput = unknown> {
  /**
   * Whether the job succeeded
   */
  success: boolean;

  /**
   * Output data from the job
   */
  output?: TOutput;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Additional context
   */
  context?: Record<string, unknown>;
}

/**
 * Create a successful job result
 */
export function jobSuccess<TOutput>(output?: TOutput): JobResult<TOutput> {
  return { success: true, output };
}

/**
 * Create a failed job result
 */
export function jobFailed(
  error: string,
  context?: Record<string, unknown>,
): JobResult<never> {
  return { success: false, error, context };
}

// ============================================================================
// JOB HANDLER INTERFACE
// ============================================================================

/**
 * Context passed to job handlers
 */
export interface JobContext {
  /**
   * Job ID
   */
  jobId: string;

  /**
   * Current attempt number (1-indexed)
   */
  attempt: number;

  /**
   * Maximum attempts allowed
   */
  maxAttempts: number;

  /**
   * Job metadata
   */
  metadata: JobMetadata;

  /**
   * Log a message with job context
   */
  log: (level: "debug" | "info" | "warn" | "error", message: string) => void;

  /**
   * Abort signal for cancellation
   */
  signal?: AbortSignal;
}

/**
 * Job handler function signature
 */
export type JobHandler<
  TPayload extends JobPayload = JobPayload,
  TOutput = unknown,
> = (payload: TPayload, context: JobContext) => Promise<JobResult<TOutput>>;

// ============================================================================
// JOB DEFINITION
// ============================================================================

/**
 * Job definition configuration
 */
export interface JobDefinition<
  TPayload extends JobPayload = JobPayload,
  TOutput = unknown,
> {
  /**
   * Unique job name (should be namespaced, e.g., "email:send", "sync:repos")
   */
  name: string;

  /**
   * Job handler function
   */
  handle: JobHandler<TPayload, TOutput>;

  /**
   * Default queue for this job type
   */
  queue?: string;

  /**
   * Maximum number of retry attempts
   */
  maxAttempts?: number;

  /**
   * Backoff strategy for retries
   */
  backoff?: BackoffStrategy;

  /**
   * Job timeout in milliseconds
   */
  timeout?: number;

  /**
   * Priority level
   */
  priority?: JobPriority;

  /**
   * Middleware to apply to this job
   */
  middleware?: JobMiddleware[];

  /**
   * Called when job fails permanently (after all retries)
   */
  onFailed?: (
    payload: TPayload,
    error: Error,
    context: JobContext,
  ) => Promise<void>;
}

// ============================================================================
// BACKOFF STRATEGIES
// ============================================================================

export type BackoffType = "linear" | "exponential" | "fixed";

export interface BackoffStrategy {
  /**
   * Type of backoff
   */
  type: BackoffType;

  /**
   * Base delay in milliseconds
   */
  delay: number;

  /**
   * Maximum delay (for exponential backoff)
   */
  maxDelay?: number;
}

/**
 * Calculate delay for next retry attempt
 */
export function calculateBackoff(
  strategy: BackoffStrategy,
  attempt: number,
): number {
  switch (strategy.type) {
    case "fixed":
      return strategy.delay;

    case "linear":
      return strategy.delay * attempt;

    case "exponential": {
      const delay = strategy.delay * Math.pow(2, attempt - 1);
      return Math.min(delay, strategy.maxDelay ?? delay);
    }

    default:
      return strategy.delay;
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware context for job processing
 */
export interface MiddlewareContext<TPayload extends JobPayload = JobPayload> {
  job: SerializedJob<TPayload>;
  context: JobContext;
}

/**
 * Next function for middleware chain
 */
export type MiddlewareNext<TOutput = unknown> = () => Promise<
  JobResult<TOutput>
>;

/**
 * Job middleware signature (Laravel-compatible)
 */
export type JobMiddleware<
  TPayload extends JobPayload = JobPayload,
  TOutput = unknown,
> = (
  ctx: MiddlewareContext<TPayload>,
  next: MiddlewareNext<TOutput>,
) => Promise<JobResult<TOutput>>;

// ============================================================================
// DISPATCH OPTIONS
// ============================================================================

/**
 * Options when dispatching a job
 */
export interface DispatchOptions {
  /**
   * Queue to dispatch to (overrides job default)
   */
  queue?: string;

  /**
   * Priority (overrides job default)
   */
  priority?: JobPriority;

  /**
   * Delay before job becomes available (in seconds)
   */
  delay?: number;

  /**
   * Dispatch at a specific time
   */
  availableAt?: Date;

  /**
   * Maximum attempts (overrides job default)
   */
  maxAttempts?: number;

  /**
   * Job metadata
   */
  metadata?: JobMetadata;

  /**
   * Unique job key for deduplication
   * If a job with this key is already pending, dispatch will be skipped
   */
  uniqueKey?: string;
}

// ============================================================================
// QUEUE DRIVER INTERFACE
// ============================================================================

/**
 * Queue driver interface (adapter pattern)
 * Implementations: MemoryQueueDriver, DatabaseQueueDriver, RedisQueueDriver
 */
export interface QueueDriver {
  /**
   * Push a job to the queue
   */
  push(job: SerializedJob): Promise<void>;

  /**
   * Pop the next available job from the queue
   * Should implement atomic reservation to prevent double-processing
   */
  pop(queue: string): Promise<SerializedJob | null>;

  /**
   * Mark a job as completed
   */
  complete(jobId: string): Promise<void>;

  /**
   * Mark a job as failed
   */
  fail(jobId: string, error: string): Promise<void>;

  /**
   * Release a job back to the queue (for retry)
   */
  release(jobId: string, delay: number): Promise<void>;

  /**
   * Get job by ID
   */
  get(jobId: string): Promise<SerializedJob | null>;

  /**
   * Delete a job
   */
  delete(jobId: string): Promise<void>;

  /**
   * Get queue size
   */
  size(queue: string): Promise<number>;

  /**
   * Clear all jobs from a queue
   */
  clear(queue: string): Promise<void>;

  /**
   * Check if a unique key exists (for deduplication)
   */
  hasUniqueKey?(key: string): Promise<boolean>;

  /**
   * Set unique key with TTL
   */
  setUniqueKey?(key: string, jobId: string, ttlSeconds: number): Promise<void>;

  /**
   * Remove unique key
   */
  removeUniqueKey?(key: string): Promise<void>;
}

// ============================================================================
// WORKER OPTIONS
// ============================================================================

/**
 * Worker configuration options
 */
export interface WorkerOptions {
  /**
   * Queues to process (in priority order)
   */
  queues?: string[];

  /**
   * Number of concurrent jobs
   */
  concurrency?: number;

  /**
   * Polling interval in milliseconds (for pull-based drivers)
   */
  pollInterval?: number;

  /**
   * Maximum jobs to process before exiting (0 = unlimited)
   */
  maxJobs?: number;

  /**
   * Maximum time to run in milliseconds (0 = unlimited)
   */
  maxRuntime?: number;

  /**
   * Graceful shutdown timeout in milliseconds
   */
  shutdownTimeout?: number;
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Job event types
 */
export type JobEventType =
  | "job:dispatched"
  | "job:started"
  | "job:completed"
  | "job:failed"
  | "job:retrying";

/**
 * Job event payload
 */
export interface JobEvent {
  type: JobEventType;
  job: SerializedJob;
  timestamp: Date;
  error?: string;
  duration?: number;
}

/**
 * Job event listener
 */
export type JobEventListener = (event: JobEvent) => void | Promise<void>;

// ============================================================================
// DEFAULTS
// ============================================================================

export const JOB_DEFAULTS = {
  queue: "default",
  maxAttempts: 3,
  timeout: 60_000, // 1 minute
  priority: "default" as JobPriority,
  backoff: {
    type: "exponential" as BackoffType,
    delay: 1000, // 1 second base
    maxDelay: 60_000, // 1 minute max
  },
} as const;

// ============================================================================
// REPOSITORY TYPES
// ============================================================================

/**
 * Job data for creating a new job
 */
export interface JobData {
  /** Job type identifier (e.g., 'send-email', 'process-repo') */
  type: string;
  /** Job payload data */
  payload: Record<string, unknown>;
}

/**
 * Full Job entity as stored in the database
 */
export interface Job {
  id: JobId;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  availableAt?: Date;
  reservedAt?: Date;
  completedAt?: Date;
  error?: string;
  lockedBy?: string;
  lockedUntil?: Date;
}
