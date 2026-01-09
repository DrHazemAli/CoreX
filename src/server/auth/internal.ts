/**
 * ============================================================================
 * COREX: Internal API Authentication
 * Description: Security middleware for internal API endpoints
 * ============================================================================
 */

import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { RequestContext } from "@/server/http/responses";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Internal API authentication result
 */
export interface InternalAuthResult {
  authenticated: boolean;
  error?: string;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Verify internal API secret
 */
export function verifyInternalSecret(request: Request): InternalAuthResult {
  const secret = request.headers.get("x-internal-secret");

  // Check if internal secret is configured
  if (!env.INTERNAL_API_SECRET) {
    logger.warn("Internal API secret not configured");

    // In development, allow without secret
    if (env.NODE_ENV === "development") {
      return { authenticated: true };
    }

    return {
      authenticated: false,
      error: "Internal API not configured",
    };
  }

  // Verify secret
  if (!secret) {
    return {
      authenticated: false,
      error: "Missing x-internal-secret header",
    };
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(secret, env.INTERNAL_API_SECRET)) {
    return {
      authenticated: false,
      error: "Invalid internal secret",
    };
  }

  return { authenticated: true };
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware to require internal authentication
 */
export function requireInternalAuth(
  request: Request,
  context: RequestContext,
): InternalAuthResult {
  const result = verifyInternalSecret(request);

  if (!result.authenticated) {
    logger.warn("Internal auth failed", {
      requestId: context.requestId,
      path: context.path,
      error: result.error,
      ip: context.ip,
    });
  }

  return result;
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify GitHub webhook signature
 */
export async function verifyGitHubWebhook(
  request: Request,
  secret: string,
): Promise<boolean> {
  const signature = request.headers.get("x-hub-signature-256");

  if (!signature) {
    return false;
  }

  const body = await request.text();

  // Compute expected signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body),
  );

  const expectedSignature =
    "sha256=" +
    Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return timingSafeEqual(signature, expectedSignature);
}
