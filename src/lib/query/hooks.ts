/**
 * ============================================================================
 * COREX: React Query Hooks
 * Description: Custom hooks for data fetching with React Query
 * ============================================================================
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "./keys";

// ============================================================================
// Search Hook
// ============================================================================

export interface UseSearchParams {
  q: string;
  language?: string;
  minStars?: number;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}

/**
 * Hook for searching repositories
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useSearch({ q: 'react' });
 * ```
 */
export function useSearch(
  params: UseSearchParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.search.query(params),
    queryFn: async () => {
      const response = await api.search(params);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    enabled: options?.enabled ?? params.q.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Repository Hooks
// ============================================================================

/**
 * Hook for fetching a single repository
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useRepository('facebook', 'react');
 * ```
 */
export function useRepository(
  owner: string,
  name: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.repos.detail(owner, name),
    queryFn: async () => {
      const response = await api.getRepository(owner, name);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    enabled: options?.enabled ?? (!!owner && !!name),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for fetching repository time series data
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTimeSeries('facebook', 'react', 30);
 * ```
 */
export function useTimeSeries(
  owner: string,
  name: string,
  days: number = 30,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.repos.timeSeries(owner, name, days),
    queryFn: async () => {
      const response = await api.getTimeSeries(owner, name, days);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    enabled: options?.enabled ?? (!!owner && !!name),
    staleTime: 1000 * 60 * 60, // 1 hour (historical data doesn't change often)
  });
}

/**
 * Hook for fetching repository alternatives
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useAlternatives('facebook', 'react', 10);
 * ```
 */
export function useAlternatives(
  owner: string,
  name: string,
  limit: number = 10,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.repos.alternatives(owner, name, limit),
    queryFn: async () => {
      const response = await api.getAlternatives(owner, name, limit);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    enabled: options?.enabled ?? (!!owner && !!name),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// ============================================================================
// Rankings Hook
// ============================================================================

export interface UseRankingsParams {
  type?: string;
  period?: string;
  language?: string;
  page?: number;
  limit?: number;
}

/**
 * Hook for fetching rankings
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useRankings({ type: 'overall', period: 'weekly' });
 * ```
 */
export function useRankings(
  params: UseRankingsParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.rankings.list(params),
    queryFn: async () => {
      const response = await api.getRankings(params);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Compare Hook
// ============================================================================

/**
 * Hook for comparing repositories (mutation-style for POST)
 *
 * @example
 * ```tsx
 * const compare = useCompare();
 * compare.mutate(['facebook/react', 'vuejs/vue']);
 * ```
 */
export function useCompare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repos: string[]) => {
      const response = await api.compare(repos);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    onSuccess: (data, repos) => {
      // Cache the comparison result
      queryClient.setQueryData(queryKeys.compare.repos(repos), data);
    },
  });
}

/**
 * Hook for fetching a cached comparison (if available)
 *
 * @example
 * ```tsx
 * const { data } = useCompareQuery(['facebook/react', 'vuejs/vue']);
 * ```
 */
export function useCompareQuery(
  repos: string[],
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.compare.repos(repos),
    queryFn: async () => {
      const response = await api.compare(repos);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    enabled: options?.enabled ?? repos.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Prefetch Functions
// ============================================================================

/**
 * Prefetch repository data
 * Useful for hover prefetching
 */
export function usePrefetchRepository() {
  const queryClient = useQueryClient();

  return (owner: string, name: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.repos.detail(owner, name),
      queryFn: async () => {
        const response = await api.getRepository(owner, name);
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.data!;
      },
      staleTime: 1000 * 60 * 5,
    });
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to invalidate repository-related queries
 */
export function useInvalidateRepository() {
  const queryClient = useQueryClient();

  return (owner: string, name: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.repos.detail(owner, name),
    });
  };
}

/**
 * Hook to invalidate rankings queries
 */
export function useInvalidateRankings() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.rankings.all,
    });
  };
}
