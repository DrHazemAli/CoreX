/**
 * ============================================================================
 * COREX: HTTP Response Helpers
 * Description: Secure response builders with proper headers
 * Never leak internal errors, always include security headers
 * ============================================================================
 */

import "server-only";
import { NextResponse } from "next/server";
import type { RequestContext } from "@/server/security/types";
import type { ErrorCode } from "@/server/security/types";
import {
  ERROR_STATUS_MAP,
  ERROR_MESSAGES,
  createApiError,
} from "@/contracts/errors";
import type { RateLimitResult } from "@/server/rateLimit";

// ============================================================================
// RESPONSE HEADERS
// ============================================================================

/**
 * Standard security headers for all responses
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0", // Disabled in favor of CSP
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

/**
 * CORS headers for API responses
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

/**
 * Build headers for a response
 */
function buildHeaders(
  ctx?: RequestContext | null,
  rateLimit?: RateLimitResult,
  additionalHeaders?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json",
  };

  // Add request ID for tracing
  if (ctx?.requestId) {
    headers["X-Request-ID"] = ctx.requestId;
  }

  // Add rate limit headers
  if (rateLimit) {
    headers["X-RateLimit-Limit"] = String(rateLimit.limit);
    headers["X-RateLimit-Remaining"] = String(rateLimit.remaining);
    headers["X-RateLimit-Reset"] = String(
      Math.floor(rateLimit.resetAt.getTime() / 1000),
    );
    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 1000,
      );
      if (retryAfterSeconds > 0) {
        headers["Retry-After"] = String(retryAfterSeconds);
      }
    }
  }

  // Add CORS headers
  Object.assign(headers, CORS_HEADERS);

  // Add any additional headers
  if (additionalHeaders) {
    Object.assign(headers, additionalHeaders);
  }

  return headers;
}

// ============================================================================
// SUCCESS RESPONSES
// ============================================================================

export interface SuccessResponseOptions<T> {
  data: T;
  ctx?: RequestContext | null;
  rateLimit?: RateLimitResult;
  status?: number;
  headers?: Record<string, string>;
}

/**
 * Create a successful JSON response
 */
export function success<T>(options: SuccessResponseOptions<T>): NextResponse {
  const {
    data,
    ctx = null,
    rateLimit,
    status = 200,
    headers: additionalHeaders,
  } = options;

  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: buildHeaders(ctx, rateLimit, additionalHeaders),
    },
  );
}

/**
 * Create a 201 Created response
 */
export function created<T>(
  data: T,
  ctx?: RequestContext | null,
  location?: string,
): NextResponse {
  const headers = location ? { Location: location } : undefined;
  return success({ data, ctx, status: 201, headers });
}

/**
 * Create a 204 No Content response
 */
export function noContent(ctx?: RequestContext | null): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: buildHeaders(ctx),
  });
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

export interface ErrorResponseOptions {
  code: ErrorCode;
  message?: string;
  ctx?: RequestContext | null;
  rateLimit?: RateLimitResult;
  details?: Record<string, unknown>;
  /** Internal error for logging (never sent to client) */
  internalError?: unknown;
}

/**
 * Create an error JSON response
 * NEVER leaks internal error details to client
 */
export function error(options: ErrorResponseOptions): NextResponse {
  const {
    code,
    // eslint-disable-next-line security/detect-object-injection -- Safe: code is typed ErrorCode enum
    message = ERROR_MESSAGES[code],
    ctx = null,
    rateLimit,
    details,
  } = options;

  // eslint-disable-next-line security/detect-object-injection -- Safe: code is typed ErrorCode enum
  const status = ERROR_STATUS_MAP[code];
  const requestId = ctx?.requestId || "unknown";

  const errorBody = createApiError(code, message, requestId, details);

  return NextResponse.json(
    { success: false, error: errorBody },
    {
      status,
      headers: buildHeaders(ctx, rateLimit),
    },
  );
}

/**
 * Shorthand error creators
 */
export const errors = {
  badRequest: (
    ctx?: RequestContext | null,
    message?: string,
    details?: Record<string, unknown>,
  ) => error({ code: "BAD_REQUEST", message, ctx, details }),

  unauthorized: (ctx?: RequestContext | null, message?: string) =>
    error({ code: "UNAUTHORIZED", message, ctx }),

  forbidden: (ctx?: RequestContext | null, message?: string) =>
    error({ code: "FORBIDDEN", message, ctx }),

  notFound: (ctx?: RequestContext | null, message?: string) =>
    error({ code: "NOT_FOUND", message, ctx }),

  methodNotAllowed: (allowed: string[], ctx?: RequestContext | null) =>
    error({
      code: "METHOD_NOT_ALLOWED",
      ctx,
      details: { allowedMethods: allowed },
    }),

  conflict: (ctx?: RequestContext | null, message?: string) =>
    error({ code: "CONFLICT", message, ctx }),

  validation: (
    validationErrors: Array<{ field: string; message: string }>,
    ctx?: RequestContext | null,
  ) =>
    error({
      code: "VALIDATION_ERROR",
      ctx,
      details: { errors: validationErrors },
    }),

  rateLimited: (rateLimit: RateLimitResult, ctx?: RequestContext | null) =>
    error({
      code: "RATE_LIMITED",
      ctx,
      rateLimit,
      details: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        reset: Math.floor(rateLimit.resetAt.getTime() / 1000),
        retryAfter: Math.max(
          0,
          Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
        ),
      },
    }),

  internal: (ctx?: RequestContext | null, internalError?: unknown) =>
    error({
      code: "INTERNAL_ERROR",
      ctx,
      // Log the error internally but don't send to client
      internalError,
    }),

  serviceUnavailable: (ctx?: RequestContext | null, message?: string) =>
    error({ code: "SERVICE_UNAVAILABLE", message, ctx }),
};

// ============================================================================
// CORS HANDLING
// ============================================================================

/**
 * Handle OPTIONS preflight request
 */
export function handleOptions(
  origin: string | null,
  allowedOrigins: string[] = ["*"],
): NextResponse {
  const headers: Record<string, string> = {
    ...CORS_HEADERS,
    "Access-Control-Allow-Credentials": "true",
  };

  // Validate origin
  if (allowedOrigins.includes("*")) {
    headers["Access-Control-Allow-Origin"] = origin || "*";
  } else if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else {
    headers["Access-Control-Allow-Origin"] = allowedOrigins[0] || "";
  }

  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

// ============================================================================
// REDIRECT HELPERS
// ============================================================================

import { sanitize } from "@/server/security/sanitize";

/**
 * Safe redirect that validates URL
 */
export function safeRedirect(
  url: string,
  allowedHosts: string[] = [],
): NextResponse {
  // Validate URL is safe
  if (!sanitize.isSafeRedirectUrl(url, allowedHosts)) {
    // Redirect to home if URL is unsafe
    return NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    );
  }

  return NextResponse.redirect(url);
}

// ============================================================================
// STREAMING RESPONSES
// ============================================================================

/**
 * Create a streaming JSON response
 */
export function stream(
  readable: ReadableStream,
  ctx?: RequestContext | null,
): NextResponse {
  return new NextResponse(readable, {
    headers: {
      ...buildHeaders(ctx),
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    },
  });
}
