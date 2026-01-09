/**
 * ============================================================================
 * COREX: Input Sanitization Utilities
 * Description: XSS prevention, object injection protection, safe parsing
 * ============================================================================
 */

import "server-only";

// ============================================================================
// HTML/XSS SANITIZATION
// ============================================================================

/**
 * HTML entity map for escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== "string") return "";
  // eslint-disable-next-line security/detect-object-injection -- Safe: char comes from regex match on known characters
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(str: string): string {
  if (typeof str !== "string") return "";
  // eslint-disable-next-line sonarjs/slow-regex -- Simple negated character class, bounded by string length
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize string for safe display (escape + strip dangerous patterns)
 */
export function sanitizeString(str: string): string {
  if (typeof str !== "string") return "";

  // Remove null bytes
  let sanitized = str.replace(/\0/g, "");

  // Remove JavaScript protocol
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: URIs (can contain scripts)
  sanitized = sanitized.replace(/data:/gi, "");

  // Remove vbscript protocol
  sanitized = sanitized.replace(/vbscript:/gi, "");

  // Remove on* event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, "");

  return sanitized.trim();
}

// ============================================================================
// URL SANITIZATION
// ============================================================================

/**
 * List of allowed URL protocols
 */
const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];

/**
 * Sanitize and validate a URL
 * Returns null if the URL is invalid or uses a disallowed protocol
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== "string") return null;

  try {
    const parsed = new URL(url);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return null;
    }

    // Return the sanitized URL
    return parsed.href;
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Check if a URL is safe for redirect (same origin or allowed domains)
 */
export function isSafeRedirectUrl(
  url: string,
  allowedDomains: string[] = [],
): boolean {
  if (typeof url !== "string") return false;

  // Relative URLs are safe
  if (url.startsWith("/") && !url.startsWith("//")) {
    return true;
  }

  try {
    const parsed = new URL(url);

    // Must be HTTPS (or HTTP for localhost in dev)
    if (parsed.protocol !== "https:") {
      if (
        parsed.protocol === "http:" &&
        parsed.hostname !== "localhost" &&
        parsed.hostname !== "127.0.0.1"
      ) {
        return false;
      }
    }

    // Check allowed domains
    if (allowedDomains.length > 0) {
      return allowedDomains.some(
        (domain) =>
          parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
      );
    }

    return false;
  } catch {
    return false;
  }
}

// ============================================================================
// OBJECT INJECTION PROTECTION
// ============================================================================

/**
 * Dangerous keys that should never be in user input
 */
const DANGEROUS_KEYS = [
  "__proto__",
  "constructor",
  "prototype",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
];

/**
 * Check if a key is dangerous (prototype pollution)
 */
export function isDangerousKey(key: string): boolean {
  return DANGEROUS_KEYS.includes(key);
}

/**
 * Safely parse JSON with prototype pollution protection
 */
export function safeJsonParse<T = unknown>(
  json: string,
  defaultValue: T | null = null,
): T | null {
  if (typeof json !== "string") return defaultValue;

  try {
    const parsed = JSON.parse(json, (key, value) => {
      // Block dangerous keys
      if (isDangerousKey(key)) {
        return undefined;
      }
      return value;
    });

    return parsed as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Deep clone an object safely (without prototype pollution)
 */
export function safeDeepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(safeDeepClone) as T;
  }

  const cloned: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    // Skip dangerous keys
    if (isDangerousKey(key)) continue;

    // eslint-disable-next-line security/detect-object-injection -- Safe: key comes from Object.keys()
    cloned[key] = safeDeepClone((obj as Record<string, unknown>)[key]);
  }

  return cloned as T;
}

