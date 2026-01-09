/**
 * ============================================================================
 * COREX: Data Access Layer Exports
 * Description: Public API for database operations
 *
 * The DAL provides a clean abstraction over database operations,
 * centralizing all SQL queries and providing type-safe interfaces.
 *
 * ARCHITECTURE NOTES:
 * - All database queries should go through DAL repositories
 * - The DAL is server-only - never import in client components
 * - Each repository handles one domain (jobs, repos, rankings, etc.)
 * - Database features require NEXT_PUBLIC_ENABLE_DATABASE=1
 *
 * AVAILABLE REPOSITORIES:
 * - JobsRepository: Job queue operations (push, pop, complete, fail)
 * - RankingsRepository: Rankings data access (future)
 * - ReposRepository: Repository data access (future)
 *
 * @example
 * ```typescript
 * // In a server component or API route
 * import { getAdminClient, JobsRepository } from '@/dal';
 *
 * // Direct database access (when needed)
 * const client = await getAdminClient();
 *
 * // Job queue operations (preferred)
 * const jobId = await JobsRepository.push('default', {
 *   type: 'send-email',
 *   payload: { to: 'user@example.com' }
 * });
 * ```
 * ============================================================================
 */

import "server-only";

// ============================================================================
// DATABASE CLIENT
// Description: Low-level database access for advanced use cases
// ============================================================================

export { getAdminClient, createAdminClient } from "./db";

// ============================================================================
// DATABASE TYPES
// Description: Type definitions for database entities
// ============================================================================

export type { DbRepository, DbRepositorySnapshot } from "./db";

// ============================================================================
// REPOSITORIES
// Description: High-level data access for each domain
// ============================================================================

/**
 * Jobs Repository
 *
 * Provides type-safe job queue operations:
 * - push: Add a job to the queue
 * - pop: Get the next available job
 * - complete: Mark a job as done
 * - fail: Mark a job as failed
 * - release: Return job to queue for retry
 *
 * @see src/dal/jobs.repo.ts for full API documentation
 */
export { JobsRepository } from "./jobs.repo";
