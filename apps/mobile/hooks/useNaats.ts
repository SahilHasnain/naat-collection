import { useCallback, useEffect, useRef, useState } from "react";
import { getPreferredAudioId } from "@naat-collection/shared";
import { appwriteService } from "../services/appwrite";
import { getForYouFeed } from "../services/forYouAlgorithm";
import { storageService } from "../services/storage";
import type { Naat, UseNaatsReturn } from "../types";

/**
 * Number of naats to fetch per page
 */
const PAGE_SIZE = 20;

/**
 * When the "teenage ready" filter is active most raw naats do not match, so
 * scan larger batches to fill a page without too many round trips.
 */
const TEENAGE_SCAN_BATCH_SIZE = 200;

export type SortOption = "forYou" | "latest" | "popular" | "oldest";

/**
 * Custom hook for managing naats data with pagination and caching
 *
 * Features:
 * - Fetches naats from Appwrite with pagination
 * - In-memory caching to avoid redundant API calls
 * - Infinite scroll support with loadMore
 * - Pull-to-refresh support
 * - Error handling
 * - Filter support (forYou, latest, popular, oldest)
 * - Channel filtering support (null = all channels)
 * - Smart "For You" algorithm with personalized recommendations
 * - For "forYou" filter: Fetches ALL videos (3000+) in batches for comprehensive recommendations
 *
 * @param channelId - YouTube channel ID to filter by (null = all channels)
 * @param filter - Sort order for naats (default: "forYou")
 * @param pureOnly - Only include naats with cut audio
 * @param teenageOnly - Only include naats whose teenage voice is already generated
 * @param readyAudioIds - Source audio IDs with a ready teenage voice transform
 * @returns UseNaatsReturn object with naats data and control functions
 */
