/**
 * Jobs Repository - Data Access Layer for Job Queue Operations
 *
 * This module provides a clean abstraction over the job queue database operations.
 * It implements the Repository pattern to separate database queries from business logic.
 *
 * @module dal/jobs.repo
 * @requires @/lib/supabase/server - Supabase server client
 * @see src/server/jobs/types.ts - Job type definitions
 *
 * USAGE:
 * ```typescript
 * import { JobsRepository } from '@/dal';
 *
 * // Push a job to the queue
 * const jobId = await JobsRepository.push('default', {
 *   type: 'send-email',
 *   payload: { to: 'user@example.com' }
 * });
 *
 * // Pop the next job for processing
 * const job = await JobsRepository.pop('default');
 * ```
 *
 * ARCHITECTURE NOTES:
 * - All database queries are centralized here for maintainability
 * - Uses Supabase admin client for elevated privileges
 * - Implements atomic operations for job state transitions
 * - Supports distributed locking via database-level locking
 */

import { getAdminClient } from "./db";
import type {
  Job,
  JobData,
  JobId,
  JobStatus,
  QueueName,
} from "@/server/jobs/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Database row representation of a job
 * Maps to the 'jobs' table in the database
 */
interface JobRow {
  /** Unique job identifier (UUID) */
  id: string;
  /** Queue name for job routing */
  queue: string;
  /** Job type identifier (e.g., 'send-email', 'process-repo') */
  type: string;
  /** Job payload as JSON */
  payload: Record<string, unknown>;
  /** Current job status */
  status: JobStatus;
  /** Number of execution attempts */
  attempts: number;
  /** Maximum allowed attempts */
  max_attempts: number;
  /** Worker currently processing this job */
  locked_by: string | null;
  /** When the lock expires */
  locked_until: string | null;
  /** Priority (higher = more important) */
  priority: number;
  /** Earliest time to process */
  available_at: string;
  /** When job was reserved for processing */
  reserved_at: string | null;
  /** When job completed or failed */
  completed_at: string | null;
  /** Error message if job failed */
  error: string | null;
  /** Job creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Options for pushing a new job
 */
interface PushJobOptions {
  /** Job priority (default: 0) */
  priority?: number;
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Delay before processing in seconds */
  delaySeconds?: number;
}

/**
 * Options for popping a job from the queue
 */
interface PopJobOptions {
  /** Worker identifier for distributed locking */
  workerId?: string;
  /** Lock duration in seconds (default: 300 = 5 minutes) */
  lockDurationSeconds?: number;
}

/**
 * Result of a bulk job query
 */
interface JobsQueryResult {
  /** Array of jobs */
  jobs: Job[];
  /** Total count (for pagination) */
  total: number;
  /** Error message if operation failed */
  error?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert a database row to a Job object
 * Handles type conversions and date parsing
 *
 * @param row - Database row from the jobs table
 * @returns Typed Job object
 */
function rowToJob(row: JobRow): Job {
  return {
    id: row.id as JobId,
    type: row.type,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    priority: row.priority,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    // Optional fields - only include if present
    ...(row.available_at && { availableAt: new Date(row.available_at) }),
    ...(row.reserved_at && { reservedAt: new Date(row.reserved_at) }),
    ...(row.completed_at && { completedAt: new Date(row.completed_at) }),
    ...(row.error && { error: row.error }),
    ...(row.locked_by && { lockedBy: row.locked_by }),
    ...(row.locked_until && { lockedUntil: new Date(row.locked_until) }),
  };
}

/**
 * Get the Supabase admin client for database operations
 * Centralizes client creation for consistent error handling
 *
 * @throws Error if Supabase is not configured
 * @returns Supabase admin client
 */
async function getClient() {
  const client = await getAdminClient();
  if (!client) {
    throw new Error(
      "Supabase client not available - check DATABASE_URL configuration",
    );
  }
  return client;
}

// ============================================================================
// JOBS REPOSITORY
// ============================================================================

/**
 * Jobs Repository - Centralized database operations for job queue
 *
 * This class provides static methods for all job-related database operations.
 * It abstracts away the SQL queries and provides a clean TypeScript interface.
 *
 * Design decisions:
 * - Static methods for simplicity (no instance state needed)
 * - Atomic operations using database transactions where needed
 * - Consistent error handling with null returns for not found
 * - Full typing for all inputs and outputs
 */
export class JobsRepository {
  // ==========================================================================
  // CREATE OPERATIONS
  // ==========================================================================

