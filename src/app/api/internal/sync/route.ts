/**
 * ============================================================================
 * COREX: Internal Sync API Route
 * Description: Template demonstrating internal/protected API routes
 *
 * INTERNAL ROUTES vs PUBLIC ROUTES:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Internal Routes (/api/internal/*)                                       │
 * │ - Protected by x-internal-secret header                                 │
 * │ - Called by cron jobs, schedulers, or trusted services                  │
 * │ - Used for background processing, admin operations, batch jobs          │
 * │ - Never exposed to end users                                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Public Routes (/api/v1/*)                                               │
 * │ - Protected by rate limiting                                            │
 * │ - May require authentication (JWT, session)                             │
 * │ - Exposed to end users and third-party integrations                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @example Usage (from cron job or scheduler):
 *   POST /api/internal/sync
 *   Headers: x-internal-secret: <INTERNAL_API_SECRET>
 *   Body: { "type": "incremental" }
 * ============================================================================
 */

import { type NextRequest } from "next/server";
import { verifyInternalSecret } from "@/server/auth/internal";
import {
  createRequestContext,
  jsonResponse,
  unauthorized,
  badRequest,
  internalError,
  validationError,
} from "@/server/http/responses";
import { logger } from "@/lib/logger";

// Import schemas from centralized location
import {
  syncRequestSchema,
  type SyncResponse,
} from "@/schemas/api/internal/sync";

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/internal/sync
 *
 * Trigger a sync operation. This is an internal endpoint that should only
 * be called by trusted services (cron jobs, schedulers, admin tools).
 *
 * Security:
 * - Requires x-internal-secret header matching INTERNAL_API_SECRET env var
 * - Should only be accessible from trusted networks
 *
 * Use cases:
 * - Scheduled data synchronization
 * - Manual admin-triggered syncs
 * - Batch processing operations
 *
 * @header x-internal-secret - Internal API secret for authentication
 *
 * @body type - Type of sync: "full", "incremental", or "selective"
 * @body resourceIds - Optional array of specific resource IDs to sync
 * @body force - Force sync even if recently synced
 * @body dryRun - Report what would be synced without making changes
 *
 * @returns {SyncResponse} Job information and initial stats
 *
 * @example
 * ```bash
 * curl -X POST "http://localhost:3000/api/internal/sync" \
 *   -H "Content-Type: application/json" \
 *   -H "x-internal-secret: your-secret-here" \
 *   -d '{"type": "incremental"}'
 * ```
 */
export async function POST(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  // Verify internal authentication
  const authResult = verifyInternalSecret(request);
  if (!authResult.authenticated) {
    logger.warn("Unauthorized internal API access attempt", {
      requestId: ctx.requestId,
      ip: ctx.ip,
      path: ctx.path,
      error: authResult.error,
    });
    return unauthorized(
      authResult.error ?? "Invalid or missing internal secret",
      ctx,
    );
  }

  try {
    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body", ctx);
    }

    const validation = syncRequestSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error, ctx);
    }

    const { type, resourceIds, force, dryRun } = validation.data;

    logger.info("Sync operation triggered", {
      requestId: ctx.requestId,
      type,
      resourceCount: resourceIds?.length ?? "all",
      force,
      dryRun,
    });

    // In production, this would:
    // 1. Create a job record in the database
    // 2. Queue the sync operation for background processing
    // 3. Return the job ID for status tracking
    //
    // Example:
    // const job = await syncJobService.create({ type, resourceIds, force, dryRun });
    // await jobQueue.enqueue('sync', job.id);

    // Mock response for template
    const jobId = crypto.randomUUID();
    const response: SyncResponse = {
      success: true,
      jobId,
      type,
      status: dryRun ? "completed" : "queued",
      stats: {
        itemsQueued: resourceIds?.length ?? 100, // Would be calculated from actual data
        estimatedDurationMs: (resourceIds?.length ?? 100) * 50, // ~50ms per item
      },
      startedAt: new Date().toISOString(),
    };

    logger.info("Sync job created", {
      requestId: ctx.requestId,
      jobId,
      type,
      status: response.status,
    });

    return jsonResponse(response, ctx, { status: 202 }); // 202 Accepted
  } catch (error) {
    logger.error("Sync operation failed", {
      requestId: ctx.requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return internalError("An unexpected error occurred", ctx, error);
  }
}

// ============================================================================
// GET HANDLER (List recent sync jobs)
// ============================================================================

/**
 * GET /api/internal/sync
 *
 * List recent sync jobs and their status.
 *
 * @header x-internal-secret - Internal API secret for authentication
 *
 * @returns List of recent sync jobs
 */
export async function GET(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  // Verify internal authentication
  const authResult = verifyInternalSecret(request);
  if (!authResult.authenticated) {
    return unauthorized(
      authResult.error ?? "Invalid or missing internal secret",
      ctx,
    );
  }

  try {
    // In production, this would query the jobs table
    // const jobs = await syncJobService.listRecent({ limit: 10 });

    // Mock response for template
    const response = {
      jobs: [
        {
          jobId: crypto.randomUUID(),
          type: "incremental" as const,
          status: "completed" as const,
          progress: { processed: 50, total: 50, percentage: 100 },
          stats: { created: 5, updated: 10, skipped: 35, errors: 0 },
          startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          completedAt: new Date(Date.now() - 3595000).toISOString(),
          error: null,
        },
      ],
      total: 1,
    };

    return jsonResponse(response, ctx);
  } catch (error) {
    return internalError("An unexpected error occurred", ctx, error);
  }
}
