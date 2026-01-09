/**
 * ============================================================================
 * COREX: Internal Sync API Schema
 * Description: Schema for internal sync/batch operations
 * ============================================================================
 */

import { z } from "zod";

// ============================================================================
// POST /api/internal/sync - Request Body
// ============================================================================

/**
 * Request body for triggering a sync operation
 */
export const syncRequestSchema = z.object({
  /** Type of sync operation */
  type: z.enum(["full", "incremental", "selective"]),
  /** Optional: specific resource IDs to sync */
  resourceIds: z.array(z.string().uuid()).optional(),
  /** Force sync even if recently synced */
  force: z.boolean().default(false),
  /** Dry run mode - report what would be synced without making changes */
  dryRun: z.boolean().default(false),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;

// ============================================================================
// POST /api/internal/sync - Response
// ============================================================================

/**
 * Response schema for sync operation
 */
export const syncResponseSchema = z.object({
  success: z.literal(true),
  jobId: z.string().uuid(),
  type: z.enum(["full", "incremental", "selective"]),
  status: z.enum(["queued", "processing", "completed"]),
  stats: z.object({
    itemsQueued: z.number(),
    estimatedDurationMs: z.number(),
  }),
  startedAt: z.string().datetime(),
});

export type SyncResponse = z.infer<typeof syncResponseSchema>;

// ============================================================================
// GET /api/internal/sync/:jobId - Response
// ============================================================================

/**
 * Response schema for sync job status
 */
export const syncStatusResponseSchema = z.object({
  jobId: z.string().uuid(),
  type: z.enum(["full", "incremental", "selective"]),
  status: z.enum(["queued", "processing", "completed", "failed"]),
  progress: z.object({
    processed: z.number(),
    total: z.number(),
    percentage: z.number(),
  }),
  stats: z
    .object({
      created: z.number(),
      updated: z.number(),
      skipped: z.number(),
      errors: z.number(),
    })
    .optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  error: z.string().nullable(),
});

export type SyncStatusResponse = z.infer<typeof syncStatusResponseSchema>;
