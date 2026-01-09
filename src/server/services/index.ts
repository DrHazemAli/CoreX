/**
 * ============================================================================
 * COREX: Server Services Module
 * Description: Server-only services with access to secrets and databases
 *
 * This directory contains services that must only run on the server.
 * They have access to:
 * - Environment variables and API keys
 * - Direct database connections
 * - Server-side caching
 *
 * For client-safe services, see: src/services/
 *
 * Structure:
 * - src/server/services/email/    - Email sending service
 * - src/server/services/storage/  - Server-side file storage
 * ============================================================================
 */

import "server-only";

// Export server services as they are added
// export * from "./email";
// export * from "./storage";
