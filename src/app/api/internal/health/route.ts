/**
 * ============================================================================
 * COREX: Internal API Route Template
 * Description: Template demonstrating best practices for internal/protected routes
 *
 * INTERNAL ROUTES vs PUBLIC ROUTES:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Internal Routes (/api/internal/*)                                       │
 * │ - Protected by x-internal-secret header                                 │
 * │ - Called by cron jobs, schedulers, or trusted services                  │
 * │ - Used for background processing, admin operations, health checks       │
 * │ - Never exposed to end users                                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Public Routes (/api/v1/*)                                               │
 * │ - Protected by rate limiting                                            │
 * │ - May require authentication (JWT, session)                             │
 * │ - Exposed to end users and third-party integrations                    │
 * │ - Documented in public API docs                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @example Usage (from cron job or scheduler):
 *   GET  /api/internal/health → Health check
 *   POST /api/internal/health → Trigger health check with custom params
 *
 *   Headers required:
 *   - x-internal-secret: <INTERNAL_API_SECRET from env>
 * ============================================================================
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { verifyInternalSecret } from "@/server/auth/internal";
import {
  createRequestContext,
  jsonResponse,
  unauthorized,
  badRequest,
  internalError,
} from "@/server/http/responses";
import { logger } from "@/lib/logger";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Request body schema for POST requests
 * Internal routes often accept configuration for batch operations
 */
const healthCheckSchema = z.object({
  checkDatabase: z.boolean().optional().default(true),
  checkCache: z.boolean().optional().default(true),
  verbose: z.boolean().optional().default(false),
});

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Health check response structure
 */
interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    name: string;
    status: "pass" | "fail";
    duration: number;
    message?: string;
  }[];
}

// ============================================================================
// GET HANDLER
// ============================================================================

/**
 * GET /api/internal/health
 *
 * Health check endpoint for monitoring systems.
 * Returns service health status and component checks.
 *
 * Security:
 * - Requires x-internal-secret header
 * - Should only be accessible from trusted sources
 *
 * Use cases:
 * - Kubernetes liveness/readiness probes
 * - Load balancer health checks
 * - Monitoring dashboards
 *
 * @header x-internal-secret - Internal API secret for authentication
 *
 * @returns {HealthCheckResponse} Service health status
 *
 * @example
 * ```bash
 * curl "http://localhost:3000/api/internal/health" \
 *   -H "x-internal-secret: your-secret-here"
 * ```
 */
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(request);

  try {
    // Step 1: Verify internal authentication
    // CRITICAL: Always verify before any processing
    const authResult = verifyInternalSecret(request);
    if (!authResult.authenticated) {
      logger.warn("Unauthorized internal API access attempt", {
        path: ctx.path,
        ip: ctx.ip,
        reason: authResult.error,
      });
      return unauthorized("Unauthorized", ctx);
    }

    // Step 2: Perform health checks
    const checks: HealthCheckResponse["checks"] = [];
    let overallStatus: HealthCheckResponse["status"] = "healthy";

    // Check 1: Application is running (always passes if we get here)
    checks.push({
      name: "application",
      status: "pass",
      duration: 0,
      message: "Application is responding",
    });

    // Check 2: Environment configuration
    const envStart = Date.now();
    const hasRequiredEnv = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    checks.push({
      name: "environment",
      status: hasRequiredEnv ? "pass" : "fail",
      duration: Date.now() - envStart,
      message: hasRequiredEnv
        ? "Environment configured"
        : "Missing required environment variables",
    });

    if (!hasRequiredEnv) {
      overallStatus = "degraded";
    }

    // Step 3: Build response
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.0.0",
      checks,
    };

    // Return 200 for both healthy and degraded states
    // GET handler only checks basic health, not deep dependencies
    return jsonResponse(response, ctx, { status: 200 });
  } catch (error) {
    return internalError("Health check failed", ctx, error);
  }
}

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/internal/health
 *
 * Detailed health check with configurable components.
 * Useful for debugging and verbose monitoring.
 *
 * @header x-internal-secret - Internal API secret for authentication
 * @body checkDatabase - Whether to check database connectivity
 * @body checkCache - Whether to check cache connectivity
 * @body verbose - Include detailed diagnostics
 *
 * @returns {HealthCheckResponse} Detailed service health status
 *
 * @example
 * ```bash
 * curl -X POST "http://localhost:3000/api/internal/health" \
 *   -H "x-internal-secret: your-secret-here" \
 *   -H "Content-Type: application/json" \
 *   -d '{"checkDatabase": true, "verbose": true}'
 * ```
 */
// eslint-disable-next-line sonarjs/cognitive-complexity -- Health check requires multiple conditional service checks
export async function POST(request: NextRequest) {
  const ctx = createRequestContext(request);

  try {
    // Step 1: Verify internal authentication
    const authResult = verifyInternalSecret(request);
    if (!authResult.authenticated) {
      logger.warn("Unauthorized internal API access attempt", {
        path: ctx.path,
        ip: ctx.ip,
        reason: authResult.error,
      });
      return unauthorized("Unauthorized", ctx);
    }

    // Step 2: Parse and validate request body
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      return badRequest("Invalid JSON body", ctx);
    }

    const validation = healthCheckSchema.safeParse(body);
    if (!validation.success) {
      return badRequest(
        `Validation error: ${validation.error.issues.map((e) => e.message).join(", ")}`,
        ctx,
      );
    }

    const { checkDatabase, checkCache, verbose } = validation.data;

    // Step 3: Perform requested health checks
    const checks: HealthCheckResponse["checks"] = [];
    let overallStatus: HealthCheckResponse["status"] = "healthy";

    // Application check
    checks.push({
      name: "application",
      status: "pass",
      duration: 0,
      message: verbose ? "Next.js application responding normally" : undefined,
    });

    // Database check (if requested)
    if (checkDatabase) {
      const dbStart = Date.now();
      try {
        // In a real app, this would ping the database
        // const db = await getAdminClient();
        // await db.from('_health').select('1').limit(1);
        checks.push({
          name: "database",
          status: "pass",
          duration: Date.now() - dbStart,
          message: verbose ? "Database connection successful" : undefined,
        });
      } catch (error) {
        checks.push({
          name: "database",
          status: "fail",
          duration: Date.now() - dbStart,
          message: verbose
            ? `Database error: ${String(error)}`
            : "Connection failed",
        });
        overallStatus = "unhealthy";
      }
    }

    // Cache check (if requested)
    if (checkCache) {
      const cacheStart = Date.now();
      // In a real app, this would ping Redis/cache
      checks.push({
        name: "cache",
        status: "pass",
        duration: Date.now() - cacheStart,
        message: verbose ? "Cache available (or disabled)" : undefined,
      });
    }

    // Step 4: Log health check (for monitoring)
    logger.info("Health check completed", {
      status: overallStatus,
      checks: checks.map((c) => ({ name: c.name, status: c.status })),
    });

    // Step 5: Build and return response
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.0.0",
      checks,
    };

    // Return appropriate status code based on health
    const statusCode = overallStatus === "unhealthy" ? 503 : 200;

    return jsonResponse(response, ctx, { status: statusCode });
  } catch (error) {
    return internalError("Health check failed", ctx, error);
  }
}

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

/**
 * Internal routes should always be dynamic
 * Never cache internal route responses
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
