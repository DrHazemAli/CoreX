/**
 * ============================================================================
 * COREX: Internal API Schemas
 * Description: Schemas for internal/admin API endpoints
 *
 * Internal APIs are protected by API keys and used for:
 * - Health checks and monitoring
 * - Admin operations
 * - Inter-service communication
 * ============================================================================
 */

import { z } from "zod";

// ============================================================================
// GET /api/internal/health - Response
// ============================================================================

/**
 * Health check response schema
 */
export const healthCheckResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string().datetime(),
  version: z.string(),
  uptime: z.number(),
  checks: z.record(
    z.string(),
    z.object({
      status: z.enum(["pass", "fail", "warn"]),
      latencyMs: z.number().optional(),
      message: z.string().optional(),
    }),
  ),
});

/** Inferred type for health check response */
export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;

/**
 * Individual health check result
 */
export type HealthCheckResult = HealthCheckResponse["checks"][string];
