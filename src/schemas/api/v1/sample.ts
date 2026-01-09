/**
 * ============================================================================
 * COREX: Sample API v1 Schemas
 * Description: Zod schemas and inferred types for Sample API endpoints
 *
 * Schema Organization:
 * -------------------
 * schemas/api/v1/sample.ts     → GET/POST /api/v1/sample
 * schemas/api/v1/users.ts      → User-related endpoints
 * schemas/api/internal/health.ts → Internal health check
 *
 * Best Practices:
 * ---------------
 * 1. Define schemas FIRST, then infer types from them
 * 2. Export both schemas (for validation) and types (for TypeScript)
 * 3. Use z.infer<typeof schema> to derive types - single source of truth
 * 4. Group request/response schemas together per endpoint
 * 5. Add JSDoc comments for API documentation
 *
 * @example Usage in route handler:
 * ```ts
 * import {
 *   sampleGetQuerySchema,
 *   type SampleGetQuery,
 *   type SampleGetResponse,
 * } from "@/schemas/api/v1/sample";
 *
 * export async function GET(request: NextRequest) {
 *   const validation = sampleGetQuerySchema.safeParse(query);
 *   // ...
 *   const response: SampleGetResponse = { ... };
 * }
 * ```
 * ============================================================================
 */

import { z } from "zod";

// ============================================================================
// GET /api/v1/sample - Query Parameters
// ============================================================================

/**
 * Query parameters for GET /api/v1/sample
 *
 * @property name - Name to greet (optional, defaults to "world")
 * @property limit - Pagination limit (optional, defaults to 10)
 */
export const sampleGetQuerySchema = z.object({
  name: z.string().min(1).max(100).optional().default("world"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

/** Inferred type for GET query parameters */
export type SampleGetQuery = z.infer<typeof sampleGetQuerySchema>;

// ============================================================================
// GET /api/v1/sample - Response
// ============================================================================

/**
 * Response schema for GET /api/v1/sample
 */
export const sampleGetResponseSchema = z.object({
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
});

/** Inferred type for GET response */
export type SampleGetResponse = z.infer<typeof sampleGetResponseSchema>;

// ============================================================================
// POST /api/v1/sample - Request Body
// ============================================================================

/**
 * Request body for POST /api/v1/sample
 *
 * @property name - Resource name (required, 1-100 chars)
 * @property description - Optional description (max 500 chars)
 * @property metadata - Optional key-value metadata
 */
export const samplePostBodySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** Inferred type for POST request body */
export type SamplePostBody = z.infer<typeof samplePostBodySchema>;

// ============================================================================
// POST /api/v1/sample - Response
// ============================================================================

/**
 * Response schema for POST /api/v1/sample
 */
export const samplePostResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.string().datetime(),
  }),
});

/** Inferred type for POST response */
export type SamplePostResponse = z.infer<typeof samplePostResponseSchema>;

// ============================================================================
// ERROR RESPONSE (Shared across all endpoints)
// ============================================================================

/**
 * Standard API error response schema
 */
export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

/** Inferred type for error response */
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
