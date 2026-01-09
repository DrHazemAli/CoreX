/**
 * ============================================================================
 * COREX: Authentication Helpers
 * Description: Session and authentication utilities
 * Zero-trust: Always verify, never assume
 *
 * When auth is disabled (NEXT_PUBLIC_ENABLE_AUTH=0):
 * - getSession() returns null
 * - requireAuth() throws
 * - hasPermission/hasRole return true (permissive)
 * ============================================================================
 */

import "server-only";
import { isAuthEnabled, isSupabaseConfigured } from "@/lib/config";
import type {
  AuthContext,
  UserRole,
  Permission,
} from "@/server/security/types";

// ============================================================================
// SESSION RETRIEVAL
// ============================================================================

/**
 * Get the current authenticated user session
 * Returns null if not authenticated or auth is disabled
 */
export async function getSession(): Promise<AuthContext | null> {
  // If auth is disabled, return null
  if (!isAuthEnabled() || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get user profile with role and permissions
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    // Get user permissions
    const permissions = await getUserPermissions(user.id);

    const role = (profile?.role || "user") as UserRole;

    return {
      userId: user.id,
      email: user.email || undefined,
      role,
      permissions,
      sessionId: undefined, // Supabase doesn't expose session ID directly
    };
  } catch {
    // Fail closed - return null on any error
    return null;
  }
}

/**
 * Get current user ID or null
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.userId || null;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthContext> {
  const session = await getSession();

  if (!session) {
    throw new AuthenticationError("Authentication required");
  }

  return session;
}

/**
 * Require specific role - throws if not authorized
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthContext> {
  const session = await requireAuth();

  if (!roles.includes(session.role)) {
    throw new AuthorizationError(`Required role: ${roles.join(" or ")}`);
  }

  return session;
}

/**
 * Require specific permission - throws if not authorized
 */
export async function requirePermission(
  permission: Permission,
): Promise<AuthContext> {
  const session = await requireAuth();

  if (!session.permissions.includes(permission)) {
    throw new AuthorizationError(`Required permission: ${permission}`);
  }

  return session;
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Get all permissions for a user
 * Returns empty array when auth is disabled
 */
async function getUserPermissions(userId: string): Promise<Permission[]> {
  if (!isAuthEnabled() || !isSupabaseConfigured()) {
    return [];
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Call the database function to get permissions
    const { data, error } = await supabase.rpc("get_user_permissions", {
      p_user_id: userId,
    });

    if (error || !data) {
      return [];
    }

    return data as Permission[];
  } catch {
    return [];
  }
}

/**
 * Check if user has a specific permission
 * Returns true when permissions are disabled (permissive mode)
 */
export async function hasPermission(
  userId: string,
  permission: Permission,
): Promise<boolean> {
  // When auth/permissions disabled, be permissive
  if (!isAuthEnabled() || !isSupabaseConfigured()) {
    return true;
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("has_permission", {
      p_user_id: userId,
      p_permission: permission,
    });

    if (error) {
      return false;
    }

    return data === true;
  } catch {
    return false;
  }
}

/**
 * Check if user has any of the specified roles
 * Returns true when permissions are disabled (permissive mode)
 */
export async function hasRole(
  userId: string,
  ...roles: UserRole[]
): Promise<boolean> {
  // When auth/permissions disabled, be permissive
  if (!isAuthEnabled() || !isSupabaseConfigured()) {
    return true;
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile?.role) {
      return false;
    }

    return roles.includes(profile.role as UserRole);
  } catch {
    return false;
  }
}

// ============================================================================
// API KEY VALIDATION
// ============================================================================

/**
 * API key format: dk_<environment>_<key>
 * Example: dk_live_abc123...
 */
const API_KEY_PREFIX = "dk_";
const API_KEY_REGEX = /^dk_(live|test)_[a-zA-Z0-9]{32,}$/;

export interface ApiKeyInfo {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
}

/**
 * Validate and lookup an API key
 * Returns null when auth is disabled
 */
export async function validateApiKey(
  apiKey: string,
): Promise<ApiKeyInfo | null> {
  // When auth is disabled, API keys are not validated
  if (!isAuthEnabled() || !isSupabaseConfigured()) {
    return null;
  }

  // Quick format check
  if (!apiKey.startsWith(API_KEY_PREFIX) || !API_KEY_REGEX.test(apiKey)) {
    return null;
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Hash the key for lookup (store hashed, compare hashed)
    const keyHash = await hashApiKey(apiKey);

    const { data: keyRecord, error } = await supabase
      .from("api_keys")
      .select(
        "id, user_id, name, key_prefix, is_active, last_used_at, expires_at",
      )
      .eq("key_hash", keyHash)
      .single();

    if (error || !keyRecord) {
      return null;
    }

    // Check if key is active
    if (!keyRecord.is_active) {
      return null;
    }

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return null;
    }

    // Update last used timestamp (fire and forget)
    supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id)
      .then(() => {});

    return {
      id: keyRecord.id,
      userId: keyRecord.user_id,
      name: keyRecord.name,
      keyPrefix: keyRecord.key_prefix,
      isActive: keyRecord.is_active,
      lastUsedAt: keyRecord.last_used_at
        ? new Date(keyRecord.last_used_at)
        : null,
      expiresAt: keyRecord.expires_at ? new Date(keyRecord.expires_at) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Hash API key for secure storage/lookup
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a new API key
 */
export function generateApiKey(environment: "live" | "test" = "live"): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${API_KEY_PREFIX}${environment}_${key}`;
}

// ============================================================================
// AUTH CONTEXT FROM REQUEST
// ============================================================================

/**
 * Extract auth context from request headers
 * Supports both session cookies and API keys
 */
export async function getAuthFromRequest(
  request: Request,
): Promise<AuthContext | null> {
  // Check for API key first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer dk_")) {
    const apiKey = authHeader.slice(7); // Remove 'Bearer '
    const keyInfo = await validateApiKey(apiKey);

    if (keyInfo) {
      // Get user session for API key owner
      const permissions = await getUserPermissions(keyInfo.userId);

      return {
        userId: keyInfo.userId,
        role: "user", // API keys are always user role
        permissions,
        apiKeyId: keyInfo.id,
      };
    }

    return null;
  }

  // Fall back to session authentication
  return getSession();
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}
