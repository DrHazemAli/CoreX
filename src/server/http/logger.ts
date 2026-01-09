/**
 * ============================================================================
 * COREX: HTTP Logger
 * Description: Re-export logger for HTTP layer (backwards compatibility)
 * ============================================================================
 */

import "server-only";

// Re-export logger from lib for use in HTTP layer
export { logger } from "@/lib/logger";
