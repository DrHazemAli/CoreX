/**
 * ============================================================================
 * COREX: Query Key Factory
 * Description: Type-safe query keys for React Query
 * ============================================================================
 */

/**
 * Query key factory for consistent, type-safe query keys
 *
 * Pattern: [scope, entity, ...params]
 *
 * @example
 * ```ts
 * queryKeys.repos.detail('owner', 'name')
 * // => ['repos', 'detail', 'owner', 'name']
 * ```
 */
export const queryKeys = {
  // Repository queries
  repos: {
    all: ["repos"] as const,
    lists: () => [...queryKeys.repos.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.repos.lists(), filters] as const,
    details: () => [...queryKeys.repos.all, "detail"] as const,
    detail: (owner: string, name: string) =>
      [...queryKeys.repos.details(), owner, name] as const,
    timeSeries: (owner: string, name: string, days?: number) =>
      [...queryKeys.repos.detail(owner, name), "timeseries", { days }] as const,
    alternatives: (owner: string, name: string, limit?: number) =>
      [
        ...queryKeys.repos.detail(owner, name),
        "alternatives",
        { limit },
      ] as const,
  },

  // Search queries
  search: {
    all: ["search"] as const,
    query: (params: {
      q: string;
      language?: string;
      minStars?: number;
      sort?: string;
      order?: string;
      page?: number;
      limit?: number;
    }) => [...queryKeys.search.all, params] as const,
  },

  // Rankings queries
  rankings: {
    all: ["rankings"] as const,
    list: (params: {
      type?: string;
      period?: string;
      language?: string;
      page?: number;
      limit?: number;
    }) => [...queryKeys.rankings.all, params] as const,
  },

  // Compare queries
  compare: {
    all: ["compare"] as const,
    repos: (repos: string[]) =>
      [...queryKeys.compare.all, repos.sort()] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
