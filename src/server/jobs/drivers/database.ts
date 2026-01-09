/**
 * ============================================================================
 * COREX: Database Queue Driver
 * Description: Supabase/PostgreSQL-based queue driver for distributed workers
 *
 * This driver uses the database as a message queue, supporting:
 * - Distributed workers across multiple servers
 * - Persistent jobs that survive restarts
 * - Atomic job reservation with FOR UPDATE SKIP LOCKED
 * - Automatic retry with backoff
 *
 * REQUIREMENTS:
 * - Supabase database with jobs table (see migration)
 * - NEXT_PUBLIC_ENABLE_DATABASE=1
 *
 * DATABASE SCHEMA (see migrations):
 * CREATE TABLE jobs (
 *   id UUID PRIMARY KEY,
 *   name VARCHAR(255) NOT NULL,
 *   payload JSONB NOT NULL,
 *   queue VARCHAR(100) NOT NULL DEFAULT 'default',
 *   priority INTEGER NOT NULL DEFAULT 10,
 *   attempts INTEGER NOT NULL DEFAULT 0,
 *   max_attempts INTEGER NOT NULL DEFAULT 3,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   reserved_at TIMESTAMPTZ,
 *   failed_at TIMESTAMPTZ,
 *   completed_at TIMESTAMPTZ,
 *   error TEXT,
 *   metadata JSONB DEFAULT '{}'
 * );
 * ============================================================================
 */

import "server-only";
import type {
  QueueDriver,
  SerializedJob,
  JobMetadata,
  JobPayload,
} from "../types";
import { isDatabaseEnabled } from "@/lib/config/features";
import { logger } from "@/lib/logger";

// ============================================================================
// DATABASE QUEUE DRIVER
// ============================================================================

export class DatabaseQueueDriver implements QueueDriver {
  private tableName: string;

  constructor(tableName: string = "jobs") {
    this.tableName = tableName;
  }

  /**
   * Get Supabase client lazily
   * Uses admin client for job operations (bypasses RLS)
   */
  private async getClient() {
    if (!isDatabaseEnabled()) {
      throw new Error(
        "Database is not enabled. Set NEXT_PUBLIC_ENABLE_DATABASE=1",
      );
    }

    // Dynamic import to avoid loading Supabase when not needed
    // Use admin client for job queue operations
    const { getAdminClient } = await import("@/dal");
    return getAdminClient();
  }

  /**
   * Push a job to the queue
   */
  async push(job: SerializedJob): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase.from(this.tableName).insert({
      id: job.id,
      name: job.name,
      payload: job.payload,
      queue: job.queue,
      priority: job.priority,
      attempts: job.attempts,
      max_attempts: job.maxAttempts,
      created_at: job.createdAt,
      available_at: job.availableAt,
      reserved_at: job.reservedAt,
      failed_at: job.failedAt,
      completed_at: job.completedAt,
      error: job.error,
      metadata: job.metadata,
    });

    if (error) {
      logger.error(`[DatabaseQueue] Failed to push job: ${error.message}`);
      throw new Error(`Failed to push job: ${error.message}`);
    }

