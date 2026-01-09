/**
 * ============================================================================
 * COREX: Query Module Index
 * Description: Export query-related utilities
 * ============================================================================
 */

export { QueryProvider, type QueryProviderProps } from "./provider";
export { queryKeys, type QueryKeys } from "./keys";
export {
  // Search
  useSearch,
  type UseSearchParams,
  // Repository
  useRepository,
  useTimeSeries,
  useAlternatives,
  // Rankings
  useRankings,
  type UseRankingsParams,
  // Compare
  useCompare,
  useCompareQuery,
  // Prefetch
  usePrefetchRepository,
  // Invalidation
  useInvalidateRepository,
  useInvalidateRankings,
} from "./hooks";
