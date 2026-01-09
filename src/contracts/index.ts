/**
 * ============================================================================
 * COREX: API Contracts - Zod Schemas
 * Description: Request/response validation schemas for type-safe APIs
 *
 * Contracts are the single source of truth for:
 * - Input validation
 * - TypeScript types (inferred from schemas)
 * - API documentation
 *
 * @example
 * ```ts
 * import { paginationSchema, createSampleRequestSchema } from '@/contracts';
 *
 * const validation = createSampleRequestSchema.safeParse(body);
 * if (!validation.success) {
 *   return badRequest(validation.error.message);
 * }
 * ```
 * ============================================================================
 */

import { z } from "zod";

// ============================================================================
// COMMON SCHEMAS (Reusable primitives)
// ============================================================================

/**
 * Pagination parameters schema
 * Use with query parameters for list endpoints
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Sort direction schema
 */
export const sortDirectionSchema = z.enum(["asc", "desc"]);

export type SortDirection = z.infer<typeof sortDirectionSchema>;

/**
 * Date string schema (ISO format)
 */
export const dateStringSchema = z.string().datetime().or(z.string().date());

/**
 * UUID schema
 */
export const uuidSchema = z.string().uuid();

// ============================================================================
// SAMPLE CONTRACTS (Template - see sample.contract.ts for detailed docs)
// ============================================================================

export {
  emailSchema,
  safeStringSchema,
  createSampleRequestSchema,
  sampleResponseSchema,
  sampleListResponseSchema,
  type CreateSampleRequest,
  type SampleResponse,
  type SampleListResponse,
} from "./sample.contract";

// ============================================================================
// COMMON EXPORTS (from common.ts - shared validation schemas)
// ============================================================================

export {
  safeString,
  uuid,
  email,
  httpUrl,
  slug,
  githubName,
  safeInt,
  positiveInt,
  percentage,
  dateRangeSchema,
} from "./common";

// ============================================================================
// ERROR SCHEMAS
// ============================================================================

/**
 * API error response schema
 */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
