import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getSecurityHeaders, generateNonce } from "@/server/security/headers";
import { isAuthEnabled } from "@/lib/config";

/**
 * Protected route patterns (only enforced when auth is enabled)
 */
const protectedRoutes = ["/dashboard"];
const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];

/**
 * Security-enhanced middleware
 * 1. Updates Supabase session (when auth enabled)
 * 2. Handles route protection (when auth enabled)
 * 3. Applies security headers (CSP, HSTS, etc.)
 * 4. Adds request ID for tracing
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authEnabled = isAuthEnabled();

  // Update Supabase session and get user
  let response: NextResponse;
  let user = null;

  try {
    const result = await updateSession(request);
    response = result.response;
    user = result.user;
  } catch {
    // If session update fails, continue with a basic response
    response = NextResponse.next({ request });
  }

  // Only enforce auth redirects when auth is enabled
  if (authEnabled) {
    // Check if accessing protected routes
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route),
    );
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

    // Check authentication status from Supabase
    const isAuthenticated = !!user;

    // Redirect unauthenticated users from protected routes
    if (isProtectedRoute && !isAuthenticated) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users from auth routes to dashboard
    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Generate nonce for CSP (used for inline scripts)
  const nonce = generateNonce();

  // Apply security headers
  const securityHeaders = getSecurityHeaders(nonce);
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  // Add request ID for tracing
  const requestId = generateRequestId();
  response.headers.set("X-Request-ID", requestId);

  // Store nonce in header for server components to access
  response.headers.set("X-Nonce", nonce);

  return response;
}

/**
 * Generate unique request ID
 * Note: Using Math.random for request IDs is acceptable - these are for tracing only,
 * not for security purposes. For cryptographic randomness, use crypto.getRandomValues.
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  // eslint-disable-next-line sonarjs/pseudo-random -- Safe: request IDs are for tracing, not security
  const random = Math.random().toString(36).slice(2, 10);
  return `req_${timestamp}_${random}`;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
