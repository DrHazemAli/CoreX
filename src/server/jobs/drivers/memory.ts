/**
 * ============================================================================
 * COREX: Memory Queue Driver
 * Description: In-memory queue driver for development and testing
 *
 * NOTE: This driver is NOT suitable for production as:
 * - Jobs are lost on process restart
 * - Does not support distributed workers
 * - Limited by process memory
 *
 * Use for: Local development, testing, single-process deployments
 * ============================================================================
 */

import "server-only";
import type { QueueDriver, SerializedJob } from "../types";
import { logger } from "@/lib/logger";

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

interface JobStorage {
  jobs: Map<string, SerializedJob>;
  queues: Map<string, Set<string>>; // queue -> job ids
  uniqueKeys: Map<string, { jobId: string; expiresAt: number }>;
}

const storage: JobStorage = {
  jobs: new Map(),
  queues: new Map(),
  uniqueKeys: new Map(),
};

// ============================================================================
// MEMORY QUEUE DRIVER
// ============================================================================

export class MemoryQueueDriver implements QueueDriver {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start cleanup interval for expired unique keys
    this.startCleanup();
  }

  private startCleanup(): void {
    // Clean up expired unique keys every 60 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of storage.uniqueKeys.entries()) {
        if (value.expiresAt < now) {
          storage.uniqueKeys.delete(key);
        }
      }
    }, 60_000);

    // Prevent interval from keeping process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Push a job to the queue
   */
  async push(job: SerializedJob): Promise<void> {
    storage.jobs.set(job.id, job);

    // Add to queue index
    let queueJobs = storage.queues.get(job.queue);
    if (!queueJobs) {
      queueJobs = new Set();
      storage.queues.set(job.queue, queueJobs);
    }
    queueJobs.add(job.id);

    logger.debug(`[MemoryQueue] Pushed job ${job.id} to queue ${job.queue}`);
  }

  /**
   * Pop the next available job from the queue
   * Implements atomic reservation
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    const queueJobs = storage.queues.get(queue);
    if (!queueJobs || queueJobs.size === 0) {
      return null;
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Find the highest priority job that is available
    let selectedJob: SerializedJob | null = null;
    let selectedId: string | null = null;

    for (const jobId of queueJobs) {
      const job = storage.jobs.get(jobId);
      if (!job) {
        queueJobs.delete(jobId);
        continue;
      }

      // Skip if not yet available
      if (job.availableAt > nowIso) {
        continue;
      }

      // Skip if already reserved
      if (job.reservedAt) {
        continue;
      }

      // Skip if completed or failed
      if (job.completedAt || job.failedAt) {
        continue;
      }

      // Select highest priority job
      if (!selectedJob || job.priority > selectedJob.priority) {
        selectedJob = job;
        selectedId = jobId;
      }
    }

    if (!selectedJob || !selectedId) {
      return null;
    }

    // Reserve the job (atomic in single process)
    selectedJob.reservedAt = nowIso;
    selectedJob.attempts += 1;

    logger.debug(`[MemoryQueue] Popped job ${selectedId} from queue ${queue}`);

    return selectedJob;
  }

  /**
   * Mark a job as completed
   */
  async complete(jobId: string): Promise<void> {
    const job = storage.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.completedAt = new Date().toISOString();
    job.reservedAt = null;

    // Remove from queue
    const queueJobs = storage.queues.get(job.queue);
    if (queueJobs) {
      queueJobs.delete(jobId);
    }

    logger.debug(`[MemoryQueue] Completed job ${jobId}`);
  }

  /**
   * Mark a job as failed
   */
  async fail(jobId: string, error: string): Promise<void> {
    const job = storage.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.failedAt = new Date().toISOString();
    job.error = error;
    job.reservedAt = null;

    // Remove from queue
    const queueJobs = storage.queues.get(job.queue);
    if (queueJobs) {
      queueJobs.delete(jobId);
    }

    logger.debug(`[MemoryQueue] Failed job ${jobId}: ${error}`);
  }

  /**
   * Release a job back to the queue for retry
   */
  async release(jobId: string, delay: number): Promise<void> {
    const job = storage.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.reservedAt = null;
    job.availableAt = new Date(Date.now() + delay).toISOString();

    logger.debug(`[MemoryQueue] Released job ${jobId} with delay ${delay}ms`);
  }

  /**
   * Get job by ID
   */
  async get(jobId: string): Promise<SerializedJob | null> {
    return storage.jobs.get(jobId) ?? null;
  }

  /**
   * Delete a job
   */
  async delete(jobId: string): Promise<void> {
    const job = storage.jobs.get(jobId);
    if (job) {
      const queueJobs = storage.queues.get(job.queue);
      if (queueJobs) {
        queueJobs.delete(jobId);
      }
    }
    storage.jobs.delete(jobId);

    logger.debug(`[MemoryQueue] Deleted job ${jobId}`);
  }

  /**
   * Get queue size
   */
  async size(queue: string): Promise<number> {
    const queueJobs = storage.queues.get(queue);
    if (!queueJobs) {
      return 0;
    }

    // Count only pending jobs
    let count = 0;
    for (const jobId of queueJobs) {
      const job = storage.jobs.get(jobId);
      if (job && !job.completedAt && !job.failedAt) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all jobs from a queue
   */
  async clear(queue: string): Promise<void> {
    const queueJobs = storage.queues.get(queue);
    if (queueJobs) {
      for (const jobId of queueJobs) {
        storage.jobs.delete(jobId);
      }
      queueJobs.clear();
    }

    logger.debug(`[MemoryQueue] Cleared queue ${queue}`);
  }

  /**
   * Check if unique key exists
   */
  async hasUniqueKey(key: string): Promise<boolean> {
    const entry = storage.uniqueKeys.get(key);
    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      storage.uniqueKeys.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Set unique key
   */
  async setUniqueKey(
    key: string,
    jobId: string,
    ttlSeconds: number,
  ): Promise<void> {
    storage.uniqueKeys.set(key, {
      jobId,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Remove unique key
   */
  async removeUniqueKey(key: string): Promise<void> {
    storage.uniqueKeys.delete(key);
  }

  /**
   * Get all jobs (for debugging/testing)
   */
  getAllJobs(): SerializedJob[] {
    return Array.from(storage.jobs.values());
  }

  /**
   * Get jobs by queue (for debugging/testing)
   */
  getJobsByQueue(queue: string): SerializedJob[] {
    const queueJobs = storage.queues.get(queue);
    if (!queueJobs) {
      return [];
    }

    const jobs: SerializedJob[] = [];
    for (const jobId of queueJobs) {
      const job = storage.jobs.get(jobId);
      if (job) {
        jobs.push(job);
      }
    }
    return jobs;
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    storage.jobs.clear();
    storage.queues.clear();
    storage.uniqueKeys.clear();
  }

  /**
   * Stop cleanup interval
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
