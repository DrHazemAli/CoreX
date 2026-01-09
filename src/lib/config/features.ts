/**
 * ============================================================================
 * COREX: Feature Flags Configuration
 * Description: Centralized feature toggles configurable via environment
 *
 * This enables CoreX to work as a minimal starter template where services
 * like Supabase auth and database are opt-in, not required.
 *
 * ENVIRONMENT VARIABLES:
 * - NEXT_PUBLIC_ENABLE_AUTH: Enable Supabase authentication ("0" | "1")
 * - NEXT_PUBLIC_ENABLE_DATABASE: Enable database features ("0" | "1")
 * - NEXT_PUBLIC_ENABLE_PERMISSIONS: Enable permission system ("0" | "1")
 * - NEXT_PUBLIC_ENABLE_JOBS: Enable job queue system ("0" | "1")
 * ============================================================================
 */

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Feature flag configuration
 * All features default to DISABLED for a clean starter template
 */
export const features = {
  /**
   * Enable Supabase authentication
   * When disabled:
   * - Auth routes render but auth actions are no-ops
   * - Protected routes are accessible (no auth check)
   * - Session helpers return null/mock data
   */
  auth: process.env.NEXT_PUBLIC_ENABLE_AUTH === "1",

  /**
   * Enable database features
   * When disabled:
   * - DAL functions return mock data or throw clear errors
   * - Repository pattern works with in-memory/mock implementations
   */
  database: process.env.NEXT_PUBLIC_ENABLE_DATABASE === "1",

  /**
   * Enable permission system (requires auth + database)
   * When disabled:
   * - PermissionGate renders children unconditionally
   * - hasPermission/hasRole return true
   */
  permissions: process.env.NEXT_PUBLIC_ENABLE_PERMISSIONS === "1",

  /**
   * Enable job queue system
   * When disabled:
   * - dispatch() logs warning and returns immediately
   * - dispatchSync() still works (inline execution)
   * - Worker endpoints return early
   */
  jobs: process.env.NEXT_PUBLIC_ENABLE_JOBS === "1",
} as const;

// ============================================================================
// FEATURE CHECKS
// ============================================================================

/**
 * Check if authentication is enabled
 */
export function isAuthEnabled(): boolean {
  return features.auth;
}

/**
 * Check if database features are enabled
 */
export function isDatabaseEnabled(): boolean {
  return features.database;
}

/**
 * Check if permission system is enabled
 * Requires both auth and database
 */
export function isPermissionsEnabled(): boolean {
  return features.permissions && features.auth && features.database;
}

/**
 * Check if job queue system is enabled
 */
export function isJobsEnabled(): boolean {
  return features.jobs;
}

/**
 * Check if Supabase is fully configured
 * This checks for required environment variables
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type FeatureFlags = typeof features;
export type FeatureKey = keyof FeatureFlags;
