/**
 * ============================================================================
 * HTTP Types - Request/Response Definitions
 * ============================================================================
 *
 * This module defines types for HTTP communication.
 * These types are used by API routes and client-side fetch calls.
 *
 * Design Principles:
 * ------------------
 * 1. TYPED RESPONSES: All API responses have explicit types
 * 2. ERROR STANDARDIZATION: Consistent error response format
 * 3. PAGINATION: Unified pagination approach
 * 4. VERSIONING: Support for API versioning
 *
 * Performance Considerations:
 * --------------------------
 * - Response types define the "shape" of data
 * - Use discriminated unions for response variants
 * - DTOs (Data Transfer Objects) for response shaping
 *
 * ============================================================================
 */

import type { PaginationInfo, SortConfig, FilterConfig } from "./entities";
import type { AppError } from "./errors";

// ============================================================================
// HTTP METHODS
// ============================================================================

/**
 * Standard HTTP methods
 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

/**
 * HTTP status codes (common ones)
 */
export type HttpStatus =
  | 200 // OK
  | 201 // Created
  | 204 // No Content
  | 301 // Moved Permanently
  | 302 // Found
  | 304 // Not Modified
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 502 // Bad Gateway
  | 503 // Service Unavailable
  | 504; // Gateway Timeout

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Base API response metadata
 */
export interface ApiResponseMeta {
  /**
   * Unique request identifier for tracing
   */
  requestId: string;

  /**
   * Response timestamp
   */
  timestamp: string;

  /**
   * API version
   */
  version?: string;
}

/**
 * Successful API response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiResponseMeta;
}

/**
 * Paginated API response
 */
export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationInfo;
  meta: ApiResponseMeta;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string; // Only in development
  };
  meta: ApiResponseMeta;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Type guard for success responses
 */
export function isApiSuccess<T>(
  response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard for error responses
 */
export function isApiError<T>(
  response: ApiResponse<T>,
): response is ApiErrorResponse {
  return response.success === false;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Common query parameters for list endpoints
 */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  sort?: string; // e.g., "createdAt:desc"
  search?: string;
  filter?: string; // JSON encoded filters
}

/**
 * Parse sort string to SortConfig
 */
export function parseSortParam(sort: string): SortConfig | null {
  const [field, direction] = sort.split(":");
  if (!field) return null;
  return {
    field,
    direction: direction === "desc" ? "desc" : "asc",
  };
}

/**
 * Parse filter string to FilterConfig array
 */
export function parseFilterParam(filter: string): FilterConfig[] {
  try {
    return JSON.parse(filter) as FilterConfig[];
  } catch {
    return [];
  }
}

// ============================================================================
// REQUEST CONTEXT
// ============================================================================

/**
 * User agent information
 */
export interface UserAgentInfo {
  raw: string;
  isBot: boolean;
  isMobile: boolean;
  browser?: string;
  os?: string;
}

/**
 * Security context from request
 */
export interface SecurityContext {
  requestId: string;
  timestamp: Date;
  ip: string;
  userAgent: UserAgentInfo;
  origin?: string;
  referer?: string;
}

/**
 * Authenticated user context
 */
export interface AuthContext {
  userId: string;
  sessionId: string;
  role: string;
  permissions: string[];
}

/**
 * Full request context
 */
export interface RequestContext extends SecurityContext {
  auth?: AuthContext;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum requests allowed
   */
  limit: number;

  /**
   * Window size in seconds
   */
  windowSeconds: number;

  /**
   * Key generator function
   */
  keyGenerator?: (ctx: RequestContext) => string;
}

/**
 * Rate limit info headers
 */
export interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
  "Retry-After"?: string;
}

// ============================================================================
// API ROUTE TYPES
// ============================================================================

/**
 * Route handler function signature
 */
export type RouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

/**
 * Middleware function signature
 */
export type Middleware = (
  request: Request,
  next: () => Promise<Response>,
) => Promise<Response>;

/**
 * Route definition
 */
export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  middleware?: Middleware[];
  rateLimit?: RateLimitConfig;
  auth?: "required" | "optional" | "none";
}

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

/**
 * Response builder options
 */
export interface ResponseOptions {
  status?: HttpStatus;
  headers?: Record<string, string>;
}

/**
 * JSON response builder type
 */
export type JsonResponseBuilder = <T>(
  data: T,
  options?: ResponseOptions,
) => Response;

/**
 * Error response builder type
 */
export type ErrorResponseBuilder = (
  error: AppError,
  options?: ResponseOptions,
) => Response;

// ============================================================================
// API CLIENT TYPES
// ============================================================================

/**
 * Fetch options for API client
 */
export interface ApiClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  onError?: (error: Error) => void;
}

/**
 * API client request options
 */
export interface ApiRequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Typed API client interface
 */
export interface TypedApiClient {
  get<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  post<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  put<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  patch<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  delete<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

/**
 * WebSocket message types
 */
export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  id?: string;
}

/**
 * WebSocket connection state
 */
export type WebSocketState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/**
 * WebSocket client interface
 */
export interface WebSocketClient {
  state: WebSocketState;
  connect(): Promise<void>;
  disconnect(): void;
  send<T>(message: WebSocketMessage<T>): void;
  on<T>(type: string, handler: (payload: T) => void): () => void;
}
