/**
 * ============================================================================
 * COREX: Error Schemas
 * Description: Standardized error shapes for API responses
 *
 * This module defines error response structures for consistent API error handling.
 * All API errors should conform to these schemas for predictable client handling.
 * ============================================================================
 */

import { z } from "zod";

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Standard API error codes
 * These map directly to HTTP status codes for clarity
 */
export const ErrorCodes = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  CONFLICT: "CONFLICT",
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// ERROR RESPONSE SCHEMA
// ============================================================================

/**
 * Standard API error response schema
 */
export const apiErrorSchema = z.object({
  code: z.enum([
    "BAD_REQUEST",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "CONFLICT",
    "UNPROCESSABLE_ENTITY",
    "RATE_LIMITED",
    "INTERNAL_ERROR",
    "SERVICE_UNAVAILABLE",
    "VALIDATION_ERROR",
    "AUTHENTICATION_ERROR",
    "AUTHORIZATION_ERROR",
  ]),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

// ============================================================================
// VALIDATION ERROR
// ============================================================================

/**
 * Individual field validation error
 */
export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export type ValidationError = z.infer<typeof validationErrorSchema>;

/**
 * Validation error response with field-level errors
 */
export const validationErrorResponseSchema = apiErrorSchema.extend({
  code: z.literal("VALIDATION_ERROR"),
  details: z.object({
    errors: z.array(validationErrorSchema),
  }),
});

export type ValidationErrorResponse = z.infer<
  typeof validationErrorResponseSchema
>;

// ============================================================================
// HTTP STATUS MAPPING
// ============================================================================

/**
 * Map error codes to HTTP status codes
 */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
};

// ============================================================================
// ERROR MESSAGES (User-friendly, no internal details)
// ============================================================================

/**
 * Default user-friendly error messages
 * Use these when you don't want to expose internal details
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: "The request was invalid or malformed",
  UNAUTHORIZED: "Authentication required",
  FORBIDDEN: "You do not have permission to access this resource",
  NOT_FOUND: "The requested resource was not found",
  METHOD_NOT_ALLOWED: "This HTTP method is not supported",
  CONFLICT: "The request conflicts with the current state",
  UNPROCESSABLE_ENTITY: "The request could not be processed",
  RATE_LIMITED: "Too many requests. Please try again later",
  INTERNAL_ERROR: "An unexpected error occurred",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",
  VALIDATION_ERROR: "Input validation failed",
  AUTHENTICATION_ERROR: "Authentication failed",
  AUTHORIZATION_ERROR: "You are not authorized to perform this action",
};

// ============================================================================
// ERROR FACTORY
// ============================================================================

/**
 * Create a standardized API error response body
 */
export function createApiError(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): ApiErrorResponse {
  return {
    code,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };
}