  /**
   * Push a new job to the queue
   *
   * Creates a new job record with the specified type, payload, and options.
   * The job will be available for processing immediately unless delayed.
   *
   * @param queue - Queue name for job routing
   * @param jobData - Job type and payload
   * @param options - Optional configuration (priority, maxAttempts, delay)
   * @returns The created job ID or null on failure
   *
   * @example
   * ```typescript
   * const jobId = await JobsRepository.push('default', {
   *   type: 'send-email',
   *   payload: { to: 'user@example.com', subject: 'Hello' }
   * }, { priority: 10, maxAttempts: 5 });
   * ```
   */
  static async push(
    queue: QueueName,
    jobData: JobData,
    options: PushJobOptions = {},
  ): Promise<JobId | null> {
    const client = await getClient();

    // Calculate available_at for delayed jobs
    const availableAt = options.delaySeconds
      ? new Date(Date.now() + options.delaySeconds * 1000).toISOString()
      : new Date().toISOString();

    const { data, error } = await client
      .from("jobs")
      .insert({
        queue,
        type: jobData.type,
        payload: jobData.payload,
        status: "pending" as JobStatus,
        priority: options.priority ?? 0,
        max_attempts: options.maxAttempts ?? 3,
        available_at: availableAt,
        attempts: 0,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[JobsRepository] Failed to push job:", error.message);
      return null;
    }

    return data.id as JobId;
  }

  /**
   * Push multiple jobs to the queue in a single operation
   *
   * Efficient batch insert for bulk job creation.
   *
   * @param queue - Queue name for job routing
   * @param jobs - Array of job data with optional per-job options
   * @returns Array of created job IDs (may be shorter if some failed)
   */
  static async pushBatch(
    queue: QueueName,
    jobs: Array<{ data: JobData; options?: PushJobOptions }>,
  ): Promise<JobId[]> {
    const client = await getClient();

    const rows = jobs.map(({ data, options = {} }) => ({
      queue,
      type: data.type,
      payload: data.payload,
      status: "pending" as JobStatus,
      priority: options.priority ?? 0,
      max_attempts: options.maxAttempts ?? 3,
      available_at: options.delaySeconds
        ? new Date(Date.now() + options.delaySeconds * 1000).toISOString()
        : new Date().toISOString(),
      attempts: 0,
    }));

    const { data, error } = await client.from("jobs").insert(rows).select("id");

    if (error) {
      console.error("[JobsRepository] Failed to push batch:", error.message);
      return [];
    }

    return (data || []).map((row) => row.id as JobId);
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Pop the next available job from the queue
   *
   * Atomically retrieves and locks the next job for processing.
   * Uses database-level locking to prevent race conditions in distributed systems.
   *
   * The job is marked as 'processing' and locked to the worker.
   * If processing fails, call release() to make it available again.
   *
   * @param queue - Queue name to pop from
   * @param options - Worker ID and lock duration
   * @returns The next available job or null if queue is empty
   *
   * @example
   * ```typescript
   * const job = await JobsRepository.pop('default', {
   *   workerId: 'worker-1',
   *   lockDurationSeconds: 300
   * });
   * if (job) {
   *   try {
   *     await processJob(job);
   *     await JobsRepository.complete(job.id);
   *   } catch (error) {
   *     await JobsRepository.fail(job.id, error.message);
   *   }
   * }
   * ```
   */
  static async pop(
    queue: QueueName,
    options: PopJobOptions = {},
  ): Promise<Job | null> {
    const client = await getClient();
    const workerId = options.workerId ?? "default-worker";
    const lockDuration = options.lockDurationSeconds ?? 300; // 5 minutes default

    const now = new Date().toISOString();
    const lockedUntil = new Date(
      Date.now() + lockDuration * 1000,
    ).toISOString();

    // Atomic pop using UPDATE ... RETURNING
    // This query:
    // 1. Finds the next available job (pending, available, not locked)
    // 2. Locks it to this worker
    // 3. Returns the job data
    // Uses LIMIT 1 and ORDER BY for FIFO with priority
    const { data, error } = await client.rpc("pop_job", {
      p_queue: queue,
      p_worker_id: workerId,
      p_locked_until: lockedUntil,
      p_now: now,
    });

    // If RPC doesn't exist, fall back to manual query
    if (error?.code === "42883") {
      // Function does not exist
      return this.popFallback(queue, workerId, lockedUntil, now);
    }

    if (error || !data || data.length === 0) {
      if (error) {
        console.error("[JobsRepository] Failed to pop job:", error.message);
      }
      return null;
    }

    return rowToJob(data[0] as JobRow);
  }

  /**
   * Fallback pop implementation when RPC is not available
   * Less atomic but works without custom functions
   *
   * @internal
   */
  private static async popFallback(
    queue: QueueName,
    workerId: string,
    lockedUntil: string,
    now: string,
  ): Promise<Job | null> {
    const client = await getClient();

    // Find the next available job
    const { data: jobs, error: findError } = await client
      .from("jobs")
      .select("*")
      .eq("queue", queue)
      .eq("status", "pending")
      .lte("available_at", now)
      .or(`locked_until.is.null,locked_until.lt.${now}`)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);

    if (findError || !jobs || jobs.length === 0) {
      return null;
    }

    const job = jobs[0] as JobRow;

    // Try to lock it (may fail if another worker got it first)
    const { data: updated, error: updateError } = await client
      .from("jobs")
      .update({
        status: "processing" as JobStatus,
        locked_by: workerId,
        locked_until: lockedUntil,
        reserved_at: now,
        attempts: job.attempts + 1,
        updated_at: now,
      })
      .eq("id", job.id)
      .eq("status", "pending") // Ensure still pending (optimistic lock)
      .select()
      .single();

    if (updateError || !updated) {
      // Another worker got it, try again
      return null;
    }

    return rowToJob(updated as JobRow);
  }

  /**
   * Get a job by its ID
   *
   * @param jobId - The job identifier
   * @returns The job or null if not found
   */
  static async getById(jobId: JobId): Promise<Job | null> {
    const client = await getClient();

    const { data, error } = await client
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !data) {
      return null;
    }

    return rowToJob(data as JobRow);
  }

