/**
 * ============================================================================
 * COREX: API Client
 * Description: Type-safe API client for frontend requests
 * ============================================================================
 */

// ============================================================================
// Types
// ============================================================================

/** API error response */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Base API response wrapper */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError["error"] | null;
  status: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Search response */
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchResult {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  topics: string[];
  starsCount: number;
  forksCount: number;
  score: {
    overallScore: number;
    activityScore: number;
    communityScore: number;
    maintenanceScore: number;
  } | null;
}

/** Repository profile response */
export interface RepositoryResponse {
  repository: {
    id: string;
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
    hasWiki: boolean;
    hasIssues: boolean;
    hasDiscussions: boolean;
    licenseKey: string | null;
    licenseName: string | null;
    githubCreatedAt: string | null;
    githubUpdatedAt: string | null;
    githubPushedAt: string | null;
    lastSyncedAt: string | null;
  };
  score: {
    overallScore: number;
    activityScore: number;
    communityScore: number;
    maintenanceScore: number;
    popularityScore: number;
    qualityScore: number;
    computedAt: string;
    algorithmVersion: string;
  } | null;
  ranking: {
    rank: number;
    rankChange: number | null;
    period: string;
    asOf: string;
  } | null;
  snapshot: {
    date: string;
    contributorsCount: number | null;
    commitsLast30d: number | null;
    prsOpenedLast30d: number | null;
    prsMergedLast30d: number | null;
    issuesOpenedLast30d: number | null;
    issuesClosedLast30d: number | null;
  } | null;
}

/** Time series response */
export interface TimeSeriesResponse {
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  snapshots: Array<{
    date: string;
    starsCount: number;
    forksCount: number;
    watchersCount: number;
    openIssuesCount: number;
    contributorsCount: number | null;
    commitsLast30d: number | null;
    prsOpenedLast30d: number | null;
    prsMergedLast30d: number | null;
    issuesOpenedLast30d: number | null;
    issuesClosedLast30d: number | null;
  }>;
  scores: Array<{
    date: string;
    overallScore: number;
    activityScore: number;
    communityScore: number;
    maintenanceScore: number;
    popularityScore: number;
    qualityScore: number;
  }>;
  trends: {
    starsGrowth: number;
    forksGrowth: number;
    scoreChange: number;
  };
}

/** Alternatives response */
export interface AlternativesResponse {
  source: {
    owner: string;
    name: string;
    fullName: string;
    language: string | null;
    topics: string[];
  };
  alternatives: Array<{
    repository: {
      owner: string;
      name: string;
      fullName: string;
      description: string | null;
      language: string | null;
      topics: string[];
      starsCount: number;
      forksCount: number;
      licenseKey: string | null;
      isArchived: boolean;
    };
    score: {
      overallScore: number;
      activityScore: number;
      communityScore: number;
      maintenanceScore: number;
    } | null;
    similarity: {
      overall: number;
      language: number;
      topics: number;
      size: number;
    };
  }>;
  metadata: {
    sourceLanguage: string | null;
    sourceTopics: string[];
    totalCandidates: number;
    returnedCount: number;
  };
}

/** Compare response */
export interface CompareResponse {
  repositories: Array<{
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    language: string | null;
    topics: string[];
    starsCount: number;
    forksCount: number;
    watchersCount: number;
    openIssuesCount: number;
    licenseKey: string | null;
    licenseName: string | null;
    isArchived: boolean;
    hasWiki: boolean;
    hasIssues: boolean;
    hasDiscussions: boolean;
    githubCreatedAt: string | null;
    githubPushedAt: string | null;
    score: {
      overallScore: number;
      activityScore: number;
      communityScore: number;
      maintenanceScore: number;
      popularityScore: number;
      qualityScore: number;
    } | null;
    ranking: {
      rank: number;
      rankChange: number | null;
    } | null;
    snapshot: {
      contributorsCount: number | null;
      commitsLast30d: number | null;
      prsOpenedLast30d: number | null;
      prsMergedLast30d: number | null;
      issuesOpenedLast30d: number | null;
      issuesClosedLast30d: number | null;
    } | null;
  }>;
  comparison: {
    byStars: string[];
    byScore: string[];
    byActivity: string[];
    byCommunity: string[];
    byMaintenance: string[];
  };
  summary: {
    totalRequested: number;
    totalFound: number;
    notFound: string[];
    averageScore: number;
    highestScored: string | null;
  };
}

/** Rankings response */
export interface RankingsResponse {
  rankings: Array<{
    rank: number;
    rankChange: number | null;
    repository: {
      owner: string;
      name: string;
      fullName: string;
      description: string | null;
      language: string | null;
      topics: string[];
      starsCount: number;
      forksCount: number;
      licenseKey: string | null;
      isArchived: boolean;
    };
    score: {
      overallScore: number;
      activityScore: number;
      communityScore: number;
      maintenanceScore: number;
      popularityScore: number;
    } | null;
  }>;
  filters: {
    type: string;
    period: string;
    language: string | null;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  metadata: {
    asOf: string;
    availableLanguages: string[];
  };
}

// ============================================================================
// API Client Class
// ============================================================================

/**
 * API client for making requests to the CoreX API
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = "/api/v1") {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request
   */
  private async get<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<ApiResponse<T>> {
    try {
      const url = new URL(endpoint, window.location.origin);
      url.pathname = `${this.baseUrl}${endpoint}`;

      // Add query params
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        });
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: data.error || { code: "UNKNOWN", message: "Unknown error" },
          status: response.status,
        };
      }

      return {
        data,
        error: null,
        status: response.status,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error",
        },
        status: 0,
      };
    }
  }

  /**
   * Make a POST request
   */
  private async post<T>(
    endpoint: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: data.error || { code: "UNKNOWN", message: "Unknown error" },
          status: response.status,
        };
      }

      return {
        data,
        error: null,
        status: response.status,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error",
        },
        status: 0,
      };
    }
  }

  // ==========================================================================
  // API Methods
  // ==========================================================================

  /**
   * Search repositories
   */
  async search(params: {
    q: string;
    language?: string;
    minStars?: number;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<SearchResponse>> {
    return this.get<SearchResponse>("/search", params);
  }

  /**
   * Get repository profile
   */
  async getRepository(
    owner: string,
    name: string,
  ): Promise<ApiResponse<RepositoryResponse>> {
    return this.get<RepositoryResponse>(`/repos/${owner}/${name}`);
  }

  /**
   * Get repository time series data
   */
  async getTimeSeries(
    owner: string,
    name: string,
    days?: number,
  ): Promise<ApiResponse<TimeSeriesResponse>> {
    return this.get<TimeSeriesResponse>(`/repos/${owner}/${name}/timeseries`, {
      days,
    });
  }

  /**
   * Get repository alternatives
   */
  async getAlternatives(
    owner: string,
    name: string,
    limit?: number,
  ): Promise<ApiResponse<AlternativesResponse>> {
    return this.get<AlternativesResponse>(
      `/repos/${owner}/${name}/alternatives`,
      { limit },
    );
  }

  /**
   * Compare repositories
   */
  async compare(repos: string[]): Promise<ApiResponse<CompareResponse>> {
    return this.post<CompareResponse>("/compare", { repos });
  }

  /**
   * Get rankings
   */
  async getRankings(params: {
    type?: string;
    period?: string;
    language?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<RankingsResponse>> {
    return this.get<RankingsResponse>("/rankings", params);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const api = new ApiClient();

export default api;
