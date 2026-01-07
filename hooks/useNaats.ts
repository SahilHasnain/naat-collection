import { useCallback, useEffect, useRef, useState } from "react";
import { appwriteService } from "../services/appwrite";
import type { Naat, UseNaatsReturn } from "../types";

/**
 * Number of naats to fetch per page
 */
const PAGE_SIZE = 20;

export type FilterOption = "latest" | "popular" | "oldest";

/**
 * Custom hook for managing naats data with pagination and caching
 *
 * Features:
 * - Fetches naats from Appwrite with pagination
 * - In-memory caching to avoid redundant API calls
 * - Infinite scroll support with loadMore
 * - Pull-to-refresh support
 * - Error handling
 * - Filter support (latest, popular, oldest)
 *
 * @param filter - Sort order for naats (default: "latest")
 * @returns UseNaatsReturn object with naats data and control functions
 */
export function useNaats(filter: FilterOption = "latest"): UseNaatsReturn {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Track current offset for pagination
  const offsetRef = useRef<number>(0);

  // In-memory cache to avoid redundant API calls (separate cache per filter)
  const cacheRef = useRef<Map<string, Map<number, Naat[]>>>(new Map());

  // Flag to prevent multiple simultaneous loads
  const isLoadingRef = useRef<boolean>(false);

  // Track current filter to detect changes
  const currentFilterRef = useRef<FilterOption>(filter);

  // Reset state when filter changes
  useEffect(() => {
    if (currentFilterRef.current !== filter) {
      currentFilterRef.current = filter;
      offsetRef.current = 0;
      setNaats([]);
      setHasMore(true);
      setError(null);
      isLoadingRef.current = false;
    }
  }, [filter]);

  /**
   * Load more naats for infinite scroll
   * Uses cached data when available
   */
  const loadMore = useCallback(() => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current || !hasMore) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    // Get or create cache for current filter
    if (!cacheRef.current.has(filter)) {
      cacheRef.current.set(filter, new Map());
    }
    const filterCache = cacheRef.current.get(filter)!;

    // Check cache first
    const cachedData = filterCache.get(offsetRef.current);

    if (cachedData) {
      // Use cached data
      setNaats((prev) => [...prev, ...cachedData]);
      offsetRef.current += PAGE_SIZE;
      setHasMore(cachedData.length === PAGE_SIZE);
      setLoading(false);
      isLoadingRef.current = false;
      return;
    }

    // Fetch from API with filter
    appwriteService
      .getNaats(PAGE_SIZE, offsetRef.current, filter)
      .then((newNaats) => {
        // Cache the results for this filter
        filterCache.set(offsetRef.current, newNaats);

        // Update state
        setNaats((prev) => [...prev, ...newNaats]);
        offsetRef.current += PAGE_SIZE;
        setHasMore(newNaats.length === PAGE_SIZE);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err : new Error("Failed to load naats")
        );

        // Try to use cached data as fallback
        const allCachedData: Naat[] = [];
        filterCache.forEach((cachedNaats) => {
          allCachedData.push(...cachedNaats);
        });

        if (allCachedData.length > 0 && naats.length === 0) {
          setNaats(allCachedData);
        }
      })
      .finally(() => {
        setLoading(false);
        isLoadingRef.current = false;
      });
  }, [hasMore, naats.length, filter]);

  /**
   * Refresh the naats list (pull-to-refresh)
   * Clears cache and reloads from the beginning
   */
  const refresh = useCallback(async (): Promise<void> => {
    // Reset state
    offsetRef.current = 0;

    // Clear cache for current filter only
    if (cacheRef.current.has(filter)) {
      cacheRef.current.get(filter)!.clear();
    }

    setNaats([]);
    setHasMore(true);
    setError(null);
    setLoading(true);
    isLoadingRef.current = true;

    try {
      const freshNaats = await appwriteService.getNaats(PAGE_SIZE, 0, filter);

      // Get or create cache for current filter
      if (!cacheRef.current.has(filter)) {
        cacheRef.current.set(filter, new Map());
      }
      const filterCache = cacheRef.current.get(filter)!;

      // Cache the results
      filterCache.set(0, freshNaats);

      // Update state
      setNaats(freshNaats);
      offsetRef.current = PAGE_SIZE;
      setHasMore(freshNaats.length === PAGE_SIZE);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to refresh naats")
      );
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [filter]);

  return {
    naats,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
