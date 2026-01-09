/**
 * ============================================================================
 * COREX: Secure Route Handler
 * Description: Zero-trust API route handler wrapper
 * Combines validation, rate limiting, auth, and error handling
 * ============================================================================
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { createRequestContextFromRequest } from "@/server/http/context";
import { errors } from "@/server/http/response";
import {
  getRateLimiter,
  RateLimits,
  buildRateLimitKey,
  type RateLimitConfig,
} from "@/server/rateLimit";
import { getAuthFromRequest } from "@/server/auth/session";
import { logSecurityEvent } from "@/server/auth/audit";
import { sanitizeObject } from "@/server/security/sanitize";
import type { HttpMethod } from "@/types/http";
import type {
  RequestContext,
  UserRole,
  Permission,
} from "@/server/security/types";

// ============================================================================
// ROUTE HANDLER OPTIONS
// ============================================================================

/** Allowed HTTP methods for route handlers */
type AllowedMethod = Extract<
  HttpMethod,
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
>;

export interface RouteHandlerOptions<TBody = unknown, TQuery = unknown> {
  /** Rate limit configuration */
  rateLimit?: RateLimitConfig;

  /** Require authentication */
  requireAuth?: boolean;

  /** Required roles (any of) */
  requireRole?: UserRole[];

  /** Required permissions (all of) */
  requirePermissions?: Permission[];

  /** Body validation schema */
  bodySchema?: ZodSchema<TBody>;

  /** Query validation schema */
  querySchema?: ZodSchema<TQuery>;

  /** Maximum request body size in bytes */
  maxBodySize?: number;

  /** Allowed HTTP methods */
  methods?: AllowedMethod[];
}

export interface HandlerContext<TBody = unknown, TQuery = unknown> {
  /** Request context with security metadata */
  ctx: RequestContext;

  /** Validated and sanitized body */
  body: TBody;

  /** Validated and sanitized query params */
  query: TQuery;

  /** Original request */
  request: NextRequest;
}

export type RouteHandler<TBody = unknown, TQuery = unknown> = (
  context: HandlerContext<TBody, TQuery>,
) => Promise<NextResponse>;

// ============================================================================
// SECURE HANDLER WRAPPER
// ============================================================================

/**
 * Create a secure route handler with all protections enabled
 *
 * Note: This function has high cognitive complexity because it implements
 * a security pipeline with multiple sequential checks (method, rate limit,
 * auth, role, permission, body validation, query validation). Each check
 * is necessary and cannot be easily extracted without losing clarity.
 */
