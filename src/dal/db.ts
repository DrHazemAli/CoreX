/**
 * ============================================================================
 * COREX: Database Client
 * Description: Server-only Supabase client for database operations
 *
 * When database is disabled (NEXT_PUBLIC_ENABLE_DATABASE=0):
 * - createAdminClient() throws a clear error
 * - getAdminClient() throws a clear error
 * ============================================================================
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isDatabaseEnabled } from "@/lib/config";

// ============================================================================
// DATABASE CLIENT
// ============================================================================

/**
 * Create a Supabase admin client with service role key
 * This bypasses RLS and should only be used server-side
 *
 * @throws {Error} When database is disabled or not configured
 */
export function createAdminClient() {
  if (!isDatabaseEnabled()) {
    throw new Error(
      "Database features are disabled. Set NEXT_PUBLIC_ENABLE_DATABASE=1 to enable.",
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Database client type (matches Supabase generic client)
type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

/**
 * Get the admin client singleton
 * Reuses the same client instance for efficiency
 *
 * @throws {Error} When database is disabled or not configured
 */
let adminClientInstance: SupabaseAdminClient | null = null;

export function getAdminClient(): SupabaseAdminClient {
  if (!adminClientInstance) {
    adminClientInstance = createAdminClient();
  }
  return adminClientInstance;
}

// ============================================================================
// DATABASE TYPES
// These mirror the Supabase table structures
// ============================================================================

/**
 * Repository row from database
 */
export interface DbRepository {
  id: string;
  github_id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  homepage_url: string | null;
  language: string | null;
  topics: string[];
  stars_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  is_fork: boolean;
  is_archived: boolean;
  is_template: boolean;
  has_wiki: boolean;
  has_issues: boolean;
  has_discussions: boolean;
  license_key: string | null;
  license_name: string | null;
  github_created_at: string | null;
  github_updated_at: string | null;
  github_pushed_at: string | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

/**
 * Repository snapshot row from database
 */
export interface DbRepositorySnapshot {
  id: string;
  repository_id: string;
  snapshot_date: string;
  stars_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  commits_count: number;
  contributors_count: number;
  releases_count: number;
  commits_last_30d: number;
  prs_opened_last_30d: number;
  prs_merged_last_30d: number;
  issues_opened_last_30d: number;
  issues_closed_last_30d: number;
  created_at: string;
}

/**
 * Repository score row from database
 */
export interface DbRepositoryScore {
  id: string;
  repository_id: string;
  computed_at: string;
  overall_score: number;
  activity_score: number;
  community_score: number;
  maintenance_score: number;
  popularity_score: number;
  quality_score: number;
  score_breakdown: Record<string, unknown>;
  algorithm_version: string;
  created_at: string;
}

/**
 * Repository ranking row from database
 */
export interface DbRepositoryRanking {
  id: string;
  period: string;
  as_of: string;
  ranking_type: string;
  language: string | null;
  repository_id: string;
  rank: number;
  score: number;
  rank_change: number;
  ranking_explanation: Record<string, unknown>;
  created_at: string;
}

/**
 * Job queue row from database
 */
export interface DbJob {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: string;
  priority: number;
  run_at: string;
  locked_at: string | null;
  locked_by: string | null;
  attempt: number;
  max_attempts: number;
  last_error: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Repository signal row from database
 */
export interface DbRepositorySignal {
  id: string;
  repository_id: string;
  signal_type: string;
  signal_data: Record<string, unknown>;
  github_id: string | null;
  occurred_at: string;
  created_at: string;
}

/**
 * Report row from database
 */
export interface DbReport {
  id: string;
  title: string;
  description: string | null;
  repository_ids: string[];
  config: Record<string, unknown>;
  is_public: boolean;
  share_token: string | null;
  created_by: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}
