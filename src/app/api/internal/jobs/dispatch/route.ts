/**
 * ============================================================================
 * COREX: Jobs Dispatch API Route
 * Description: HTTP endpoint for dispatching jobs
 *
 * USAGE:
 * This endpoint allows dispatching jobs via HTTP.
 * Useful for external systems to trigger jobs.
 *
 * SECURITY:
 * Protected by x-internal-secret header
 *
 * EXAMPLE:
 *   POST /api/internal/jobs/dispatch
 *   Headers: { "x-internal-secret": "<secret>" }
 *   Body: {
 *     "name": "email:send",
 *     "payload": { "to": "user@example.com" },
 *     "options": { "queue": "emails", "delay": 60 }
 *   }
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
  dispatch,
  isJobsEnabled,
  jobRegistry,
  dispatchJobRequestSchema,
  type DispatchJobResponse,
} from "@/server/jobs";

// ============================================================================
// POST: Dispatch Job
// ============================================================================

/**
 * POST /api/internal/jobs/dispatch
 *
 * Dispatch a job to the queue.
 *
 * @header x-internal-secret - Internal API secret
 * @body name - Job name (must be registered)
 * @body payload - Job payload data
 * @body options - Optional dispatch options (queue, delay, priority, etc.)
 */
export async function POST(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  // Verify authentication
  const authResult = verifyInternalSecret(request);
  if (!authResult.authenticated) {
    logger.warn("Unauthorized job dispatch attempt", {
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
    const parseResult = dispatchJobRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return badRequest(
        `Invalid request: ${parseResult.error.issues.map((e) => e.message).join(", ")}`,
        ctx,
      );
    }

    const { name, payload, options } = parseResult.data;

    // Verify job is registered
    if (!jobRegistry.has(name)) {
      return badRequest(`Job "${name}" is not registered`, ctx);
    }

    // Dispatch the job
    const jobId = await dispatch(name, payload, options);

    // Handle duplicate detection
    if (jobId === "duplicate") {
      return jsonResponse(
        {
          success: true,
          message: "Job already pending (duplicate key)",
          data: {
            success: true,
            jobId: "duplicate",
            queue: options?.queue ?? "default",
            availableAt: new Date().toISOString(),
          } satisfies DispatchJobResponse,
        },
        ctx,
      );
    }

    const response: DispatchJobResponse = {
      success: true,
      jobId,
      queue: options?.queue ?? jobRegistry.get(name)?.queue ?? "default",
      availableAt:
        options?.availableAt?.toISOString() ??
        (options?.delay
          ? new Date(Date.now() + options.delay * 1000).toISOString()
          : new Date().toISOString()),
    };

    logger.info(`Job dispatched: ${name}`, {
      requestId: ctx.requestId,
      jobId,
      queue: response.queue,
    });

    return jsonResponse(
      {
        success: true,
        message: `Job "${name}" dispatched successfully`,
        data: response,
      },
      ctx,
      { status: 202 }, // 202 Accepted
    );
  } catch (error) {
    logger.error("Job dispatch error", {
      requestId: ctx.requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return internalError("Failed to dispatch job", ctx);
  }
}

// ============================================================================
// GET: List Registered Jobs
// ============================================================================

/**
 * GET /api/internal/jobs/dispatch
 *
 * List all registered job definitions.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  // Verify authentication
  const authResult = verifyInternalSecret(request);
  if (!authResult.authenticated) {
    return unauthorized(authResult.error ?? "Invalid internal secret", ctx);
  }

  try {
    const jobNames = jobRegistry.names();
    const jobs = jobNames.map((name) => {
      const def = jobRegistry.get(name);
      return {
        name,
        queue: def?.queue ?? "default",
        maxAttempts: def?.maxAttempts ?? 3,
        priority: def?.priority ?? "default",
      };
    });

    return jsonResponse(
      {
        success: true,
        message: `${jobs.length} jobs registered`,
        data: { jobs },
      },
      ctx,
    );
  } catch (error) {
    logger.error("Failed to list jobs", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return internalError("Failed to list jobs", ctx);
  }
}
