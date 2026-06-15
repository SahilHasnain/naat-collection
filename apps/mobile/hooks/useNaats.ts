import { useCallback, useEffect, useRef, useState } from "react";
import { appwriteService } from "../services/appwrite";
import { getForYouFeed } from "../services/forYouAlgorithm";
import { storageService } from "../services/storage";
import type { Naat, NaatMetadata, UseNaatsReturn } from "../types";

/**
 * Number of naats to fetch per page
 */
const PAGE_SIZE = 20;

function filterMetadata(
  metadata: NaatMetadata[],
  channelId: string | null,
  pureOnly: boolean,
): NaatMetadata[] {
  let filtered = metadata;

  if (channelId) {
    filtered = filtered.filter((item) => item.channelId === channelId);
  }

  if (pureOnly) {
    filtered = filtered.filter((item) => !!item.cutAudio);
  }

  return filtered;
}

async function fetchNaatsFromMetadata(
  pageMetadata: NaatMetadata[],
): Promise<Naat[]> {
  const pageNaats = await Promise.all(
    pageMetadata.map(async (meta) => {
      try {
        return await appwriteService.getNaatById(meta.id);
      } catch (err) {
        console.error(`Failed to fetch naat ${meta.id}:`, err);
        return null;
      }
    }),
  );

  return pageNaats.filter((naat): naat is Naat => naat !== null);
}

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
 * - For "forYou" filter: Uses metadata cache + lazy full-document fetch
 *
 * @param channelId - YouTube channel ID to filter by (null = all channels)
 * @param filter - Sort order for naats (default: "forYou")
 * @returns UseNaatsReturn object with naats data and control functions
 */
