/**
 * ============================================================================
 * COREX: Request Context
 * Description: Zero-trust request context with security metadata
 * Extracts and validates all request properties upfront
 * ============================================================================
 */

import "server-only";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import type {
  RequestContext,
  AuthContext,
  SecurityContext,
  Permission,
} from "@/server/security/types";

// ============================================================================
// REQUEST ID GENERATION
// ============================================================================

/**
 * Generate a unique request ID
 * Format: req_<timestamp>_<random>
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = nanoid(12);
  return `req_${timestamp}_${random}`;
}

// ============================================================================
// IP EXTRACTION
// ============================================================================

/**
 * Trusted proxy headers in order of preference
 */
const IP_HEADERS = [
  "cf-connecting-ip", // Cloudflare
  "x-real-ip", // Nginx
  "x-forwarded-for", // Standard proxy
  "x-client-ip", // Apache
  "true-client-ip", // Akamai
] as const;

/**
 * Extract client IP from request headers
 * Handles proxy chains safely
 */
export function extractClientIp(headersList: Headers): string {
  for (const headerName of IP_HEADERS) {
    const value = headersList.get(headerName);
    if (value) {
      // X-Forwarded-For can have multiple IPs: client, proxy1, proxy2
      // First IP is the original client
      const firstIp = value.split(",")[0]?.trim();
      if (firstIp && isValidIp(firstIp)) {
        return firstIp;
      }
    }
  }

  return "unknown";
}

/**
 * Basic IP validation (IPv4 and IPv6)
 */
function isValidIp(ip: string): boolean {
  // IPv4: xxx.xxx.xxx.xxx - anchored pattern for safety
  const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  // IPv6: simplified check - anchored pattern
  const ipv6Regex = /^[0-9a-fA-F:]{2,39}$/;

  if (ipv4Regex.test(ip)) {
    return ip.split(".").every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
}

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

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python/i,
  /http/i,
  /fetch/i,
];

/**
 * Parse User-Agent header
 */
export function parseUserAgent(ua: string | null): ParsedUserAgent {
  const raw = ua || "unknown";

  const isBot = BOT_PATTERNS.some((pattern) => pattern.test(raw));
  const isMobile = /mobile|android|iphone|ipad/i.test(raw);

  // Simple browser detection
  let browser: string | undefined;
  if (/chrome/i.test(raw) && !/edge/i.test(raw)) browser = "Chrome";
  else if (/safari/i.test(raw) && !/chrome/i.test(raw)) browser = "Safari";
  else if (/firefox/i.test(raw)) browser = "Firefox";
  else if (/edge/i.test(raw)) browser = "Edge";

  // Simple OS detection
  let os: string | undefined;
  if (/windows/i.test(raw)) os = "Windows";
  else if (/mac/i.test(raw)) os = "macOS";
  else if (/linux/i.test(raw)) os = "Linux";
  else if (/android/i.test(raw)) os = "Android";
  else if (/iphone|ipad/i.test(raw)) os = "iOS";

  return { raw, isBot, isMobile, browser, os };
}

// ============================================================================
// SECURITY CONTEXT BUILDER
// ============================================================================

/**
 * Build security context from request
 */
export function buildSecurityContext(
  headersList: Headers,
  requestId: string,
): SecurityContext {
  return {
    requestId,
    timestamp: new Date(),
    ip: extractClientIp(headersList),
    userAgent: parseUserAgent(headersList.get("user-agent")),
    origin: headersList.get("origin") || undefined,
    referer: headersList.get("referer") || undefined,
    contentType: headersList.get("content-type") || undefined,
  };
}

// ============================================================================
// REQUEST CONTEXT BUILDER
// ============================================================================

export interface CreateContextOptions {
  request?: Request;
  auth?: AuthContext | null;
}

/**
 * Create a full request context with security metadata
 * Call this at the start of every API route handler
 */
export async function createRequestContext(
  options: CreateContextOptions = {},
): Promise<RequestContext> {
  const headersList = await headers();
  const requestId = generateRequestId();

  const securityContext = buildSecurityContext(headersList, requestId);

  return {
    ...securityContext,
    auth: options.auth || null,
    request: options.request || null,
  };
}

/**
 * Create request context from a Request object
 * Use this in middleware or API routes with direct request access
 */
export function createRequestContextFromRequest(
  request: Request,
  auth?: AuthContext | null,
): RequestContext {
  const requestId = generateRequestId();
  const headersList = request.headers;

  const securityContext = buildSecurityContext(headersList, requestId);

  return {
    ...securityContext,
    auth: auth || null,
    request,
  };
}

// ============================================================================
// CONTEXT HELPERS
// ============================================================================

/**
 * Check if request is authenticated
 */
export function isAuthenticated(ctx: RequestContext): ctx is RequestContext & {
  auth: AuthContext;
} {
  return ctx.auth !== null && ctx.auth.userId !== undefined;
}

/**
 * Check if request is from a bot
 */
export function isBot(ctx: RequestContext): boolean {
  return ctx.userAgent.isBot;
}

/**
 * Check if request has specific permission
 */
export function hasPermission(
  ctx: RequestContext,
  permission: Permission,
): boolean {
  if (!ctx.auth) return false;
  return ctx.auth.permissions.includes(permission);
}

/**
 * Check if request has any of the specified roles
 */
export function hasRole(ctx: RequestContext, ...roles: string[]): boolean {
  if (!ctx.auth) return false;
  return roles.includes(ctx.auth.role);
}

/**
 * Get user ID or throw
 */
export function requireUserId(ctx: RequestContext): string {
  if (!ctx.auth?.userId) {
    throw new Error("Authentication required");
  }
  return ctx.auth.userId;
}
