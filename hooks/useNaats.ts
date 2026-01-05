import { useCallback, useRef, useState } from "react";
import { appwriteService } from "../services/appwrite";
import type { Naat, UseNaatsReturn } from "../types";

/**
 * Number of naats to fetch per page
 */
const PAGE_SIZE = 20;

/**
 * Custom hook for managing naats data with pagination and caching
 *
 * Features:
 * - Fetches naats from Appwrite with pagination
 * - In-memory caching to avoid redundant API calls
 * - Infinite scroll support with loadMore
 * - Pull-to-refresh support
 * - Error handling
 *
 * @returns UseNaatsReturn object with naats data and control functions
 */
export function useNaats(): UseNaatsReturn {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Track current offset for pagination
  const offsetRef = useRef<number>(0);

  // In-memory cache to avoid redundant API calls
  const cacheRef = useRef<Map<number, Naat[]>>(new Map());

  // Flag to prevent multiple simultaneous loads
  const isLoadingRef = useRef<boolean>(false);

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

    // Check cache first
    const cachedData = cacheRef.current.get(offsetRef.current);

    if (cachedData) {
      // Use cached data
      setNaats((prev) => [...prev, ...cachedData]);
      offsetRef.current += PAGE_SIZE;
      setHasMore(cachedData.length === PAGE_SIZE);
      setLoading(false);
      isLoadingRef.current = false;
      return;
    }

    // Fetch from API
    appwriteService
      .getNaats(PAGE_SIZE, offsetRef.current)
      .then((newNaats) => {
        // Cache the results
        cacheRef.current.set(offsetRef.current, newNaats);

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
        cacheRef.current.forEach((cachedNaats) => {
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
  }, [hasMore, naats.length]);

  /**
   * Refresh the naats list (pull-to-refresh)
   * Clears cache and reloads from the beginning
   */
  const refresh = useCallback(async (): Promise<void> => {
    // Reset state
    offsetRef.current = 0;
    cacheRef.current.clear();
    setNaats([]);
    setHasMore(true);
    setError(null);
    setLoading(true);
    isLoadingRef.current = true;

    try {
      const freshNaats = await appwriteService.getNaats(PAGE_SIZE, 0);

      // Cache the results
      cacheRef.current.set(0, freshNaats);

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
  }, []);

  return {
    naats,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