    logger.debug(`[DatabaseQueue] Pushed job ${job.id} to queue ${job.queue}`);
  }

  /**
   * Pop the next available job from the queue
   * Uses FOR UPDATE SKIP LOCKED for atomic reservation
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    const supabase = await this.getClient();

    // Use RPC function for atomic pop with FOR UPDATE SKIP LOCKED
    const { data, error } = await supabase.rpc("pop_job", {
      p_queue: queue,
    });

    if (error) {
      // PGRST116 = No rows returned (which is not an error for us)
      if (error.code === "PGRST116") {
        return null;
      }
      logger.error(`[DatabaseQueue] Failed to pop job: ${error.message}`);
      return null;
    }

    if (!data) {
      return null;
    }

    const job = this.toSerializedJob(data);
    logger.debug(`[DatabaseQueue] Popped job ${job.id} from queue ${queue}`);
    return job;
  }

  /**
   * Mark a job as completed
   */
  async complete(jobId: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        completed_at: new Date().toISOString(),
        reserved_at: null,
      })
      .eq("id", jobId);

    if (error) {
      logger.error(`[DatabaseQueue] Failed to complete job: ${error.message}`);
      throw new Error(`Failed to complete job: ${error.message}`);
    }

    logger.debug(`[DatabaseQueue] Completed job ${jobId}`);
  }

  /**
   * Mark a job as failed
   */
  async fail(jobId: string, errorMessage: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        failed_at: new Date().toISOString(),
        error: errorMessage,
        reserved_at: null,
      })
      .eq("id", jobId);

    if (error) {
      logger.error(
        `[DatabaseQueue] Failed to mark job as failed: ${error.message}`,
      );
      throw new Error(`Failed to mark job as failed: ${error.message}`);
    }

    logger.debug(`[DatabaseQueue] Failed job ${jobId}`);
  }

  /**
   * Release a job back to the queue for retry
   */
  async release(jobId: string, delay: number): Promise<void> {
    const supabase = await this.getClient();

    const availableAt = new Date(Date.now() + delay).toISOString();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        reserved_at: null,
        available_at: availableAt,
      })
      .eq("id", jobId);

    if (error) {
      logger.error(`[DatabaseQueue] Failed to release job: ${error.message}`);
      throw new Error(`Failed to release job: ${error.message}`);
    }

    logger.debug(`[DatabaseQueue] Released job ${jobId} with delay ${delay}ms`);
  }

  /**
   * Get job by ID
   */
  async get(jobId: string): Promise<SerializedJob | null> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      logger.error(`[DatabaseQueue] Failed to get job: ${error.message}`);
      return null;
    }

    return this.toSerializedJob(data);
  }

  /**
   * Delete a job
   */
  async delete(jobId: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq("id", jobId);

    if (error) {
      logger.error(`[DatabaseQueue] Failed to delete job: ${error.message}`);
      throw new Error(`Failed to delete job: ${error.message}`);
    }

    logger.debug(`[DatabaseQueue] Deleted job ${jobId}`);
  }

  /**
   * Get queue size
   */
  async size(queue: string): Promise<number> {
    const supabase = await this.getClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select("*", { count: "exact", head: true })
      .eq("queue", queue)
      .is("completed_at", null)
      .is("failed_at", null);

    if (error) {
      logger.error(
        `[DatabaseQueue] Failed to get queue size: ${error.message}`,
      );
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Clear all jobs from a queue
   */
  async clear(queue: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq("queue", queue);

    if (error) {
      logger.error(`[DatabaseQueue] Failed to clear queue: ${error.message}`);
      throw new Error(`Failed to clear queue: ${error.message}`);
    }

    logger.debug(`[DatabaseQueue] Cleared queue ${queue}`);
  }

  /**
   * Check if unique key exists
   */
  async hasUniqueKey(key: string): Promise<boolean> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from("job_unique_keys")
      .select("job_id")
      .eq("key", key)
      .gt("expires_at", new Date().toISOString())
      .single();

    return !error && !!data;
  }

  /**
   * Set unique key
   */
  async setUniqueKey(
    key: string,
    jobId: string,
    ttlSeconds: number,
  ): Promise<void> {
    const supabase = await this.getClient();

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const { error } = await supabase.from("job_unique_keys").upsert({
      key,
      job_id: jobId,
      expires_at: expiresAt,
    });

    if (error) {
      logger.error(
        `[DatabaseQueue] Failed to set unique key: ${error.message}`,
      );
    }
  }

  /**
   * Remove unique key
   */
  async removeUniqueKey(key: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase
      .from("job_unique_keys")
      .delete()
      .eq("key", key);

    if (error) {
      logger.error(
        `[DatabaseQueue] Failed to remove unique key: ${error.message}`,
      );
    }
  }

  /**
   * Convert database row to SerializedJob
   */
  private toSerializedJob(row: Record<string, unknown>): SerializedJob {
    return {
      id: row.id as string,
      name: row.name as string,
      payload: row.payload as JobPayload,
      queue: row.queue as string,
      priority: row.priority as number,
      attempts: row.attempts as number,
      maxAttempts: row.max_attempts as number,
      createdAt: row.created_at as string,
      availableAt: row.available_at as string,
      reservedAt: row.reserved_at as string | null,
      failedAt: row.failed_at as string | null,
      completedAt: row.completed_at as string | null,
      error: row.error as string | null,
      metadata: (row.metadata as JobMetadata) ?? {},
    };
  }

  /**
   * Get failed jobs (for retry/inspection)
   */
  async getFailedJobs(
    queue?: string,
    limit: number = 100,
  ): Promise<SerializedJob[]> {
    const supabase = await this.getClient();

    let query = supabase
      .from(this.tableName)
      .select("*")
      .not("failed_at", "is", null)
      .order("failed_at", { ascending: false })
      .limit(limit);

    if (queue) {
      query = query.eq("queue", queue);
    }

    const { data, error } = await query;

    if (error) {
      logger.error(
        `[DatabaseQueue] Failed to get failed jobs: ${error.message}`,
      );
      return [];
    }

    return (data ?? []).map((row: Record<string, unknown>) =>
      this.toSerializedJob(row),
    );
  }

  /**
   * Retry a failed job
   */
  async retry(jobId: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        failed_at: null,
        error: null,
        available_at: new Date().toISOString(),
        attempts: 0, // Reset attempts
      })
      .eq("id", jobId);

    if (error) {
      logger.error(`[DatabaseQueue] Failed to retry job: ${error.message}`);
      throw new Error(`Failed to retry job: ${error.message}`);
    }

    logger.debug(`[DatabaseQueue] Retried job ${jobId}`);
  }
}