/**
 * Sanitize an object recursively (remove dangerous keys and sanitize strings)
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    maxDepth?: number;
    sanitizeStrings?: boolean;
    allowedKeys?: string[];
  } = {},
): T {
  const { maxDepth = 10, sanitizeStrings = true, allowedKeys } = options;

  function sanitizeRecursive(value: unknown, depth: number): unknown {
    // Max depth protection
    if (depth > maxDepth) {
      return undefined;
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle strings
    if (typeof value === "string") {
      return sanitizeStrings ? sanitizeString(value) : value;
    }

    // Handle primitives
    if (typeof value !== "object") {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeRecursive(item, depth + 1));
    }

    // Handle objects
    const sanitized: Record<string, unknown> = {};

    for (const key of Object.keys(value)) {
      // Skip dangerous keys
      if (isDangerousKey(key)) continue;

      // Check allowed keys if specified
      if (allowedKeys && !allowedKeys.includes(key)) continue;

      // eslint-disable-next-line security/detect-object-injection -- Safe: key comes from Object.keys()
      sanitized[key] = sanitizeRecursive(
        // eslint-disable-next-line security/detect-object-injection -- Safe: key comes from Object.keys()
        (value as Record<string, unknown>)[key],
        depth + 1,
      );
    }

    return sanitized;
  }

  return sanitizeRecursive(obj, 0) as T;
}

// ============================================================================
// SQL INJECTION PROTECTION
// ============================================================================

/**
 * Escape a string for use in SQL LIKE patterns
 * (Supabase uses parameterized queries, but this is extra safety)
 */
export function escapeSqlLike(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Validate that a string is a safe identifier (table name, column name)
 * Only allows alphanumeric and underscores
 */
export function isSafeIdentifier(str: string): boolean {
  if (typeof str !== "string") return false;
  return /^[a-zA-Z_]\w*$/.test(str);
}

/**
 * Whitelist of allowed sort columns
 */
export function validateSortColumn(
  column: string,
  allowedColumns: string[],
): string | null {
  if (!allowedColumns.includes(column)) {
    return null;
  }
  return column;
}

/**
 * Whitelist of allowed sort orders
 */
export function validateSortOrder(order: string): "asc" | "desc" | null {
  const normalized = order.toLowerCase();
  if (normalized === "asc" || normalized === "desc") {
    return normalized;
  }
  return null;
}

// ============================================================================
// REQUEST BODY SIZE LIMITS
// ============================================================================

/**
 * Default body size limits by content type
 */
export const BODY_SIZE_LIMITS = {
  json: 1024 * 100, // 100KB for JSON
  form: 1024 * 100, // 100KB for form data
  text: 1024 * 50, // 50KB for plain text
} as const;

/**
 * Check if body size exceeds limit
 */
export function isBodyTooLarge(
  contentLength: number | undefined,
  limit: number,
): boolean {
  if (contentLength === undefined) return false;
  return contentLength > limit;
}

// ============================================================================
// FILENAME SANITIZATION
// ============================================================================

/**
 * Sanitize a filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== "string") return "";

  // Remove path separators
  let sanitized = filename.replace(/[/\\]/g, "");

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+/, "");
  // eslint-disable-next-line sonarjs/slow-regex -- Simple character class with anchor, O(n)
  sanitized = sanitized.replace(/[\s.]+$/, "");

  // Replace multiple dots with single dot
  sanitized = sanitized.replace(/\.{2,}/g, ".");

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split(".").pop() || "";
    const name = sanitized.slice(0, 250 - ext.length);
    sanitized = ext ? `${name}.${ext}` : name;
  }

  return sanitized || "unnamed";
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Basic email format validation
 * Note: For complete validation, always verify via confirmation email
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;

  // RFC 5322 simplified pattern
  // eslint-disable-next-line sonarjs/slow-regex -- Simple negated character class, bounded by email length checks below
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) return false;

  // Additional checks
  if (email.length > 254) return false;

  const [local, domain] = email.split("@");
  if (local.length > 64) return false;
  if (domain.length > 253) return false;

  return true;
}

// ============================================================================
// UUID VALIDATION
// ============================================================================

/**
 * Validate UUID v4 format
 */
export function isValidUuid(uuid: string): boolean {
  if (typeof uuid !== "string") return false;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(uuid);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const sanitize = {
  html: escapeHtml,
  stripHtml,
  string: sanitizeString,
  url: sanitizeUrl,
  object: sanitizeObject,
  filename: sanitizeFilename,
  sqlLike: escapeSqlLike,
  json: safeJsonParse,
  clone: safeDeepClone,
  isSafeRedirectUrl,
};

export const validate = {
  email: isValidEmail,
  uuid: isValidUuid,
  safeRedirect: isSafeRedirectUrl,
  safeIdentifier: isSafeIdentifier,
  sortColumn: validateSortColumn,
  sortOrder: validateSortOrder,
  dangerousKey: isDangerousKey,
};