export function createSecureHandler<TBody = unknown, TQuery = unknown>(
  handler: RouteHandler<TBody, TQuery>,
  options: RouteHandlerOptions<TBody, TQuery> = {},
) {
  // eslint-disable-next-line sonarjs/cognitive-complexity -- Security pipeline requires sequential checks
  return async function secureHandler(
    request: NextRequest,
  ): Promise<NextResponse> {
    // 1. Build request context
    const auth = await getAuthFromRequest(request);
    const ctx = createRequestContextFromRequest(request, auth);

    try {
      // 2. Method validation
      if (
        options.methods &&
        !options.methods.includes(request.method as AllowedMethod)
      ) {
        return errors.methodNotAllowed(options.methods, ctx);
      }

      // 3. Rate limiting
      const rateLimitConfig = options.rateLimit || RateLimits.PUBLIC;
      const rateLimitKey = buildRateLimitKey(ctx.ip, request.nextUrl.pathname);
      const limiter = getRateLimiter();
      const rateLimitResult = await limiter.limit(
        rateLimitKey,
        rateLimitConfig,
      );

      if (!rateLimitResult.allowed) {
        await logSecurityEvent(ctx, "rate_limit_exceeded", {
          path: request.nextUrl.pathname,
          limit: rateLimitResult.limit,
        });

        return errors.rateLimited(rateLimitResult, ctx);
      }

      // 4. Authentication check
      if (options.requireAuth && !ctx.auth) {
        return errors.unauthorized(ctx);
      }

      // 5. Role check
      if (options.requireRole && ctx.auth) {
        if (!options.requireRole.includes(ctx.auth.role)) {
          await logSecurityEvent(ctx, "permission_denied", {
            requiredRoles: options.requireRole,
            userRole: ctx.auth.role,
          });
          return errors.forbidden(ctx, "Insufficient role");
        }
      }

      // 6. Permission check
      if (options.requirePermissions && ctx.auth) {
        const hasAll = options.requirePermissions.every((p) =>
          ctx.auth!.permissions.includes(p),
        );
        if (!hasAll) {
          await logSecurityEvent(ctx, "permission_denied", {
            requiredPermissions: options.requirePermissions,
            userPermissions: ctx.auth.permissions,
          });
          return errors.forbidden(ctx, "Insufficient permissions");
        }
      }

      // 7. Body parsing and validation
      let body: TBody = undefined as TBody;
      if (
        options.bodySchema &&
        ["POST", "PUT", "PATCH"].includes(request.method)
      ) {
        try {
          // Check content length
          const contentLength = request.headers.get("content-length");
          const maxSize = options.maxBodySize || 1024 * 1024; // 1MB default

          if (contentLength && parseInt(contentLength, 10) > maxSize) {
            return errors.badRequest(ctx, "Request body too large");
          }

          // Parse JSON body
          const rawBody = await request.json();

          // Sanitize object (prevent prototype pollution)
          const sanitizedBody = sanitizeObject(rawBody);

          // Validate with Zod
          body = options.bodySchema.parse(sanitizedBody);
        } catch (err) {
          if (err instanceof ZodError) {
            return errors.validation(
              err.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
              })),
              ctx,
            );
          }
          return errors.badRequest(ctx, "Invalid request body");
        }
      }

      // 8. Query parsing and validation
      let query: TQuery = undefined as TQuery;
      if (options.querySchema) {
        try {
          const searchParams = Object.fromEntries(request.nextUrl.searchParams);
          const sanitizedQuery = sanitizeObject(searchParams);
          query = options.querySchema.parse(sanitizedQuery);
        } catch (err) {
          if (err instanceof ZodError) {
            return errors.validation(
              err.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
              })),
              ctx,
            );
          }
          return errors.badRequest(ctx, "Invalid query parameters");
        }
      }

      // 9. Execute handler
      return await handler({ ctx, body, query, request });
    } catch (error) {
      // Log internal errors (never expose to client)
      console.error("[RouteHandler] Internal error:", {
        requestId: ctx.requestId,
        path: request.nextUrl.pathname,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return errors.internal(ctx, error);
    }
  };
}

// ============================================================================
// CONVENIENCE HANDLERS
// ============================================================================

/**
 * Create a public GET handler
 */
export function publicGet<TQuery = unknown>(
  handler: RouteHandler<unknown, TQuery>,
  options: Omit<
    RouteHandlerOptions<unknown, TQuery>,
    "methods" | "requireAuth"
  > = {},
) {
  return createSecureHandler(handler, {
    ...options,
    methods: ["GET"],
    requireAuth: false,
  });
}

/**
 * Create an authenticated GET handler
 */
export function authGet<TQuery = unknown>(
  handler: RouteHandler<unknown, TQuery>,
  options: Omit<
    RouteHandlerOptions<unknown, TQuery>,
    "methods" | "requireAuth"
  > = {},
) {
  return createSecureHandler(handler, {
    ...options,
    methods: ["GET"],
    requireAuth: true,
  });
}

/**
 * Create an authenticated POST handler
 */
export function authPost<TBody = unknown>(
  handler: RouteHandler<TBody, unknown>,
  options: Omit<
    RouteHandlerOptions<TBody, unknown>,
    "methods" | "requireAuth"
  > = {},
) {
  return createSecureHandler(handler, {
    ...options,
    methods: ["POST"],
    requireAuth: true,
  });
}

/**
 * Create an admin-only handler
 */
export function adminOnly<TBody = unknown, TQuery = unknown>(
  handler: RouteHandler<TBody, TQuery>,
  options: Omit<
    RouteHandlerOptions<TBody, TQuery>,
    "requireAuth" | "requireRole"
  > = {},
) {
  return createSecureHandler(handler, {
    ...options,
    requireAuth: true,
    requireRole: ["admin", "super_admin"],
  });
}
