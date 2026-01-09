/**
 * ============================================================================
 * COREX: Role Utilities
 * Description: Centralized role checking utilities for client and server
 *
 * This module provides consistent role hierarchy checks across the application.
 * Role hierarchy: super_admin > admin > moderator > user
 *
 * Usage:
 * - Client: import { isAdmin, hasAdminAccess } from "@/lib/auth/roles"
 * - Server: use @/server/auth for full auth context with permissions
 * ============================================================================
 */

import type { UserRole } from "@/server/security/types";

/**
 * Type for role input that accepts UserRole, string, or undefined.
 * Used for flexible role checking in components.
 */
export type RoleInput = UserRole | string | undefined;

/**
 * Valid roles for type guard
 */
const VALID_ROLES = new Set<string>([
  "user",
  "moderator",
  "admin",
  "super_admin",
]);

/**
 * Check if a value is a valid UserRole
 */
function isValidRole(role: unknown): role is UserRole {
  return typeof role === "string" && VALID_ROLES.has(role);
}

/**
 * Safely get the hierarchy level for a role.
 * Returns -1 for invalid roles.
 */
function getRoleLevel(role: UserRole): number {
  switch (role) {
    case "user":
      return 0;
    case "moderator":
      return 1;
    case "admin":
      return 2;
    case "super_admin":
      return 3;
    default:
      return -1;
  }
}

/**
 * Roles that have administrative access to the dashboard admin section.
 * Includes moderator for read access, admin and super_admin for full access.
 */
const ADMIN_ROLES: UserRole[] = ["moderator", "admin", "super_admin"];

/**
 * Roles with full administrative privileges (can modify settings, users, etc.)
 */
const FULL_ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];

/**
 * Check if a role has administrative access (admin panel visibility).
 * Includes moderators who have limited read access.
 *
 * @param role - User's role
 * @returns true if user can access admin features
 *
 * @example
 * ```tsx
 * if (hasAdminAccess(user.role)) {
 *   showAdminNav();
 * }
 * ```
 */
export function hasAdminAccess(role: RoleInput): boolean {
  if (!isValidRole(role)) return false;
  return ADMIN_ROLES.includes(role);
}

/**
 * Check if a role has full admin privileges.
 * Excludes moderators - only admin and super_admin.
 *
 * @param role - User's role
 * @returns true if user has full admin privileges
 */
export function isFullAdmin(role: RoleInput): boolean {
  if (!isValidRole(role)) return false;
  return FULL_ADMIN_ROLES.includes(role);
}

/**
 * Check if a role is super_admin.
 *
 * @param role - User's role
 * @returns true if user is super_admin
 */
export function isSuperAdmin(role: RoleInput): boolean {
  return role === "super_admin";
}

/**
 * Check if a role is at least a moderator.
 *
 * @param role - User's role
 * @returns true if user is moderator or higher
 */
export function isModerator(role: RoleInput): boolean {
  if (!isValidRole(role)) return false;
  return getRoleLevel(role) >= getRoleLevel("moderator");
}

/**
 * Compare two roles to check if the first has higher or equal privileges.
 *
 * @param role - User's role to check
 * @param requiredRole - Minimum required role
 * @returns true if role >= requiredRole in hierarchy
 *
 * @example
 * ```tsx
 * if (hasRoleOrHigher(user.role, "moderator")) {
 *   // User is at least moderator
 * }
 * ```
 */
export function hasRoleOrHigher(
  role: RoleInput,
  requiredRole: UserRole,
): boolean {
  if (!isValidRole(role)) return false;
  return getRoleLevel(role) >= getRoleLevel(requiredRole);
}

/**
 * Get the display name for a role.
 *
 * @param role - User's role
 * @returns Human-readable role name
 */
export function getRoleDisplayName(role: RoleInput): string {
  if (!isValidRole(role)) return "Unknown";
  switch (role) {
    case "user":
      return "User";
    case "moderator":
      return "Moderator";
    case "admin":
      return "Admin";
    case "super_admin":
      return "Super Admin";
    default:
      return "Unknown";
  }
}

/**
 * Get all available roles.
 * Useful for admin dropdowns and role selection.
 */
export function getAllRoles(): UserRole[] {
  return ["user", "moderator", "admin", "super_admin"];
}

/**
 * Get roles that a given role can assign to others.
 * Users can only assign roles lower than their own.
 *
 * @param assignerRole - Role of the user assigning
 * @returns Array of roles that can be assigned
 */
export function getAssignableRoles(assignerRole: RoleInput): UserRole[] {
  if (!isValidRole(assignerRole)) return [];

  const assignerLevel = getRoleLevel(assignerRole);

  return getAllRoles().filter((role) => getRoleLevel(role) < assignerLevel);
}
