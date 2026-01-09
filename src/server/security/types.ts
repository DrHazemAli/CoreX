/**
 * ============================================================================
 * COREX: Security Types and Interfaces
 * Description: Core security type definitions for zero-trust architecture
 * ============================================================================
 */

// ============================================================================
// USER AGENT PARSING
// ============================================================================

export interface ParsedUserAgent {
  raw: string;
  isBot: boolean;
  isMobile: boolean;
  browser?: string;
  os?: string;
}

// ============================================================================
// SECURITY CONTEXT
// ============================================================================

/**
 * Security metadata extracted from request
 */
export interface SecurityContext {
  /** Unique request identifier for tracing */
  requestId: string;
  /** Request timestamp */
  timestamp: Date;
  /** Client IP address */
  ip: string;
  /** Parsed user agent */
  userAgent: ParsedUserAgent;
  /** Request origin */
  origin?: string;
  /** Referer header */
  referer?: string;
  /** Content type */
  contentType?: string;
}

/**
 * Authenticated user context
 */
export interface AuthContext {
  /** User ID from Supabase auth */
  userId: string;
  /** User email (optional) */
  email?: string;
  /** User role */
  role: UserRole;
  /** User permissions */
  permissions: Permission[];
  /** Session ID (optional) */
  sessionId?: string;
  /** API key ID if authenticated via API key */
  apiKeyId?: string;
}

/**
 * Full request context combining security and auth
 */
export interface RequestContext extends SecurityContext {
  /** Authentication context (null if not authenticated) */
  auth: AuthContext | null;
  /** Original request reference */
  request: Request | null;
}

// ============================================================================
// USER ROLES AND PERMISSIONS
// ============================================================================

export type UserRole = "user" | "moderator" | "admin" | "super_admin";

export type Permission =
  // Repository permissions
  | "repos.view"
  | "repos.create"
  | "repos.update"
  | "repos.delete"
  | "repos.refresh"
  // Rankings permissions
  | "rankings.view"
  | "rankings.compute"
  // User permissions
  | "users.view"
  | "users.create"
  | "users.update"
  | "users.delete"
  | "users.change_role"
  // System permissions
  | "system.view_logs"
  | "system.view_jobs"
  | "system.manage_jobs"
  | "system.settings"
  // Admin permissions
  | "admin.access"
  | "admin.reports"
  // Legacy format (for backwards compatibility)
  | "repos:read"
  | "repos:write"
  | "repos:delete"
  | "rankings:read"
  | "rankings:compute"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "api_keys:read"
  | "api_keys:write"
  | "api_keys:delete"
  | "audit:read"
  | "settings:read"
  | "settings:write"
  | "admin:access";

// ============================================================================
// AUDIT ACTIONS
// ============================================================================

export type AuditAction =
  // Auth events
  | "auth.login"
  | "auth.logout"
  | "auth.signup"
  | "auth.password_change"
  | "auth.mfa_enable"
  | "auth.mfa_disable"
  // Data events
  | "data.view"
  | "data.list"
  | "data.export"
  | "data.create"
  | "data.update"
  | "data.delete"
  // Security events
  | "security.rate_limit_exceeded"
  | "security.invalid_token"
  | "security.permission_denied"
  | "security.suspicious_activity"
  | "security.api_key_created"
  | "security.api_key_revoked"
  // Admin events
  | `admin.${string}`;

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests allowed */
  limit: number;
  /** Time window in seconds */
  windowSec: number;
  /** Optional: different limits per user type */
  byRole?: Partial<Record<UserRole, number>>;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Total limit for this window */
  limit: number;
  /** Remaining requests in this window */
  remaining: number;
  /** Unix timestamp when the window resets */
  reset: number;
  /** Retry after (seconds) if blocked */
  retryAfter?: number;
}

export interface RateLimiter {
  /**
   * Check and consume rate limit
   * @param key - Unique identifier (IP, user ID, API key, etc.)
   * @param config - Rate limit configuration
   */
  limit(key: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Get current status without consuming
   */
  status(key: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Reset rate limit for a key (admin action)
   */
  reset(key: string): Promise<void>;
}

// ============================================================================
// CACHE PROVIDER
// ============================================================================

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export interface SecurityHeaders {
  "Content-Security-Policy": string;
  "X-Content-Type-Options": string;
  "X-Frame-Options": string;
  "X-XSS-Protection": string;
  "Referrer-Policy": string;
  "Permissions-Policy": string;
  "Strict-Transport-Security"?: string;
  "Cross-Origin-Opener-Policy"?: string;
  "Cross-Origin-Resource-Policy"?: string;
  "Cross-Origin-Embedder-Policy"?: string;
}

// ============================================================================
// API ERRORS
// ============================================================================

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFLICT"
  | "UNPROCESSABLE_ENTITY"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR";

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
  timestamp: string;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// ============================================================================
// API KEY
// ============================================================================

export interface ApiKeyInfo {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
}
