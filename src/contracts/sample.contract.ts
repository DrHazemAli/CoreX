/**
 * ============================================================================
 * COREX: Sample Contract (Zod Schema)
 * Description: Template demonstrating best practices for API contracts
 *
 * WHAT ARE CONTRACTS?
 * Contracts define the shape of data flowing through your application.
 * They serve as the single source of truth for validation and types.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         Data Flow with Contracts                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  Client Request → Route Handler → Validate (Contract) → Use Case       │
 * │                                                                         │
 * │  Use Case Result → Validate (Contract) → Route Handler → Response      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY USE ZOD?
 * - Runtime validation (catches invalid data at boundaries)
 * - Type inference (no duplicate type definitions)
 * - Composable schemas (build complex from simple)
 * - Detailed error messages
 * ============================================================================
 */

import { z } from "zod";

// ============================================================================
// ✅ DO: Create reusable primitive validators
// ============================================================================

/**
 * Email with normalization
 * Always lowercase and trim emails for consistency
 */
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .max(254, "Email too long")
  .toLowerCase()
  .trim();

/**
 * Safe string that prevents common injection attacks
 */
export const safeStringSchema = (maxLength = 1000) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .refine((s) => !s.includes("\0"), "Null bytes not allowed");

/**
 * Pagination parameters - reusable across all list endpoints
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// ✅ DO: Define request schemas with clear naming
// ============================================================================

/**
 * Request schema naming convention: {Action}{Resource}RequestSchema
 * Examples: createUserRequestSchema, updatePostRequestSchema
 */
export const createSampleRequestSchema = z.object({
  // Required fields first
  name: safeStringSchema(100),
  email: emailSchema,

  // Optional fields with defaults
  description: safeStringSchema(500).optional(),
  isActive: z.boolean().default(true),

  // Arrays with item validation
  tags: z.array(z.string().max(50)).max(10).default([]),

  // Nested objects
  metadata: z
    .object({
      source: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
    })
    .optional(),
});

/**
 * Infer TypeScript type from schema
 * This ensures types stay in sync with validation
 */
export type CreateSampleRequest = z.infer<typeof createSampleRequestSchema>;

// ============================================================================
// ✅ DO: Define response schemas for documentation
// ============================================================================

/**
 * Response schema naming convention: {Resource}ResponseSchema
 */
export const sampleResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SampleResponse = z.infer<typeof sampleResponseSchema>;

/**
 * List response with pagination metadata
 */
export const sampleListResponseSchema = z.object({
  data: z.array(sampleResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean(),
  }),
});

export type SampleListResponse = z.infer<typeof sampleListResponseSchema>;

// ============================================================================
// ✅ DO: Use refinements for complex validation
// ============================================================================

/**
 * Date range validation - ensures start is before end
 */
export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Start date must be before or equal to end date",
    path: ["startDate"], // Points to the field with the error
  });

// ============================================================================
// ✅ DO: Export everything from index.ts
// ============================================================================

// In contracts/index.ts:
// export * from './sample.contract';
// export * from './user.contract';
// etc.

// ============================================================================
// ❌ DON'T: Common mistakes to avoid
// ============================================================================

/**
 * ❌ DON'T: Define types separately from schemas
 *
 * BAD:
 * ```ts
 * interface User {
 *   name: string;
 *   email: string;
 * }
 *
 * const userSchema = z.object({
 *   name: z.string(),
 *   email: z.string(),
 * });
 * ```
 *
 * GOOD: Use z.infer<typeof schema> to derive types
 */

/**
 * ❌ DON'T: Use any or unknown without validation
 *
 * BAD:
 * ```ts
 * metadata: z.any()
 * ```
 *
 * GOOD: Be explicit about allowed shapes
 * ```ts
 * metadata: z.record(z.string(), z.unknown()).optional()
 * ```
 */

/**
 * ❌ DON'T: Forget to handle coercion for query params
 *
 * BAD (won't work with query strings):
 * ```ts
 * page: z.number()
 * ```
 *
 * GOOD:
 * ```ts
 * page: z.coerce.number()
 * ```
 */

/**
 * ❌ DON'T: Skip max length on strings
 *
 * BAD (potential DoS vector):
 * ```ts
 * description: z.string()
 * ```
 *
 * GOOD:
 * ```ts
 * description: z.string().max(5000)
 * ```
 */

/**
 * ❌ DON'T: Expose internal IDs in public schemas
 *
 * BAD:
 * ```ts
 * internalUserId: z.number()  // Auto-increment ID
 * ```
 *
 * GOOD:
 * ```ts
 * id: z.string().uuid()  // Public-facing UUID
 * ```
 */

// ============================================================================
// USAGE EXAMPLE IN ROUTE HANDLER
// ============================================================================

/**
 * Example route handler using this contract:
 *
 * ```ts
 * import { createSampleRequestSchema } from '@/contracts';
 *
 * export async function POST(request: NextRequest) {
 *   const ctx = createRequestContext(request);
 *
 *   // Parse body
 *   let body: unknown;
 *   try {
 *     body = await request.json();
 *   } catch {
 *     return badRequest('Invalid JSON body', ctx);
 *   }
 *
 *   // Validate with schema
 *   const validation = createSampleRequestSchema.safeParse(body);
 *   if (!validation.success) {
 *     return badRequest(
 *       `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`,
 *       ctx
 *     );
 *   }
 *
 *   // Use validated data (fully typed!)
 *   const { name, email, tags } = validation.data;
 *
 *   // ... rest of handler
 * }
 * ```
 */
