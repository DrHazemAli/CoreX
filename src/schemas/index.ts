/**
 * ============================================================================
 * COREX: API Schemas Index
 * Description: Central export for all API schemas
 *
 * Architecture:
 * -------------
 * src/schemas/
 * ├── api/
 * │   ├── v1/           → Public API v1 schemas
 * │   │   ├── sample.ts → Sample endpoint schemas
 * │   │   └── index.ts
 * │   └── internal/     → Internal API schemas
 * │       ├── health.ts → Health check schemas
 * │       └── index.ts
 * └── index.ts          → This file
 *
 * Usage:
 * ------
 * ```ts
 * // Import specific schemas
 * import { sampleGetQuerySchema, type SampleGetResponse } from "@/schemas/api/v1";
 *
 * // Import internal schemas
 * import { healthCheckResponseSchema } from "@/schemas/api/internal";
 * ```
 *
 * Key Principles:
 * ---------------
 * 1. Schemas are the SINGLE SOURCE OF TRUTH for API contracts
 * 2. Types are INFERRED from schemas (never manually duplicated)
 * 3. Schemas are organized by API version (v1, v2, etc.)
 * 4. Internal APIs have separate schemas from public APIs
 * ============================================================================
 */

// Public API v1
export * from "./api/v1";

// Internal API
export * as internal from "./api/internal";
