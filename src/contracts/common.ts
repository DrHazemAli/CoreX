/**
 * ============================================================================
 * COREX: Common Zod Schemas
 * Description: Reusable validation schemas with strict security
 * ============================================================================
 */

import { z } from "zod";

// ============================================================================
// PRIMITIVE VALIDATORS
// ============================================================================

/**
 * Safe string: trimmed, no null bytes, reasonable length
 */
export const safeString = (maxLength = 1000) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .refine((s) => !s.includes("\0"), "Null bytes not allowed")
    .refine((s) => !s.includes("\u0000"), "Null bytes not allowed");

/**
 * UUID v4 format validation
 */
export const uuid = z.string().uuid("Invalid UUID format").toLowerCase();

/**
 * Email validation (basic format)
 */
export const email = z
  .string()
  .email("Invalid email format")
  .max(254, "Email too long")
  .toLowerCase()
  .trim();

/**
 * URL validation (http/https only)
 */
export const httpUrl = z
  .string()
  .url("Invalid URL format")
  .refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    "URL must use http or https protocol",
  )
  // eslint-disable-next-line sonarjs/code-eval -- Safe: this is a validation check, not execution
  .refine((url) => !url.includes("javascript:"), "JavaScript URLs not allowed");

/**
 * Slug validation (URL-safe string)
 */
export const slug = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
    "Must be lowercase alphanumeric with hyphens",
  );

/**
 * GitHub owner/repo name validation
 */
export const githubName = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/,
    "Invalid GitHub name format",
  );

/**
 * Safe integer within bounds
 */
export const safeInt = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z.coerce.number().int().min(min).max(max);

/**
 * Positive integer
 */
export const positiveInt = z.coerce.number().int().positive();

/**
 * Non-negative integer
 */
export const nonNegativeInt = z.coerce.number().int().nonnegative();

/**
 * Percentage (0-100)
 */
export const percentage = z.coerce.number().min(0).max(100);

/**
 * Score (0-100)
 */
export const score = z.coerce.number().min(0).max(100);

/**
 * ISO date string
 */
export const isoDate = z
  .string()
  .datetime({ message: "Invalid ISO date format" });

/**
 * Date string (YYYY-MM-DD)
 */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format");

// ============================================================================
// PAGINATION
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPaginationParams = z.infer<typeof cursorPaginationSchema>;

// ============================================================================
// SORTING
// ============================================================================

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

export const createSortSchema = <T extends readonly string[]>(columns: T) =>
  z.object({
    sortBy: z.enum(columns as unknown as [string, ...string[]]).optional(),
    sortOrder: sortOrderSchema,
  });

// ============================================================================
// FILTERING
// ============================================================================

/**
 * Language filter (programming language)
 */
export const languageFilter = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-zA-Z0-9+#.]+$/, "Invalid language format")
  .optional();

/**
 * Topic/tag filter
 */
export const topicFilter = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Invalid topic format")
  .optional();

/**
 * Date range filter
 */
export const dateRangeSchema = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    { message: "From date must be before or equal to To date" },
  );

/**
 * Score range filter
 */
export const scoreRangeSchema = z
  .object({
    min: score.optional(),
    max: score.optional(),
  })
  .refine(
    (data) => {
      if (data.min !== undefined && data.max !== undefined) {
        return data.min <= data.max;
      }
      return true;
    },
    { message: "Min score must be less than or equal to max score" },
  );

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Search query validation
 */
export const searchQuerySchema = z
  .string()
  .min(1, "Search query required")
  .max(200, "Search query too long")
  .trim()
  // Remove potential SQL injection patterns
  .refine(
    (s) => !/(--|;|\/\*|\*\/|xp_|sp_)/i.test(s),
    "Invalid characters in search query",
  );

// ============================================================================
// API KEY
// ============================================================================

export const apiKeySchema = z
  .string()
  .min(32)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid API key format");

// ============================================================================
// INTERNAL SECRET
// ============================================================================

export const internalSecretSchema = z
  .string()
  .min(32)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid internal secret format");

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create a schema that strips unknown keys (extra security)
 */
export function strictSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict();
}

/**
 * Parse and validate with detailed error extraction
 */
export function safeParse<T extends z.ZodSchema>(
  schema: T,
  data: unknown,
):
  | { success: true; data: z.infer<T> }
  | { success: false; errors: Array<{ field: string; message: string }> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
  }));

  return { success: false, errors };
}

/**
 * Coalesce empty string to undefined (for optional params)
 */
export const emptyToUndefined = z
  .string()
  .transform((s) => (s === "" ? undefined : s));

/**
 * Transform string to array (comma-separated)
 */
export const stringToArray = z.string().transform((s) =>
  s
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);

/**
 * Optional but when present must be valid
 */
export const optionalValid = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([z.literal("").transform(() => undefined), schema]).optional();

// ============================================================================
// EXPORTS
// ============================================================================

export const schemas = {
  safeString,
  uuid,
  email,
  httpUrl,
  slug,
  githubName,
  safeInt,
  positiveInt,
  nonNegativeInt,
  percentage,
  score,
  isoDate,
  dateString,
  pagination: paginationSchema,
  cursorPagination: cursorPaginationSchema,
  sortOrder: sortOrderSchema,
  createSort: createSortSchema,
  languageFilter,
  topicFilter,
  dateRange: dateRangeSchema,
  scoreRange: scoreRangeSchema,
  searchQuery: searchQuerySchema,
  apiKey: apiKeySchema,
  internalSecret: internalSecretSchema,
};
