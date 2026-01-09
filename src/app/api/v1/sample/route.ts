/**
 * ============================================================================
 * COREX: Sample Public API Route
 * Description: Template demonstrating best practices for public API routes
 *
 * Architecture Overview:
 * ----------------------
 * API routes follow a clean separation of concerns:
 *
 * 1. SCHEMAS (src/schemas/api/v1/sample.ts)
 *    - Define Zod schemas for request/response validation
 *    - Types are INFERRED from schemas (single source of truth)
 *    - Never manually duplicate types - use z.infer<typeof schema>
 *
 * 2. CONTRACTS (src/contracts/)
 *    - Business-level validation schemas
 *    - Reusable across multiple endpoints
 *
 * 3. ROUTES (src/app/api/)
 *    - Import schemas from @/schemas/api/v1 or @/schemas/api/internal
 *    - Validate requests against schemas
 *    - Return typed responses
 *
 * Key Principles:
 * ---------------
 * ✅ NEVER use `any` - always declare explicit types
 * ✅ Schemas in schemas/api/v1/*.ts for public API
 * ✅ Schemas in schemas/api/internal/*.ts for internal API
 * ✅ Types inferred from schemas using z.infer<typeof schema>
 *
 * @example Usage:
 *   GET  /api/v1/sample?name=world          → Returns greeting
 *   POST /api/v1/sample { "name": "world" } → Creates a sample resource
 * ============================================================================
 */

import { type NextRequest } from "next/server";
import {
  createRequestContext,
  jsonResponse,
  badRequest,
  internalError,
  validationError,
} from "@/server/http/responses";
import {
  getRateLimiter,
  RateLimits,
  buildRateLimitKey,
} from "@/server/rateLimit";

// Import schemas and types from centralized schema location
import {
  sampleGetQuerySchema,
  samplePostBodySchema,
  type SampleGetResponse,
  type SamplePostResponse,
} from "@/schemas/api/v1/sample";

// ============================================================================
// GET HANDLER
// ============================================================================

/**
 * GET /api/v1/sample
 *
 * Public endpoint that returns a sample greeting.
 * Demonstrates:
 * - Query parameter parsing and validation
 * - Rate limiting
 * - Response caching headers
 *
 * @query name - Name to greet (optional, defaults to "world")
 * @query limit - Example pagination parameter (optional, defaults to 10)
 *
 * @returns {SampleGetResponse} Greeting message with metadata
 *
 * @example
 * ```bash
 * curl "http://localhost:3000/api/v1/sample?name=developer"
 * ```
 */
export async function GET(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  try {
    // Apply rate limiting
    const rateLimitKey = buildRateLimitKey(ctx.ip, "/api/v1/sample");
    const limiter = getRateLimiter();
    const rateLimitResult = await limiter.limit(
      rateLimitKey,
      RateLimits.PUBLIC,
    );

    if (!rateLimitResult.allowed) {
      return jsonResponse(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
          },
        },
        ctx,
        { status: 429 },
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const query = {
      name: searchParams.get("name") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    };

    const validation = sampleGetQuerySchema.safeParse(query);
    if (!validation.success) {
      return validationError(validation.error, ctx);
    }

    const { name } = validation.data;

    // Build response (in production, this would call a use case)
    const response: SampleGetResponse = {
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
    };

    return jsonResponse(response, ctx, {
      cacheControl: "public, max-age=60, s-maxage=300",
    });
  } catch (error) {
    return internalError("An unexpected error occurred", ctx, error);
  }
}

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/v1/sample
 *
 * Create a new sample resource.
 * Demonstrates:
 * - JSON body parsing and validation
 * - Error handling with proper response codes
 * - Business logic delegation pattern
 *
 * @body name - Resource name (required)
 * @body description - Optional description
 * @body metadata - Optional key-value metadata
 *
 * @returns {SamplePostResponse} Created resource details
 *
 * @example
 * ```bash
 * curl -X POST "http://localhost:3000/api/v1/sample" \
 *   -H "Content-Type: application/json" \
 *   -d '{"name": "My Resource", "description": "A sample resource"}'
 * ```
 */
export async function POST(request: NextRequest): Promise<Response> {
  const ctx = createRequestContext(request);

  try {
    // Apply rate limiting (stricter for mutations)
    const rateLimitKey = buildRateLimitKey(ctx.ip, "/api/v1/sample:post");
    const limiter = getRateLimiter();
    const rateLimitResult = await limiter.limit(rateLimitKey, RateLimits.HEAVY);

    if (!rateLimitResult.allowed) {
      return jsonResponse(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
          },
        },
        ctx,
        { status: 429 },
      );
    }

    // Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body", ctx);
    }

    // Validate request body
    const validation = samplePostBodySchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error, ctx);
    }

    const { name, description } = validation.data;

    // In production, this would call a use case:
    // const result = await createSampleUseCase.execute(validation.data);

    // Mock response for template
    const response: SamplePostResponse = {
      success: true,
      data: {
        id: crypto.randomUUID(),
        name,
        description: description ?? null,
        createdAt: new Date().toISOString(),
      },
    };

    return jsonResponse(response, ctx, { status: 201 });
  } catch (error) {
    return internalError("An unexpected error occurred", ctx, error);
  }
}
