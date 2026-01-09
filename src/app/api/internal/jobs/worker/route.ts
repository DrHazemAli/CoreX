/**
 * ============================================================================
 * COREX: Jobs Worker API Route
 * Description: HTTP endpoint for processing queued jobs
 *
 * USAGE:
 * This endpoint is designed to be called by:
 * 1. Cron jobs (e.g., Vercel Cron, GitHub Actions)
 * 2. External schedulers
 * 3. Webhook triggers
 *
 * SECURITY:
 * Protected by x-internal-secret header
 *
 * EXAMPLE:
 *   POST /api/internal/jobs/worker
 *   Headers: { "x-internal-secret": "<secret>" }
 *   Body: { "queues": ["default", "emails"], "maxJobs": 100 }
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
} from "@/server/http/responses";
import { logger } from "@/lib/logger";
import {
  processJobBatch,
  isJobsEnabled,
  runWorkerRequestSchema,
  type RunWorkerResponse,
} from "@/server/jobs";

// ============================================================================
// POST: Run Worker
// ============================================================================

/**
 * POST /api/internal/jobs/worker
 *
 * Process a batch of jobs from the queue.
 * Designed for serverless environments with request timeouts.
 *
 * @header x-internal-secret - Internal API secret
 * @body queues - Array of queue names to process (optional)
 * @body maxJobs - Maximum jobs to process (default: 100)
 * @body maxRuntime - Maximum runtime in ms (default: 55000)
 */
export async function POST(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  // Verify authentication
  const authResult = verifyInternalSecret(request);
  if (!authResult.authenticated) {
    logger.warn("Unauthorized job worker access attempt", {
      requestId: ctx.requestId,
      ip: ctx.ip,
    });
    return unauthorized(authResult.error ?? "Invalid internal secret", ctx);
  }

  // Check if jobs are enabled
  if (!isJobsEnabled()) {
    return jsonResponse(
      {
        success: false,
        message: "Job system is disabled",
        data: null,
      },
      ctx,
      { status: 503 },
    );
  }

  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const parseResult = runWorkerRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return badRequest(
        `Invalid request: ${parseResult.error.issues.map((e) => e.message).join(", ")}`,
        ctx,
      );
    }

    const options = parseResult.data;

    logger.info("Starting job worker batch", {
      requestId: ctx.requestId,
      queues: options.queues,
      maxJobs: options.maxJobs,
      maxRuntime: options.maxRuntime,
    });

    // Process jobs
    const result = await processJobBatch({
      queues: options.queues,
      maxJobs: options.maxJobs,
      maxRuntime: options.maxRuntime,
    });

    const response: RunWorkerResponse = {
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      duration: result.duration,
    };

    logger.info("Job worker batch completed", {
      requestId: ctx.requestId,
      ...response,
    });

    return jsonResponse(
      {
        success: true,
        message: `Processed ${result.processed} jobs`,
        data: response,
      },
      ctx,
    );
  } catch (error) {
    logger.error("Job worker error", {
      requestId: ctx.requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return internalError("Failed to process jobs", ctx);
  }
}

// ============================================================================
// GET: Worker Status
// ============================================================================

/**
 * GET /api/internal/jobs/worker
 *
 * Get job system status and queue sizes.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  // Verify authentication
  const authResult = verifyInternalSecret(request);
  if (!authResult.authenticated) {
    return unauthorized(authResult.error ?? "Invalid internal secret", ctx);
  }

  try {
    const {
      queueSize,
      QUEUES,
      isJobsEnabled: checkEnabled,
      getJobConfig,
    } = await import("@/server/jobs");

    const enabled = checkEnabled();
    const config = getJobConfig();

    // Get queue sizes
    const queueSizes: Record<string, number> = {};
    if (enabled) {
      for (const [name, queue] of Object.entries(QUEUES)) {
        // eslint-disable-next-line security/detect-object-injection -- name is from Object.entries of typed QUEUES constant
        queueSizes[name] = await queueSize(queue);
      }
    }

    return jsonResponse(
      {
        success: true,
        message: "Job system status",
        data: {
          enabled,
          driver: config.driver,
          queues: queueSizes,
          config: {
            defaultQueue: config.defaultQueue,
            maxAttempts: config.maxAttempts,
            workerConcurrency: config.worker.concurrency,
          },
        },
      },
      ctx,
    );
  } catch (error) {
    logger.error("Failed to get worker status", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return internalError("Failed to get worker status", ctx);
  }
}
