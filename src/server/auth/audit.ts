/**
 * ============================================================================
 * COREX: Audit Logging
 * Description: Security audit trail for sensitive operations
 * ============================================================================
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RequestContext, AuditAction } from "@/server/security/types";

// ============================================================================
// AUDIT ENTRY
// ============================================================================

export interface AuditEntry {
  action: AuditAction;
  userId?: string | null;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

// ============================================================================
// AUDIT LOGGER
// ============================================================================

/**
 * Log an audit event
 * Fire and forget - never blocks or throws
 */
export async function logAudit(
  ctx: RequestContext | null,
  entry: AuditEntry,
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.rpc("log_audit_event", {
      p_user_id: entry.userId || ctx?.auth?.userId || null,
      p_action: entry.action,
      p_resource_type: entry.resourceType || null,
      p_resource_id: entry.resourceId || null,
      p_details: entry.details || {},
      p_ip_address: entry.ip || ctx?.ip || null,
      p_user_agent: entry.userAgent || ctx?.userAgent?.raw || null,
    });
  } catch {
    // Silent fail - audit logging should never break the app
    console.error("[Audit] Failed to log event:", entry.action);
  }
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  ctx: RequestContext | null,
  action:
    | "login"
    | "logout"
    | "signup"
    | "password_change"
    | "mfa_enable"
    | "mfa_disable",
  success: boolean,
  details?: Record<string, unknown>,
): Promise<void> {
  await logAudit(ctx, {
    action: `auth.${action}` as AuditAction,
    userId: ctx?.auth?.userId,
    details: {
      ...details,
      success,
    },
  });
}

/**
 * Log data access event
 */
export async function logDataAccess(
  ctx: RequestContext | null,
  resourceType: string,
  resourceId: string,
  action: "view" | "list" | "export",
  details?: Record<string, unknown>,
): Promise<void> {
  await logDataEvent(ctx, resourceType, resourceId, action, details);
}

/**
 * Log data mutation event
 */
export async function logDataMutation(
  ctx: RequestContext | null,
  resourceType: string,
  resourceId: string,
  action: "create" | "update" | "delete",
  details?: Record<string, unknown>,
): Promise<void> {
  await logDataEvent(ctx, resourceType, resourceId, action, details);
}

/**
 * Internal helper for data events (access and mutation)
 */
async function logDataEvent(
  ctx: RequestContext | null,
  resourceType: string,
  resourceId: string,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await logAudit(ctx, {
    action: `data.${action}` as AuditAction,
    userId: ctx?.auth?.userId,
    resourceType,
    resourceId,
    details,
  });
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  ctx: RequestContext | null,
  event:
    | "rate_limit_exceeded"
    | "invalid_token"
    | "permission_denied"
    | "suspicious_activity"
    | "api_key_created"
    | "api_key_revoked",
  details?: Record<string, unknown>,
): Promise<void> {
  await logAudit(ctx, {
    action: `security.${event}` as AuditAction,
    userId: ctx?.auth?.userId,
    details: {
      ...details,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent?.raw,
      requestId: ctx?.requestId,
    },
  });
}

/**
 * Log admin action
 */
export async function logAdminAction(
  ctx: RequestContext | null,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await logAudit(ctx, {
    action: `admin.${action}` as AuditAction,
    userId: ctx?.auth?.userId,
    resourceType,
    resourceId,
    details,
  });
}

// ============================================================================
// AUDIT QUERY (Admin only)
// ============================================================================

export interface AuditQueryOptions {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query audit logs (admin only)
 */
export async function queryAuditLogs(options: AuditQueryOptions = {}): Promise<{
  entries: Array<{
    id: string;
    userId: string | null;
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    details: Record<string, unknown>;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
  }>;
  total: number;
}> {
  const supabase = await createClient();

  let query = supabase.from("audit_logs").select("*", { count: "exact" });

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }
  if (options.action) {
    query = query.eq("action", options.action);
  }
  if (options.resourceType) {
    query = query.eq("resource_type", options.resourceType);
  }
  if (options.resourceId) {
    query = query.eq("resource_id", options.resourceId);
  }
  if (options.startDate) {
    query = query.gte("created_at", options.startDate.toISOString());
  }
  if (options.endDate) {
    query = query.lte("created_at", options.endDate.toISOString());
  }

  query = query
    .order("created_at", { ascending: false })
    .range(
      options.offset || 0,
      (options.offset || 0) + (options.limit || 50) - 1,
    );

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  return {
    entries: (data || []).map((entry) => ({
      id: entry.id,
      userId: entry.user_id,
      action: entry.action,
      resourceType: entry.resource_type,
      resourceId: entry.resource_id,
      details: entry.details as Record<string, unknown>,
      ipAddress: entry.ip_address,
      userAgent: entry.user_agent,
      createdAt: entry.created_at,
    })),
    total: count || 0,
  };
}
