/**
 * ============================================================================
 * COREX: HTTP Response Helpers
 * Description: Standardized API response formatting and error handling
 * ============================================================================
 */

import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

/**
 * API error codes
 */
export const ErrorCodes = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * API error response shape
 */
interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Request context for logging and tracing
 */
export interface RequestContext {
  requestId: string;
  ip?: string;
  userAgent?: string;
  path: string;
  method: string;
}

// ============================================================================
// REQUEST CONTEXT
// ============================================================================

/**
 * Generate a unique request ID
 * Note: Using Math.random for request IDs is acceptable - these are for tracing only,
 * not for security purposes. For cryptographic randomness, use crypto.getRandomValues.
 */
function generateRequestId(): string {
  // eslint-disable-next-line sonarjs/pseudo-random -- Safe: request IDs are for tracing, not security
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract request context from a request
 */
export function createRequestContext(request: Request): RequestContext {
  const url = new URL(request.url);

  return {
    requestId: generateRequestId(),
    ip: request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    path: url.pathname,
    method: request.method,
  };
}

// ============================================================================
// SUCCESS RESPONSES
// ============================================================================

/**
 * Return a successful JSON response
 */
export function jsonResponse<T>(
  data: T,
  context?: RequestContext,
  options?: {
    status?: number;
    headers?: Record<string, string>;
    cacheControl?: string;
  },
): NextResponse<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  // Add request ID header if available
  if (context?.requestId) {
    headers["X-Request-ID"] = context.requestId;
  }

  // Add cache control header
  if (options?.cacheControl) {
    headers["Cache-Control"] = options.cacheControl;
  }

  return NextResponse.json(data, {
    status: options?.status ?? 200,
    headers,
  });
}

/**
 * Return a paginated response
 */
export function paginatedResponse<T>(
  data: {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  },
  context?: RequestContext,
  options?: {
    headers?: Record<string, string>;
    cacheControl?: string;
  },
): NextResponse {
  return jsonResponse(data, context, options);
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

/**
 * Return an error response
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  context?: RequestContext,
  details?: Record<string, unknown>,
): NextResponse<ErrorResponse> {
  // Log the error
  logger.warn("API error response", {
    code,
    message,
    status,
    requestId: context?.requestId,
    path: context?.path,
    details,
  });

  const response: ErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
      ...(context?.requestId && { requestId: context.requestId }),
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (context?.requestId) {
    headers["X-Request-ID"] = context.requestId;
  }

  return NextResponse.json(response, { status, headers });
}

/**
 * Bad request error (400)
 */
export function badRequest(
  message: string = "Bad request",
  context?: RequestContext,
  details?: Record<string, unknown>,
): NextResponse<ErrorResponse> {
  return errorResponse(ErrorCodes.BAD_REQUEST, message, 400, context, details);
}

/**
 * Unauthorized error (401)
 */
export function unauthorized(
  message: string = "Unauthorized",
  context?: RequestContext,
): NextResponse<ErrorResponse> {
  return errorResponse(ErrorCodes.UNAUTHORIZED, message, 401, context);
}

/**
 * Forbidden error (403)
 */
export function forbidden(
  message: string = "Forbidden",
  context?: RequestContext,
): NextResponse<ErrorResponse> {
  return errorResponse(ErrorCodes.FORBIDDEN, message, 403, context);
}

/**
 * Not found error (404)
 */
export function notFound(
  message: string = "Resource not found",
  context?: RequestContext,
): NextResponse<ErrorResponse> {
  return errorResponse(ErrorCodes.NOT_FOUND, message, 404, context);
}

/**
 * Rate limited error (429)
 */
export function rateLimited(
  message: string = "Too many requests",
  context?: RequestContext,
  retryAfter?: number,
): NextResponse<ErrorResponse> {
  const response = errorResponse(
    ErrorCodes.RATE_LIMITED,
    message,
    429,
    context,
  );

  if (retryAfter) {
    response.headers.set("Retry-After", retryAfter.toString());
  }

  return response;
}

/**
 * Validation error (400)
 */
export function validationError(
  error: ZodError,
  context?: RequestContext,
): NextResponse<ErrorResponse> {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return errorResponse(
    ErrorCodes.VALIDATION_ERROR,
    "Validation failed",
    400,
    context,
    { issues },
  );
}

/**
 * Internal server error (500)
 */
export function internalError(
  message: string = "Internal server error",
  context?: RequestContext,
  error?: unknown,
): NextResponse<ErrorResponse> {
  // Log the actual error
  if (error) {
    logger.error("Internal server error", {
      requestId: context?.requestId,
      path: context?.path,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  return errorResponse(ErrorCodes.INTERNAL_ERROR, message, 500, context);
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Wrap an API handler with error handling
 */
export function withErrorHandler<T>(
  handler: (
    request: Request,
    context: RequestContext,
  ) => Promise<NextResponse<T>>,
) {
  return async (request: Request): Promise<NextResponse<T | ErrorResponse>> => {
    const ctx = createRequestContext(request);

    try {
      return await handler(request, ctx);
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return validationError(error, ctx);
      }

      // Handle other errors
      return internalError("An unexpected error occurred", ctx, error);
    }
  };
}
