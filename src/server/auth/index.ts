/**
 * ============================================================================
 * COREX: Auth Module
 * Description: Unified authentication exports
 * ============================================================================
 */

// Session management
export {
  getSession,
  getCurrentUserId,
  requireAuth,
  requireRole,
  requirePermission,
  hasPermission,
  hasRole,
  validateApiKey,
  generateApiKey,
  getAuthFromRequest,
  AuthenticationError,
  AuthorizationError,
  type ApiKeyInfo,
} from "./session";

// Audit logging
export {
  logAudit,
  logAuthEvent,
  logDataAccess,
  logDataMutation,
  logSecurityEvent,
  logAdminAction,
  queryAuditLogs,
  type AuditEntry,
  type AuditQueryOptions,
} from "./audit";
