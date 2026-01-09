/**
 * ============================================================================
 * COREX: Core Domain Types
 * Description: Type definitions for the domain layer (pure, no dependencies)
 * ============================================================================
 */

// ============================================================================
// REPOSITORY TYPES
// ============================================================================

/**
 * Core repository entity representing a GitHub repository
 */
export interface Repository {
  id: string;
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  homepageUrl: string | null;
  language: string | null;
  topics: string[];
  starsCount: number;
  forksCount: number;
  watchersCount: number;
  openIssuesCount: number;
  isFork: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  hasWiki: boolean;
  hasIssues: boolean;
  hasDiscussions: boolean;
  licenseKey: string | null;
  licenseName: string | null;
  githubCreatedAt: Date | null;
  githubUpdatedAt: Date | null;
  githubPushedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date | null;
}

/**
 * Minimal repository info for list views
 */
export interface RepositorySummary {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  starsCount: number;
  forksCount: number;
  topics: string[];
}

// ============================================================================
// SNAPSHOT TYPES
// ============================================================================

/**
 * Daily snapshot of repository metrics
 */
export interface RepositorySnapshot {
  id: string;
  repositoryId: string;
  snapshotDate: Date;
  starsCount: number;
  forksCount: number;
  watchersCount: number;
  openIssuesCount: number;
  commitsCount: number;
  contributorsCount: number;
  releasesCount: number;
  commitsLast30d: number;
  prsOpenedLast30d: number;
  prsMergedLast30d: number;
  issuesOpenedLast30d: number;
  issuesClosedLast30d: number;
  createdAt: Date;
}

/**
 * Time series data point for charts
 */
export interface TimeSeriesDataPoint {
  date: Date;
  value: number;
}

/**
 * Time series data for a specific metric
 */
export interface MetricTimeSeries {
  metric: string;
  data: TimeSeriesDataPoint[];
}

// ============================================================================
// SCORING TYPES
// ============================================================================

/**
 * Individual score dimension
 */
export type ScoreDimension =
  | "activity"
  | "community"
  | "maintenance"
  | "popularity"
  | "quality";

/**
 * Complete score result for a repository
 */
export interface RepositoryScore {
  id: string;
  repositoryId: string;
  computedAt: Date;
  overallScore: number;
  activityScore: number;
  communityScore: number;
  maintenanceScore: number;
  popularityScore: number;
  qualityScore: number;
  scoreBreakdown: ScoreBreakdown;
  algorithmVersion: string;
  createdAt: Date;
}

/**
 * Detailed breakdown of how scores were calculated
 */
export interface ScoreBreakdown {
  activity: ScoreFactors;
  community: ScoreFactors;
  maintenance: ScoreFactors;
  popularity: ScoreFactors;
  quality: ScoreFactors;
}

/**
 * Individual factors contributing to a score dimension
 */
export interface ScoreFactors {
  factors: ScoreFactor[];
  weight: number;
  rawScore: number;
  normalizedScore: number;
}

/**
 * Single factor in score calculation
 */
export interface ScoreFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
  description: string;
}

/**
 * Input data for score computation
 */
export interface ScoreInput {
  repository: Repository;
  snapshot: RepositorySnapshot;
  recentSnapshots: RepositorySnapshot[];
  signals: RepositorySignal[];
}

/**
 * Result of score computation
 */
export interface ScoreResult {
  overallScore: number;
  dimensionScores: Record<ScoreDimension, number>;
  breakdown: ScoreBreakdown;
  algorithmVersion: string;
}

// ============================================================================
// RANKING TYPES
// ============================================================================

/**
 * Ranking period type
 */
export type RankingPeriod = "daily" | "weekly" | "monthly";

/**
 * Ranking category type
 */
export type RankingType =
  | "overall"
  | "activity"
  | "community"
  | "maintenance"
  | "popularity"
  | "quality";

/**
 * Single ranking entry
 */
export interface RepositoryRanking {
  id: string;
  period: RankingPeriod;
  asOf: Date;
  rankingType: RankingType;
  language: string | null;
  repositoryId: string;
  rank: number;
  score: number;
  rankChange: number;
  rankingExplanation: RankingExplanation;
  createdAt: Date;
}

/**
 * Ranking with repository details
 */
export interface RankingWithRepository extends RepositoryRanking {
  repository: RepositorySummary;
}

/**
 * Explanation of ranking position
 */
export interface RankingExplanation {
  topFactors: string[];
  comparedToAverage: Record<string, number>;
}

/**
 * Input for ranking computation
 */
export interface RankingInput {
  period: RankingPeriod;
  asOf: Date;
  rankingType: RankingType;
  language?: string | null;
  scores: Array<{
    repositoryId: string;
    score: number;
    breakdown: ScoreBreakdown;
  }>;
}

/**
 * Result of ranking computation
 */
export interface RankingResult {
  period: RankingPeriod;
  asOf: Date;
  rankingType: RankingType;
  language: string | null;
  rankings: Array<{
    repositoryId: string;
    rank: number;
    score: number;
    rankChange: number;
    explanation: RankingExplanation;
  }>;
}

// ============================================================================
// SIGNAL TYPES
// ============================================================================

/**
 * Signal type enumeration
 */
export type SignalType =
  | "release"
  | "security_advisory"
  | "milestone"
  | "major_update"
  | "contributor_milestone";

/**
 * Repository signal/event
 */
export interface RepositorySignal {
  id: string;
  repositoryId: string;
  signalType: SignalType;
  signalData: Record<string, unknown>;
  githubId: string | null;
  occurredAt: Date;
  createdAt: Date;
}

// ============================================================================
// JOB TYPES
// ============================================================================

/**
 * Job type enumeration
 */
export type JobType =
  | "repo.refresh"
  | "repo.daily_snapshot"
  | "repo.signals"
  | "repo.score"
  | "rankings.compute";

/**
 * Job status enumeration
 */
export type JobStatus = "queued" | "running" | "done" | "failed";

/**
 * Job queue entry
 */
export interface Job {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  runAt: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  attempt: number;
  maxAttempts: number;
  lastError: string | null;
  result: Record<string, unknown> | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Job payload types for type safety
 */
export interface JobPayloads {
  "repo.refresh": { repositoryId: string };
  "repo.daily_snapshot": { repositoryId: string };
  "repo.signals": { repositoryId: string };
  "repo.score": { repositoryId: string };
  "rankings.compute": {
    period: RankingPeriod;
    asOf: string;
    rankingType?: RankingType;
    language?: string;
  };
}

// ============================================================================
// REPORT TYPES
// ============================================================================

/**
 * Comparison report
 */
export interface Report {
  id: string;
  title: string;
  description: string | null;
  repositoryIds: string[];
  config: ReportConfig;
  isPublic: boolean;
  shareToken: string | null;
  createdBy: string | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Report configuration
 */
export interface ReportConfig {
  metrics: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
  chartTypes: string[];
}

/**
 * Report with full repository data
 */
export interface ReportWithRepositories extends Report {
  repositories: RepositorySummary[];
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Search filters
 */
export interface SearchFilters {
  query?: string;
  language?: string;
  minStars?: number;
  maxStars?: number;
  topics?: string[];
  hasIssues?: boolean;
  hasDiscussions?: boolean;
  isArchived?: boolean;
}

/**
 * Sort options for search
 */
export interface SearchSort {
  field: "stars" | "forks" | "updated" | "score" | "name";
  direction: SortDirection;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Date range for queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Result wrapper for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