  /**
   * Get jobs by status with pagination
   *
   * @param queue - Queue name to query
   * @param status - Job status filter
   * @param limit - Maximum results (default: 50)
   * @param offset - Pagination offset (default: 0)
   * @returns Jobs array and total count
   */
  static async getByStatus(
    queue: QueueName,
    status: JobStatus,
    limit: number = 50,
    offset: number = 0,
  ): Promise<JobsQueryResult> {
    const client = await getClient();

    // Get count
    const { count, error: countError } = await client
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("queue", queue)
      .eq("status", status);

    if (countError) {
      return { jobs: [], total: 0, error: countError.message };
    }

    // Get jobs
    const { data, error } = await client
      .from("jobs")
      .select("*")
      .eq("queue", queue)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { jobs: [], total: 0, error: error.message };
    }

    return {
      jobs: (data || []).map((row) => rowToJob(row as JobRow)),
      total: count ?? 0,
    };
  }

  /**
   * Get queue statistics
   *
   * Returns counts of jobs by status for monitoring and dashboards.
   *
   * @param queue - Queue name to query
   * @returns Object with counts by status
   */
  static async getStats(queue: QueueName): Promise<Record<JobStatus, number>> {
    const client = await getClient();

    const statuses: JobStatus[] = [
      "pending",
      "processing",
      "completed",
      "failed",
      "retrying",
    ];
    const stats: Record<JobStatus, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      retrying: 0,
    };

    for (const status of statuses) {
      const { count, error } = await client
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("queue", queue)
        .eq("status", status);

      if (!error) {
        // eslint-disable-next-line security/detect-object-injection -- status is typed JobStatus union
        stats[status] = count ?? 0;
      }
    }

    return stats;
  }

  // ==========================================================================
  // UPDATE OPERATIONS
  // ==========================================================================

  /**
   * Mark a job as completed
   *
   * Called after successful job processing.
   * Sets status to 'completed' and records completion time.
   *
   * @param jobId - The job identifier
   * @param result - Optional result data to store
   * @returns True if successful, false otherwise
   */
  static async complete(
    jobId: JobId,
    result?: Record<string, unknown>,
  ): Promise<boolean> {
    const client = await getClient();

    const { error } = await client
      .from("jobs")
      .update({
        status: "completed" as JobStatus,
        completed_at: new Date().toISOString(),
        locked_by: null,
        locked_until: null,
        updated_at: new Date().toISOString(),
        ...(result && { payload: { ...result, _completed: true } }),
      })
      .eq("id", jobId);

    if (error) {
      console.error("[JobsRepository] Failed to complete job:", error.message);
      return false;
    }

    return true;
  }

