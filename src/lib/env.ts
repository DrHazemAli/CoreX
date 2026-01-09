/**
 * ============================================================================
 * COREX: Environment Configuration
 * Description: Type-safe environment variables with validation
 * ============================================================================
 */

import { z } from "zod";

// ============================================================================
// ENVIRONMENT SCHEMA
// ============================================================================

const envSchema = z.object({
  // Supabase (optional - only required when auth/database enabled)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Internal API Security
  INTERNAL_API_SECRET: z.string().min(32).optional(),

  // Core Feature Flags (control what services are enabled)
  NEXT_PUBLIC_ENABLE_AUTH: z.enum(["0", "1"]).default("0"),
  NEXT_PUBLIC_ENABLE_DATABASE: z.enum(["0", "1"]).default("0"),
  NEXT_PUBLIC_ENABLE_PERMISSIONS: z.enum(["0", "1"]).default("0"),
  NEXT_PUBLIC_ENABLE_JOBS: z.enum(["0", "1"]).default("0"),

  // Infrastructure Feature Flags
  FEATURE_REDIS: z.enum(["0", "1"]).default("0"),
  FEATURE_RATE_LIMIT: z.enum(["0", "1"]).default("0"),
  FEATURE_RESPONSE_CACHE: z.enum(["0", "1"]).default("0"),

  // Job Queue Configuration
  JOB_QUEUE_DRIVER: z.enum(["memory", "database", "sync"]).default("memory"),
  JOB_DEFAULT_QUEUE: z.string().default("default"),
  JOB_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  JOB_TIMEOUT: z.coerce.number().int().positive().default(60000),
  JOB_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  JOB_WORKER_POLL_INTERVAL: z.coerce.number().int().positive().default(1000),
  JOB_WORKER_SHUTDOWN_TIMEOUT: z.coerce
    .number()
    .int()
    .positive()
    .default(30000),

  // Redis/Upstash (optional)
  UPSTASH_REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),

  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

// ============================================================================
// PARSED ENVIRONMENT
// ============================================================================

/**
 * Parse and validate environment variables
 * Will throw if required variables are missing in production
 */
function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());

    // In production, throw error
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables");
    }

    // In development, return partial env with defaults
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
      NEXT_PUBLIC_ENABLE_AUTH:
        (process.env.NEXT_PUBLIC_ENABLE_AUTH as "0" | "1") ?? "0",
      NEXT_PUBLIC_ENABLE_DATABASE:
        (process.env.NEXT_PUBLIC_ENABLE_DATABASE as "0" | "1") ?? "0",
      NEXT_PUBLIC_ENABLE_PERMISSIONS:
        (process.env.NEXT_PUBLIC_ENABLE_PERMISSIONS as "0" | "1") ?? "0",
      NEXT_PUBLIC_ENABLE_JOBS:
        (process.env.NEXT_PUBLIC_ENABLE_JOBS as "0" | "1") ?? "0",
      FEATURE_REDIS: "0" as const,
      FEATURE_RATE_LIMIT: "0" as const,
      FEATURE_RESPONSE_CACHE: "0" as const,
      JOB_QUEUE_DRIVER:
        (process.env.JOB_QUEUE_DRIVER as "memory" | "database" | "sync") ??
        "memory",
      JOB_DEFAULT_QUEUE: process.env.JOB_DEFAULT_QUEUE ?? "default",
      JOB_MAX_ATTEMPTS: parseInt(process.env.JOB_MAX_ATTEMPTS ?? "3", 10),
      JOB_TIMEOUT: parseInt(process.env.JOB_TIMEOUT ?? "60000", 10),
      JOB_WORKER_CONCURRENCY: parseInt(
        process.env.JOB_WORKER_CONCURRENCY ?? "1",
        10,
      ),
      JOB_WORKER_POLL_INTERVAL: parseInt(
        process.env.JOB_WORKER_POLL_INTERVAL ?? "1000",
        10,
      ),
      JOB_WORKER_SHUTDOWN_TIMEOUT: parseInt(
        process.env.JOB_WORKER_SHUTDOWN_TIMEOUT ?? "30000",
        10,
      ),
      UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
      UPSTASH_REDIS_TOKEN: process.env.UPSTASH_REDIS_TOKEN,
      NODE_ENV:
        (process.env.NODE_ENV as "development" | "production" | "test") ??
        "development",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };
  }

  return result.data;
}

export const env = parseEnv();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if we're in production
 */
export function isProduction(): boolean {
  return env.NODE_ENV === "production";
}

/**
 * Check if we're in development
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === "development";
}

/**
 * Check if Redis is enabled
 */
export function isRedisEnabled(): boolean {
  return env.FEATURE_REDIS === "1" && !!env.UPSTASH_REDIS_URL;
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitEnabled(): boolean {
  return env.FEATURE_RATE_LIMIT === "1";
}

/**
 * Check if response caching is enabled
 */
export function isResponseCacheEnabled(): boolean {
  return env.FEATURE_RESPONSE_CACHE === "1";
}

/**
 * Get the application URL
 */
export function getAppUrl(): string {
  return env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