export function useNaats(
  channelId: string | null = null,
  filter: SortOption = "forYou",
  pureOnly: boolean = false,
): UseNaatsReturn {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Track current offset for pagination
  const offsetRef = useRef<number>(0);

  // In-memory cache to avoid redundant API calls (separate cache per channel + filter combination)
  const cacheRef = useRef<Map<string, Map<number, Naat[]>>>(new Map());

  // Cache for full ordered metadata list (For You algorithm)
  const fullOrderedListRef = useRef<Map<string, NaatMetadata[]>>(new Map());

  // Flag to prevent multiple simultaneous loads
  const isLoadingRef = useRef<boolean>(false);

  // Track current filter and channel to detect changes
  const currentFilterRef = useRef<SortOption>(filter);
  const currentChannelRef = useRef<string | null>(channelId);
  const currentPureOnlyRef = useRef<boolean>(pureOnly);

  // Generate cache key from channelId and filter
  const getCacheKey = useCallback(
    (channel: string | null, sortFilter: SortOption): string => {
      return `${channel || "all"}_${sortFilter}${pureOnly ? "_pure" : ""}`;
    },
    [pureOnly],
  );

  const cacheKey = getCacheKey(channelId, filter);

  // Reset state when filter or channelId or pureOnly changes
  useEffect(() => {
    if (
      currentFilterRef.current !== filter ||
      currentChannelRef.current !== channelId ||
      currentPureOnlyRef.current !== pureOnly
    ) {
      currentFilterRef.current = filter;
      currentChannelRef.current = channelId;
      currentPureOnlyRef.current = pureOnly;
      offsetRef.current = 0;
      setNaats([]);
      setHasMore(true);
      setError(null);
      isLoadingRef.current = false;
    }
  }, [filter, channelId, pureOnly]);

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

    // For "forYou" filter, use metadata cache + personalized ranking
    if (filter === "forYou") {
      const loadForYou = async () => {
        try {
          const cachedOrderedList = fullOrderedListRef.current.get(cacheKey);

          if (cachedOrderedList) {
            const startIndex = offsetRef.current;
            const endIndex = startIndex + PAGE_SIZE;
            const pageMetadata = cachedOrderedList.slice(startIndex, endIndex);
            const validNaats = await fetchNaatsFromMetadata(pageMetadata);

            filterCache.set(offsetRef.current, validNaats);

            setNaats((prev) => {
              const existingIds = new Set(prev.map((n) => n.$id));
              const uniqueNewNaats = validNaats.filter(
                (n) => !existingIds.has(n.$id),
              );
              return [...prev, ...uniqueNewNaats];
            });

            offsetRef.current += PAGE_SIZE;
            setHasMore(endIndex < cachedOrderedList.length);

            console.log(
              `[ForYou] Using cached ranking, loaded ${validNaats.length} naats, ${cachedOrderedList.length - endIndex} remaining`,
            );
            return;
          }

          console.log("[ForYou] First load, fetching metadata cache...");

          const allMetadata = filterMetadata(
            await appwriteService.getNaatsMetadata(),
            channelId,
            pureOnly,
          );

          console.log(
            `[ForYou] Loaded ${allMetadata.length} naats metadata from cache`,
          );

          const rankedMetadata = await getForYouFeed(allMetadata, channelId);

          console.log(
            `[ForYou] Ranked ${rankedMetadata.length} naats based on user preferences`,
          );

          fullOrderedListRef.current.set(cacheKey, rankedMetadata);

          const startIndex = offsetRef.current;
          const endIndex = startIndex + PAGE_SIZE;
          const pageMetadata = rankedMetadata.slice(startIndex, endIndex);
          const validNaats = await fetchNaatsFromMetadata(pageMetadata);

          filterCache.set(offsetRef.current, validNaats);

          setNaats((prev) => {
            const existingIds = new Set(prev.map((n) => n.$id));
            const uniqueNewNaats = validNaats.filter(
              (n) => !existingIds.has(n.$id),
            );
            return [...prev, ...uniqueNewNaats];
          });

          offsetRef.current += PAGE_SIZE;
          setHasMore(endIndex < rankedMetadata.length);

          console.log(
            `[ForYou] Displayed ${validNaats.length} naats, ${rankedMetadata.length - endIndex} remaining`,
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to load For You feed"),
          );
          console.error("[ForYou] Error:", err);
        } finally {
          setLoading(false);
          isLoadingRef.current = false;
        }
      };

      loadForYou();
    } else {
      // Standard fetch for other filters
      appwriteService
        .getNaats(PAGE_SIZE, offsetRef.current, filter, channelId, pureOnly)
        .then((newNaats) => {
          // Cache the results for this channel + filter combination
          filterCache.set(offsetRef.current, newNaats);

          // Update state - filter out duplicates
          setNaats((prev) => {
            const existingIds = new Set(prev.map((n) => n.$id));
            const uniqueNewNaats = newNaats.filter(
              (n) => !existingIds.has(n.$id),
            );
            return [...prev, ...uniqueNewNaats];
          });
          offsetRef.current += PAGE_SIZE;
          setHasMore(newNaats.length === PAGE_SIZE);
        })
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
  }, [hasMore, filter, channelId, cacheKey, pureOnly]);

  /**
   * Refresh the naats list (pull-to-refresh)
   * Clears ALL caches (all channel + sort combinations) and reloads from the beginning
   * Maintains the currently selected channel and sort filters
   * For "forYou", also clears the session cache
   */
  const refresh = useCallback(async (): Promise<void> => {
    // Reset state
    offsetRef.current = 0;

    // Clear ALL caches (all channel + sort combinations)
    cacheRef.current.clear();
    fullOrderedListRef.current.clear();

    // Clear For You session if using that filter
    if (filter === "forYou") {
      await storageService.clearForYouSession();
      appwriteService.clearMetadataCache();
    }

    setNaats([]);
    setHasMore(true);
    setError(null);
    setLoading(true);
    isLoadingRef.current = true;

    try {
      if (filter === "forYou") {
        const allMetadata = filterMetadata(
          await appwriteService.getNaatsMetadata(),
          channelId,
          pureOnly,
        );

        console.log(
          `[ForYou Refresh] Loaded ${allMetadata.length} naats metadata`,
        );

        const rankedMetadata = await getForYouFeed(allMetadata, channelId);
        fullOrderedListRef.current.set(cacheKey, rankedMetadata);

        const pageMetadata = rankedMetadata.slice(0, PAGE_SIZE);
        const freshNaats = await fetchNaatsFromMetadata(pageMetadata);

        if (!cacheRef.current.has(cacheKey)) {
          cacheRef.current.set(cacheKey, new Map());
        }
        const filterCache = cacheRef.current.get(cacheKey)!;

        filterCache.set(0, freshNaats);

        setNaats(freshNaats);
        offsetRef.current = PAGE_SIZE;
        setHasMore(PAGE_SIZE < rankedMetadata.length);

        console.log(
          `[ForYou Refresh] Displayed ${freshNaats.length} naats, ${rankedMetadata.length - PAGE_SIZE} remaining`,
        );
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
  }, [filter, channelId, cacheKey, pureOnly]);

  return {
    naats,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