export function useNaats(
  channelId: string | null = null,
  filter: SortOption = "forYou",
  pureOnly: boolean = false,
  teenageOnly: boolean = false,
  readyAudioIds: Set<string> | null = null,
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
  const currentPureOnlyRef = useRef<boolean>(pureOnly);
  const currentTeenageOnlyRef = useRef<boolean>(teenageOnly);
  const currentReadyAudioIdsRef = useRef<Set<string> | null>(readyAudioIds);

  // Generate cache key from channelId and filter
  const getCacheKey = useCallback(
    (channel: string | null, sortFilter: SortOption): string => {
      return `${channel || "all"}_${sortFilter}${pureOnly ? "_pure" : ""}${
        teenageOnly ? "_teenage" : ""
      }`;
    },
    [pureOnly, teenageOnly],
  );

  const cacheKey = getCacheKey(channelId, filter);

  // Reset state when filter or channelId or pureOnly changes
  useEffect(() => {
    const readyIdsChanged =
      teenageOnly && currentReadyAudioIdsRef.current !== readyAudioIds;

    if (
      currentFilterRef.current !== filter ||
      currentChannelRef.current !== channelId ||
      currentPureOnlyRef.current !== pureOnly ||
      currentTeenageOnlyRef.current !== teenageOnly ||
      readyIdsChanged
    ) {
      currentFilterRef.current = filter;
      currentChannelRef.current = channelId;
      currentPureOnlyRef.current = pureOnly;
      currentTeenageOnlyRef.current = teenageOnly;
      currentReadyAudioIdsRef.current = readyAudioIds;
      offsetRef.current = 0;
      setNaats([]);
      setHasMore(true);
      setError(null);
      isLoadingRef.current = false;
    }
  }, [filter, channelId, pureOnly, teenageOnly, readyAudioIds]);

  const matchesTeenageFilter = useCallback(
    (naat: Naat): boolean => {
      if (!teenageOnly) return true;
      if (!readyAudioIds) return false;
      const audioId = getPreferredAudioId(naat);
      return !!audioId && readyAudioIds.has(audioId);
    },
    [teenageOnly, readyAudioIds],
  );

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

    // Check cache first (the teenage filter scans raw pages, so its page
    // boundaries are not stable enough to reuse this cache)
    const cachedData = teenageOnly
      ? undefined
      : filterCache.get(offsetRef.current);

    if (cachedData) {
      // Use cached data
      setNaats((prev) => [...prev, ...cachedData]);
      offsetRef.current += PAGE_SIZE;
      setHasMore(cachedData.length === PAGE_SIZE);
      setLoading(false);
      isLoadingRef.current = false;
      return;
    }

    // For "forYou" filter, use progressive loading strategy. When the teenage
    // filter is active we use the standard paged fetch instead, because the
    // ready set is a separate collection and the algorithm would run on a
    // sparse subset.
    if (filter === "forYou" && !teenageOnly) {
      // Check if we already have the full ordered list cached
      const cachedOrderedList = fullOrderedListRef.current.get(cacheKey);

      if (cachedOrderedList) {
        // Use cached ordered list for pagination
        const startIndex = offsetRef.current;
        const endIndex = startIndex + PAGE_SIZE;
        const pageNaats = cachedOrderedList.slice(startIndex, endIndex);

        // Cache the page
        filterCache.set(offsetRef.current, pageNaats);

        // Update state - filter out duplicates
        setNaats((prev) => {
          const existingIds = new Set(prev.map((n) => n.$id));
          const uniqueNewNaats = pageNaats.filter(
            (n) => !existingIds.has(n.$id),
          );
          return [...prev, ...uniqueNewNaats];
        });
        offsetRef.current += PAGE_SIZE;
        setHasMore(endIndex < cachedOrderedList.length);
        setLoading(false);
        isLoadingRef.current = false;

        console.log(
          `[ForYou] Using cached list, displaying ${pageNaats.length} videos, ${cachedOrderedList.length - endIndex} remaining`,
        );
        return;
      }

      // Progressive loading: Start with 300 videos for fast initial load
      // Background fetch will get the rest
      const initialBatchSize = 300;

      appwriteService
        .getNaats(initialBatchSize, 0, "latest", channelId, pureOnly)
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

          // Update state - filter out duplicates
          setNaats((prev) => {
            const existingIds = new Set(prev.map((n) => n.$id));
            const uniqueNewNaats = pageNaats.filter(
              (n) => !existingIds.has(n.$id),
            );
            return [...prev, ...uniqueNewNaats];
          });
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
                    pureOnly,
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
      // Standard fetch for other filters. With the teenage filter active,
      // scan raw pages until a page worth of matches is collected so the
      // list does not look empty when matches are further down.
      const sortFilter = filter === "forYou" ? "latest" : filter;
      const batchSize = teenageOnly ? TEENAGE_SCAN_BATCH_SIZE : PAGE_SIZE;
      const pageStart = offsetRef.current;
      let pageHasMore = true;

      const fetchBatch = async (): Promise<Naat[]> => {
        const batch = await appwriteService.getNaats(
          batchSize,
          offsetRef.current,
          sortFilter,
          channelId,
          pureOnly,
        );
        offsetRef.current += batch.length;
        if (batch.length < batchSize) {
          pageHasMore = false;
        }
        return teenageOnly ? batch.filter(matchesTeenageFilter) : batch;
      };

      (async () => {
        const collected: Naat[] = [];
        do {
          const matches = await fetchBatch();
          collected.push(...matches);
        } while (teenageOnly && pageHasMore && collected.length < PAGE_SIZE);

        if (!teenageOnly) {
          // Cache the results for this channel + filter combination
          filterCache.set(pageStart, collected);
        }

        // Update state - filter out duplicates
        setNaats((prev) => {
          const existingIds = new Set(prev.map((n) => n.$id));
          const uniqueNewNaats = collected.filter(
            (n) => !existingIds.has(n.$id),
          );
          return [...prev, ...uniqueNewNaats];
        });
        setHasMore(teenageOnly ? pageHasMore : collected.length === PAGE_SIZE);
      })()
        .catch((err) => {
          setError(
            err instanceof Error ? err : new Error("Failed to load naats"),
          );

          // Don't modify naats array on error - keep existing data
          // This prevents thumbnails from disappearing when network fails
          console.log(
            "[useNaats] Error loading more naats, keeping existing data",
          );
        })
        .finally(() => {
          setLoading(false);
          isLoadingRef.current = false;
        });
    }
  }, [
    hasMore,
    filter,
    channelId,
    cacheKey,
    pureOnly,
    teenageOnly,
    matchesTeenageFilter,
  ]);

  /**
   * Refresh the naats list (pull-to-refresh)
   * Clears ALL caches (all channel + sort combinations) and reloads from the beginning
   * Maintains the currently selected channel and sort filters
   * For "forYou", also clears the session cache
   */
  const refresh = useCallback(async (): Promise<void> => {
    // Clear ALL caches (all channel + sort combinations)
    cacheRef.current.clear();
    fullOrderedListRef.current.clear();

    // With the teenage filter, the caller refreshes the ready voice set at the
    // same time. That new set resets this hook and triggers a fresh scan, so
    // fetching here would only duplicate the (expensive) paginated scan and can
    // overwrite the newer results.
    if (teenageOnly) {
      return;
    }

    // Reset state
    offsetRef.current = 0;

    // Clear For You session if using that filter
    if (filter === "forYou") {
      await storageService.clearForYouSession();
    }

    setNaats([]);
    setHasMore(true);
    setError(null);
    setLoading(true);
    isLoadingRef.current = true;

    try {
      if (filter === "forYou") {
        // Progressive loading: Start with 300 videos for fast refresh
        const initialBatchSize = 300;

        const initialNaats = await appwriteService.getNaats(
          initialBatchSize,
          0,
          "latest",
          channelId,
          pureOnly,
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
                  pureOnly,
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
        // Standard refresh for other filters
        const freshNaats = await appwriteService.getNaats(
          PAGE_SIZE,
          0,
          filter,
          channelId,
          pureOnly,
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
  }, [filter, channelId, cacheKey, pureOnly, teenageOnly]);

  /**
   * Remove a single naat from the current list and all caches without
   * triggering a network refresh. Used for "Not for you" feedback so the
   * item disappears instantly and doesn't reappear on pagination.
   */
  const removeNaat = useCallback((naatId: string) => {
    setNaats((prev) => prev.filter((n) => n.$id !== naatId));

    // Remove from the cached full ordered list so pagination skips it
    fullOrderedListRef.current.forEach((orderedList, key) => {
      fullOrderedListRef.current.set(
        key,
        orderedList.filter((n) => n.$id !== naatId),
      );
    });

    // Remove from all page caches so it never comes back on loadMore
    cacheRef.current.forEach((filterCache) => {
      filterCache.forEach((pageNaats, offset) => {
        filterCache.set(
          offset,
          pageNaats.filter((n) => n.$id !== naatId),
        );
      });
    });
  }, []);

  const updateNaat = useCallback((naatId: string, updates: Partial<Naat>) => {
    setNaats((current) =>
      current.map((naat) => (naat.$id === naatId ? { ...naat, ...updates } : naat)),
    );
    fullOrderedListRef.current.forEach((orderedList, key) => {
      fullOrderedListRef.current.set(
        key,
        orderedList.map((naat) => (naat.$id === naatId ? { ...naat, ...updates } : naat)),
      );
    });
    cacheRef.current.forEach((filterCache) => {
      filterCache.forEach((pageNaats, offset) => {
        filterCache.set(
          offset,
          pageNaats.map((naat) => (naat.$id === naatId ? { ...naat, ...updates } : naat)),
        );
      });
    });
  }, []);

  return {
    naats,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    removeNaat,
    updateNaat,
  };
}
