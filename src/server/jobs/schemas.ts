/**
 * ============================================================================
 * COREX: Job Schemas
 * Description: Zod schemas for job system validation
 * ============================================================================
 */

import { z } from "zod";
import type { JobStatus, JobPriority, BackoffType } from "./types";

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/**
 * Job status schema
 */
export const jobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "retrying",
]) satisfies z.ZodType<JobStatus>;

/**
 * Job priority schema
 */
export const jobPrioritySchema = z.enum([
  "low",
  "default",
  "high",
  "critical",
]) satisfies z.ZodType<JobPriority>;

/**
 * Backoff type schema
 */
export const backoffTypeSchema = z.enum([
  "linear",
  "exponential",
  "fixed",
]) satisfies z.ZodType<BackoffType>;

/**
 * Backoff strategy schema
 */
export const backoffStrategySchema = z.object({
  type: backoffTypeSchema,
  delay: z.number().int().positive().max(3600_000), // Max 1 hour
  maxDelay: z.number().int().positive().max(86400_000).optional(), // Max 24 hours
});

/**
 * Job metadata schema
 */
export const jobMetadataSchema = z
  .object({
    correlationId: z.string().uuid().optional(),
    userId: z.string().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  })
  .passthrough();

/**
 * Job payload schema (base - allows any JSON-serializable data)
 */
export const jobPayloadSchema = z.record(z.string(), z.unknown());

// ============================================================================
// SERIALIZED JOB SCHEMA
// ============================================================================

/**
 * Full serialized job schema for storage
 */
export const serializedJobSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  payload: jobPayloadSchema,
  queue: z.string().min(1).max(100),
  priority: z.number().int().min(0).max(100),
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive().max(100),
  createdAt: z.string().datetime(),
  availableAt: z.string().datetime(),
  reservedAt: z.string().datetime().nullable(),
  failedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  error: z.string().nullable(),
  metadata: jobMetadataSchema,
});

export type SerializedJobSchema = z.infer<typeof serializedJobSchema>;

// ============================================================================
// DISPATCH OPTIONS SCHEMA
// ============================================================================

/**
 * Dispatch options schema for API validation
 */
export const dispatchOptionsSchema = z.object({
  queue: z.string().min(1).max(100).optional(),
  priority: jobPrioritySchema.optional(),
  delay: z
    .number()
    .int()
    .nonnegative()
    .max(86400 * 7)
    .optional(), // Max 7 days
  availableAt: z.coerce.date().optional(),
  maxAttempts: z.number().int().positive().max(100).optional(),
  metadata: jobMetadataSchema.optional(),
  uniqueKey: z.string().max(255).optional(),
});

export type DispatchOptionsSchema = z.infer<typeof dispatchOptionsSchema>;

// ============================================================================
// WORKER OPTIONS SCHEMA
// ============================================================================

/**
 * Worker configuration schema
 */
export const workerOptionsSchema = z.object({
  queues: z.array(z.string().min(1).max(100)).optional(),
  concurrency: z.number().int().positive().max(100).default(1),
  pollInterval: z.number().int().positive().max(60_000).default(1000),
  maxJobs: z.number().int().nonnegative().default(0),
  maxRuntime: z.number().int().nonnegative().default(0),
  shutdownTimeout: z.number().int().positive().max(300_000).default(30_000),
});

export type WorkerOptionsSchema = z.infer<typeof workerOptionsSchema>;

// ============================================================================
// API SCHEMAS
// ============================================================================

/**
 * Dispatch job request schema
 */
export const dispatchJobRequestSchema = z.object({
  name: z.string().min(1).max(255),
  payload: jobPayloadSchema,
  options: dispatchOptionsSchema.optional(),
});

export type DispatchJobRequest = z.infer<typeof dispatchJobRequestSchema>;

/**
 * Dispatch job response schema
 */
export const dispatchJobResponseSchema = z.object({
  success: z.boolean(),
  jobId: z.string().uuid(),
  queue: z.string(),
  availableAt: z.string().datetime(),
});

export type DispatchJobResponse = z.infer<typeof dispatchJobResponseSchema>;

/**
 * Get job status response schema
 */
export const jobStatusResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: jobStatusSchema,
  queue: z.string(),
  attempts: z.number(),
  maxAttempts: z.number(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  failedAt: z.string().datetime().nullable(),
  error: z.string().nullable(),
});

export type JobStatusResponse = z.infer<typeof jobStatusResponseSchema>;

/**
 * List jobs request schema
 */
export const listJobsRequestSchema = z.object({
  queue: z.string().min(1).max(100).optional(),
  status: jobStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type ListJobsRequest = z.infer<typeof listJobsRequestSchema>;

/**
 * List jobs response schema
 */
export const listJobsResponseSchema = z.object({
  jobs: z.array(jobStatusResponseSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export type ListJobsResponse = z.infer<typeof listJobsResponseSchema>;

/**
 * Run worker request schema (for HTTP-based workers)
 */
export const runWorkerRequestSchema = z.object({
  queues: z.array(z.string().min(1).max(100)).min(1).optional(),
  maxJobs: z.number().int().positive().max(1000).default(100),
  maxRuntime: z.number().int().positive().max(300_000).default(55_000), // 55 seconds for serverless
});

export type RunWorkerRequest = z.infer<typeof runWorkerRequestSchema>;

/**
 * Run worker response schema
 */
export const runWorkerResponseSchema = z.object({
  processed: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  duration: z.number().nonnegative(),
});

export type RunWorkerResponse = z.infer<typeof runWorkerResponseSchema>;
