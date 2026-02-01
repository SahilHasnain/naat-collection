import type { Naat } from "@naat-collection/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { appwriteService } from "../lib/appwrite";
import { getForYouFeed } from "../lib/forYouAlgorithm";

/**
 * Number of naats to fetch per page
 */
const PAGE_SIZE = 20;

export type SortOption = "forYou" | "latest" | "popular" | "oldest";

export interface UseNaatsReturn {
  naats: Naat[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing naats data with pagination and caching
 *
 * Features:
 * - Fetches naats from Appwrite with pagination
 * - In-memory caching to avoid redundant API calls
 * - Infinite scroll support with loadMore
 * - Refresh support
 * - Error handling
 * - Filter support (forYou, latest, popular, oldest)
 * - Channel filtering support (null = all channels)
 * - Smart "For You" algorithm with personalized recommendations
 * - For "forYou" filter: Fetches 1000 videos initially, then background fetches remaining
 *
 * @param channelId - YouTube channel ID to filter by (null = all channels)
 * @param filter - Sort order for naats (default: "forYou")
 * @returns UseNaatsReturn object with naats data and control functions
 */
export function useNaats(
  channelId: string | null = null,
  filter: SortOption = "forYou",
): UseNaatsReturn {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Track current offset for pagination
  const offsetRef = useRef<number>(0);

  // In-memory cache to avoid redundant API calls (separate cache per channel + filter combination)
  const cacheRef = useRef<Map<string, Map<number, Naat[]>>>(new Map());

  // Cache for full ordered list (For You algorithm)
  const fullOrderedListRef = useRef<Map<string, Naat[]>>(new Map());

  // Flag to prevent multiple simultaneous loads
  const isLoadingRef = useRef<boolean>(false);

  // Track current filter and channel to detect changes
  const currentFilterRef = useRef<SortOption>(filter);
  const currentChannelRef = useRef<string | null>(channelId);

  // Generate cache key from channelId and filter
  const getCacheKey = useCallback(
    (channel: string | null, sortFilter: SortOption): string => {
      return `${channel || "all"}_${sortFilter}`;
    },
    [],
  );

  const cacheKey = getCacheKey(channelId, filter);

  // Reset state when filter or channelId changes
  useEffect(() => {
    if (
      currentFilterRef.current !== filter ||
      currentChannelRef.current !== channelId
    ) {
      currentFilterRef.current = filter;
      currentChannelRef.current = channelId;
      offsetRef.current = 0;
      setNaats([]);
      setHasMore(true);
      setError(null);
      isLoadingRef.current = false;
    }
  }, [filter, channelId]);

  /**
   * Load more naats for infinite scroll
   * Uses cached data when available
   * For "forYou" filter, applies smart algorithm
   */
  const loadMore = useCallback(() => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current || !hasMore) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    // Get or create cache for current channel + filter combination
    if (!cacheRef.current.has(cacheKey)) {
      cacheRef.current.set(cacheKey, new Map());
    }
    const filterCache = cacheRef.current.get(cacheKey)!;

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

    // For "forYou" filter, use progressive loading strategy
    if (filter === "forYou") {
      // Check if we already have the full ordered list cached
      const cachedOrderedList = fullOrderedListRef.current.get(cacheKey);

      if (cachedOrderedList) {
        // Use cached ordered list for pagination
        const startIndex = offsetRef.current;
        const endIndex = startIndex + PAGE_SIZE;
        const pageNaats = cachedOrderedList.slice(startIndex, endIndex);

        // Cache the page
        filterCache.set(offsetRef.current, pageNaats);

        // Update state
        setNaats((prev) => [...prev, ...pageNaats]);
        offsetRef.current += PAGE_SIZE;
        setHasMore(endIndex < cachedOrderedList.length);
        setLoading(false);
        isLoadingRef.current = false;

        console.log(
          `[ForYou] Using cached list, displaying ${pageNaats.length} videos, ${cachedOrderedList.length - endIndex} remaining`,
        );
        return;
      }

      // Progressive loading: Start with 40 videos for FAST initial load
      // Background fetch will get the rest
      const initialBatchSize = 40;

      appwriteService
        .getNaats(initialBatchSize, 0, "latest", channelId)
        .then(async (initialNaats) => {
          console.log(
            `[ForYou] Initial fetch: ${initialNaats.length} videos, applying algorithm...`,
          );

          // Apply For You algorithm to initial batch
          const orderedNaats = await getForYouFeed(initialNaats, channelId);

          // Cache the full ordered list (will be updated with more data later)
          fullOrderedListRef.current.set(cacheKey, orderedNaats);

          // Paginate the results
          const startIndex = offsetRef.current;
          const endIndex = startIndex + PAGE_SIZE;
          const pageNaats = orderedNaats.slice(startIndex, endIndex);

          // Cache the page
          filterCache.set(offsetRef.current, pageNaats);

          // Update state
          setNaats((prev) => [...prev, ...pageNaats]);
          offsetRef.current += PAGE_SIZE;
          setHasMore(endIndex < orderedNaats.length);

          console.log(
            `[ForYou] Displaying ${pageNaats.length} videos, ${orderedNaats.length - endIndex} remaining`,
          );

          // Background fetch: Get remaining videos if there are more
          if (initialNaats.length === initialBatchSize) {
            console.log(
              "[ForYou] Starting background fetch for remaining videos...",
            );

            // Fetch remaining videos in background (non-blocking)
            const fetchRemainingInBackground = async () => {
              const batchSize = 500;
              let allNaats = [...initialNaats];
              let currentOffset = initialBatchSize;
              let hasMoreBatches = true;

              while (hasMoreBatches) {
                try {
                  const batch = await appwriteService.getNaats(
                    batchSize,
                    currentOffset,
                    "latest",
                    channelId,
                  );

                  if (batch.length > 0) {
                    allNaats = [...allNaats, ...batch];
                    currentOffset += batchSize;

                    console.log(
                      `[ForYou Background] Fetched ${batch.length} more videos, total: ${allNaats.length}`,
                    );

                    // Re-apply algorithm with expanded dataset
                    const updatedOrderedNaats = await getForYouFeed(
                      allNaats,
                      channelId,
                    );
                    fullOrderedListRef.current.set(
                      cacheKey,
                      updatedOrderedNaats,
                    );

                    console.log(
                      `[ForYou Background] Updated recommendations with ${allNaats.length} total videos`,
                    );
                  }

                  if (batch.length < batchSize) {
                    hasMoreBatches = false;
                    console.log(
                      `[ForYou Background] Complete! Total videos: ${allNaats.length}`,
                    );
                  }
                } catch (err) {
                  console.error(
                    "[ForYou Background] Error fetching more videos:",
                    err,
                  );
                  hasMoreBatches = false;
                }
              }
            };

            // Run in background without blocking UI
            fetchRemainingInBackground();
          }
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err : new Error("Failed to load naats"),
          );
          console.log(
            "[useNaats] Error loading more naats, keeping existing data",
          );
        })
        .finally(() => {
          setLoading(false);
          isLoadingRef.current = false;
        });
    } else {
      // Standard fetch for other filters
      appwriteService
        .getNaats(PAGE_SIZE, offsetRef.current, filter, channelId)
        .then((newNaats) => {
          // Cache the results for this channel + filter combination
          filterCache.set(offsetRef.current, newNaats);

          // Update state
          setNaats((prev) => [...prev, ...newNaats]);
          offsetRef.current += PAGE_SIZE;
          setHasMore(newNaats.length === PAGE_SIZE);
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err : new Error("Failed to load naats"),
          );

          // Don't modify naats array on error - keep existing data
          console.log(
            "[useNaats] Error loading more naats, keeping existing data",
          );
        })
        .finally(() => {
          setLoading(false);
          isLoadingRef.current = false;
        });
    }
  }, [hasMore, filter, channelId, cacheKey]);

  /**
   * Refresh the naats list
   * Clears ALL caches (all channel + sort combinations) and reloads from the beginning
   */
  const refresh = useCallback(async (): Promise<void> => {
    // Reset state
    offsetRef.current = 0;

    // Clear ALL caches (all channel + sort combinations)
    cacheRef.current.clear();
    fullOrderedListRef.current.clear();

    setNaats([]);
    setHasMore(true);
    setError(null);
    setLoading(true);
    isLoadingRef.current = true;

    try {
      if (filter === "forYou") {
        // Progressive loading: Start with 40 videos for fast refresh
        const initialBatchSize = 40;

        const initialNaats = await appwriteService.getNaats(
          initialBatchSize,
          0,
          "latest",
          channelId,
        );

        console.log(
          `[ForYou Refresh] Initial fetch: ${initialNaats.length} videos, applying algorithm...`,
        );

        // Apply For You algorithm
        const orderedNaats = await getForYouFeed(initialNaats, channelId);

        // Cache the full ordered list
        fullOrderedListRef.current.set(cacheKey, orderedNaats);

        // Get first page
        const freshNaats = orderedNaats.slice(0, PAGE_SIZE);

        // Get or create cache
        if (!cacheRef.current.has(cacheKey)) {
          cacheRef.current.set(cacheKey, new Map());
        }
        const filterCache = cacheRef.current.get(cacheKey)!;

        // Cache the results
        filterCache.set(0, freshNaats);

        // Update state
        setNaats(freshNaats);
        offsetRef.current = PAGE_SIZE;
        setHasMore(PAGE_SIZE < orderedNaats.length);

        console.log(
          `[ForYou Refresh] Displaying ${freshNaats.length} videos, ${orderedNaats.length - PAGE_SIZE} remaining`,
        );

        // Background fetch remaining videos if there are more
        if (initialNaats.length === initialBatchSize) {
          console.log(
            "[ForYou Refresh] Starting background fetch for remaining videos...",
          );

          const fetchRemainingInBackground = async () => {
            const batchSize = 500;
            let allNaats = [...initialNaats];
            let currentOffset = initialBatchSize;
            let hasMoreBatches = true;

            while (hasMoreBatches) {
              try {
                const batch = await appwriteService.getNaats(
                  batchSize,
                  currentOffset,
                  "latest",
                  channelId,
                );

                if (batch.length > 0) {
                  allNaats = [...allNaats, ...batch];
                  currentOffset += batchSize;

                  console.log(
                    `[ForYou Refresh Background] Fetched ${batch.length} more, total: ${allNaats.length}`,
                  );

                  // Re-apply algorithm with expanded dataset
                  const updatedOrderedNaats = await getForYouFeed(
                    allNaats,
                    channelId,
                  );
                  fullOrderedListRef.current.set(cacheKey, updatedOrderedNaats);

                  console.log(
                    `[ForYou Refresh Background] Updated with ${allNaats.length} total videos`,
                  );
                }

                if (batch.length < batchSize) {
                  hasMoreBatches = false;
                  console.log(
                    `[ForYou Refresh Background] Complete! Total: ${allNaats.length}`,
                  );
                }
              } catch (err) {
                console.error("[ForYou Refresh Background] Error:", err);
                hasMoreBatches = false;
              }
            }
          };

          fetchRemainingInBackground();
        }
      } else {
        // Standard refresh for other filters - use smaller initial batch
        const freshNaats = await appwriteService.getNaats(
          20, // Reduced from PAGE_SIZE for faster initial load
          0,
          filter,
          channelId,
        );

        // Get or create cache for current channel + filter combination
        if (!cacheRef.current.has(cacheKey)) {
          cacheRef.current.set(cacheKey, new Map());
        }
        const filterCache = cacheRef.current.get(cacheKey)!;

        // Cache the results
        filterCache.set(0, freshNaats);

        // Update state
        setNaats(freshNaats);
        offsetRef.current = PAGE_SIZE;
        setHasMore(freshNaats.length === PAGE_SIZE);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to refresh naats"),
      );
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [filter, channelId, cacheKey]);

  return {
    naats,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