  /**
   * Mark a job as failed
   *
   * Called when job processing fails.
   * Records the error and determines if job should be retried.
   *
   * @param jobId - The job identifier
   * @param errorMessage - Error description
   * @param shouldRetry - Whether to retry (default: check max attempts)
   * @returns True if successful, false otherwise
   */
  static async fail(
    jobId: JobId,
    errorMessage: string,
    shouldRetry?: boolean,
  ): Promise<boolean> {
    const client = await getClient();

    // Get current job state to check attempts
    const job = await this.getById(jobId);
    if (!job) {
      return false;
    }

    const canRetry = shouldRetry ?? job.attempts < job.maxAttempts;
    const newStatus: JobStatus = canRetry ? "pending" : "failed";

    const { error } = await client
      .from("jobs")
      .update({
        status: newStatus,
        error: errorMessage,
        locked_by: null,
        locked_until: null,
        // If retrying, make available after exponential backoff
        ...(canRetry && {
          available_at: new Date(
            Date.now() + Math.pow(2, job.attempts) * 1000,
          ).toISOString(),
        }),
        ...(!canRetry && { completed_at: new Date().toISOString() }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      console.error("[JobsRepository] Failed to fail job:", error.message);
      return false;
    }

    return true;
  }

  /**
   * Release a job back to the queue
   *
   * Called when a worker cannot complete a job but it should be retried.
   * Releases the lock and makes the job available again.
   *
   * @param jobId - The job identifier
   * @param delaySeconds - Delay before making available (default: 0)
   * @returns True if successful, false otherwise
   */
  static async release(
    jobId: JobId,
    delaySeconds: number = 0,
  ): Promise<boolean> {
    const client = await getClient();

    const availableAt = delaySeconds
      ? new Date(Date.now() + delaySeconds * 1000).toISOString()
      : new Date().toISOString();

    const { error } = await client
      .from("jobs")
      .update({
        status: "pending" as JobStatus,
        locked_by: null,
        locked_until: null,
        reserved_at: null,
        available_at: availableAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      console.error("[JobsRepository] Failed to release job:", error.message);
      return false;
    }

    return true;
  }

  // ==========================================================================
  // DELETE OPERATIONS
  // ==========================================================================

  /**
   * Delete a job by ID
   *
   * Permanently removes a job from the queue.
   * Use with caution - consider marking as failed instead for audit trail.
   *
   * @param jobId - The job identifier
   * @returns True if deleted, false otherwise
   */
  static async delete(jobId: JobId): Promise<boolean> {
    const client = await getClient();

    const { error } = await client.from("jobs").delete().eq("id", jobId);

    if (error) {
      console.error("[JobsRepository] Failed to delete job:", error.message);
      return false;
    }

    return true;
  }

  /**
   * Clean up old completed/failed jobs
   *
   * Removes jobs older than the specified age.
   * Useful for preventing table bloat.
   *
   * @param queue - Queue name to clean
   * @param olderThanDays - Remove jobs older than this (default: 7)
   * @returns Number of jobs deleted
   */
  static async cleanup(
    queue: QueueName,
    olderThanDays: number = 7,
  ): Promise<number> {
    const client = await getClient();

    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await client
      .from("jobs")
      .delete()
      .eq("queue", queue)
      .in("status", ["completed", "failed"])
      .lt("completed_at", cutoffDate)
      .select("id");

    if (error) {
      console.error("[JobsRepository] Failed to cleanup jobs:", error.message);
      return 0;
    }

    return data?.length ?? 0;
  }

  /**
   * Recover stale jobs
   *
   * Finds jobs that are stuck in 'processing' state with expired locks.
   * Releases them back to the queue for retry.
   *
   * @param queue - Queue name to recover
   * @returns Number of jobs recovered
   */
  static async recoverStale(queue: QueueName): Promise<number> {
    const client = await getClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from("jobs")
      .update({
        status: "pending" as JobStatus,
        locked_by: null,
        locked_until: null,
        updated_at: now,
      })
      .eq("queue", queue)
      .eq("status", "processing")
      .lt("locked_until", now)
      .select("id");

    if (error) {
      console.error(
        "[JobsRepository] Failed to recover stale jobs:",
        error.message,
      );
      return 0;
    }

    return data?.length ?? 0;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default JobsRepository;
