/**
 * ============================================================================
 * COREX: Security Headers Configuration
 * Description: Content Security Policy and other security headers
 * ============================================================================
 */

// ============================================================================
// CONTENT SECURITY POLICY
// ============================================================================

/**
 * CSP Directives
 */
interface CspDirectives {
  "default-src": string[];
  "script-src": string[];
  "style-src": string[];
  "img-src": string[];
  "font-src": string[];
  "connect-src": string[];
  "frame-src": string[];
  "frame-ancestors": string[];
  "object-src": string[];
  "base-uri": string[];
  "form-action": string[];
  "upgrade-insecure-requests"?: boolean;
  "block-all-mixed-content"?: boolean;
}

/**
 * Build CSP header string from directives
 */
function buildCsp(directives: CspDirectives, nonce?: string): string {
  const parts: string[] = [];
  const isDev = process.env.NODE_ENV === "development";

  for (const [directive, value] of Object.entries(directives)) {
    if (typeof value === "boolean") {
      if (value) parts.push(directive);
    } else if (Array.isArray(value)) {
      let sources = value.join(" ");
      // Add nonce for script-src and style-src in PRODUCTION only
      // In dev mode, 'unsafe-inline' is needed and nonce would disable it
      if (
        nonce &&
        !isDev &&
        (directive === "script-src" || directive === "style-src")
      ) {
        sources = `${sources} 'nonce-${nonce}'`;
      }
      parts.push(`${directive} ${sources}`);
    }
  }

  return parts.join("; ");
}

/**
 * Development CSP (more permissive)
 */
const DEV_CSP_DIRECTIVES: CspDirectives = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'", // Required for Next.js dev mode
    "'unsafe-eval'", // Required for Next.js dev mode HMR
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.github.com",
    "ws://localhost:*", // HMR
    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- Required for local development HMR
    "http://localhost:*",
  ],
  "frame-src": ["'self'"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};

/**
 * Production CSP (strict)
 */
const PROD_CSP_DIRECTIVES: CspDirectives = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'strict-dynamic'"], // Nonce will be added
  "style-src": ["'self'", "'unsafe-inline'"], // Tailwind needs inline styles
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://avatars.githubusercontent.com",
    "https://opengraph.githubassets.com",
    "https://*.supabase.co",
  ],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.github.com",
  ],
  "frame-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "upgrade-insecure-requests": true,
  "block-all-mixed-content": true,
};

/**
 * Get CSP header based on environment
 */
export function getContentSecurityPolicy(nonce?: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const directives = isDev ? DEV_CSP_DIRECTIVES : PROD_CSP_DIRECTIVES;
  return buildCsp(directives, nonce);
}

// ============================================================================
// ALL SECURITY HEADERS
// ============================================================================

/**
 * Security headers for all responses
 */
export interface SecurityHeadersConfig {
  /** Content Security Policy */
  csp: string;
  /** Prevent MIME type sniffing */
  contentTypeOptions: string;
  /** Prevent clickjacking */
  frameOptions: string;
  /** XSS Protection (disabled in favor of CSP) */
  xssProtection: string;
  /** Control referrer information */
  referrerPolicy: string;
  /** Restrict browser features */
  permissionsPolicy: string;
  /** HTTPS enforcement (production only) */
  hsts?: string;
  /** Cross-origin isolation */
  coep?: string;
  coop?: string;
  corp?: string;
}

/**
 * Get all security headers
 */
export function getSecurityHeaders(nonce?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Security-Policy": getContentSecurityPolicy(nonce),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0", // Disabled - CSP is better
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()", // Disable FLoC
    ].join(", "),
  };

  // Add HSTS in production
  if (process.env.NODE_ENV === "production") {
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains; preload";
  }

  // Cross-origin isolation (optional, can break some features)
  // headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
  // headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  // headers['Cross-Origin-Resource-Policy'] = 'same-origin';

  return headers;
}

// ============================================================================
// NONCE GENERATION
// ============================================================================

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

// ============================================================================
// HEADER APPLICATION
// ============================================================================

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(headers: Headers, nonce?: string): void {
  const securityHeaders = getSecurityHeaders(nonce);

  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
}

// ============================================================================
// NEXT.JS CONFIG HEADERS
// ============================================================================

/**
 * Security headers for next.config.ts
 * Use this in the headers() function
 */
export const NEXT_SECURITY_HEADERS = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "0",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()",
  },
];

/**
 * HSTS header (add separately for production)
 */
export const HSTS_HEADER = {
  key: "Strict-Transport-Security",
  value: "max-age=31536000; includeSubDomains; preload",
};
