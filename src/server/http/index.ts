/**
 * ============================================================================
 * COREX: HTTP Module
 * Description: Unified HTTP utilities exports
 * ============================================================================
 */

export {
  createRequestContext,
  createRequestContextFromRequest,
  generateRequestId,
  extractClientIp,
  parseUserAgent,
  buildSecurityContext,
  isAuthenticated,
  isBot,
  hasPermission,
  hasRole,
  requireUserId,
  type CreateContextOptions,
  type ParsedUserAgent,
} from "./context";

export {
  success,
  created,
  noContent,
  error,
  errors,
  handleOptions,
  safeRedirect,
  stream,
  type SuccessResponseOptions,
  type ErrorResponseOptions,
} from "./response";

export {
  createSecureHandler,
  publicGet,
  authGet,
  authPost,
  adminOnly,
  type RouteHandlerOptions,
  type HandlerContext,
  type RouteHandler,
} from "./handler";
