/**
 * ============================================================================
 * COREX: Security Module
 * Description: Unified security exports
 * ============================================================================
 */

// Types
export type {
  SecurityContext,
  AuthContext,
  RequestContext,
  UserRole,
  Permission,
  AuditAction,
  ErrorCode,
  ApiError,
  ParsedUserAgent,
} from "./types";

// Sanitization
export {
  sanitize,
  validate,
  escapeHtml,
  stripHtml,
  sanitizeString,
  sanitizeUrl,
  sanitizeObject,
  escapeSqlLike,
  safeJsonParse,
  safeDeepClone,
} from "./sanitize";

// Security headers
export {
  getContentSecurityPolicy,
  getSecurityHeaders,
  applySecurityHeaders,
  generateNonce,
  NEXT_SECURITY_HEADERS,
  HSTS_HEADER,
} from "./headers";
