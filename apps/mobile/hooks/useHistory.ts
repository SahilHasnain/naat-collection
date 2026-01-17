/**
 * Custom hook for managing watch history
 */

import { useCallback, useEffect, useState } from "react";
import { appwriteService } from "../services/appwrite";
import { storageService } from "../services/storage";
import type { Naat } from "../types";

export interface HistoryItem extends Naat {
  watchedAt: number; // Timestamp when watched
}

export interface UseHistoryReturn {
  history: HistoryItem[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  clearHistory: () => Promise<void>;
  removeFromHistory: (naatId: string) => Promise<void>;
}

const PAGE_SIZE = 20; // Load 20 items at a time

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [allHistoryIds, setAllHistoryIds] = useState<string[]>([]);
  const [timestamps, setTimestamps] = useState<Record<string, number>>({});

  /**
   * Initialize history IDs and timestamps, then load first page
   */
  const initializeHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all history IDs and timestamps from storage
      const historyIds = await storageService.getWatchHistory();
      const historyTimestamps =
        await storageService.getWatchHistoryTimestamps();

      setAllHistoryIds(historyIds);
      setTimestamps(historyTimestamps);

      if (historyIds.length === 0) {
        setHasMore(false);
        setHistory([]);
        return;
      }

      // Load first page immediately
      const idsToLoad = historyIds.slice(0, PAGE_SIZE);
      const naatPromises = idsToLoad.map(async (naatId) => {
        try {
          const naat = await appwriteService.getNaatById(naatId);
          return {
            ...naat,
            watchedAt: historyTimestamps[naatId] || Date.now(),
          };
        } catch (err) {
          console.error(`Failed to fetch naat ${naatId}:`, err);
          return null;
        }
      });

      const naats = await Promise.all(naatPromises);
      const validNaats = naats.filter(
        (naat): naat is HistoryItem => naat !== null
      );

      setHistory(validNaats);
      setCurrentPage(1);
      setHasMore(historyIds.length > PAGE_SIZE);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initialize history";
      setError(new Error(errorMessage));
      console.error("Error initializing history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load more history items (pagination)
   */
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);

      // Calculate which items to load
      const startIndex = currentPage * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      const idsToLoad = allHistoryIds.slice(startIndex, endIndex);

      if (idsToLoad.length === 0) {
        setHasMore(false);
        return;
      }

      // Fetch naat details for this page
      const naatPromises = idsToLoad.map(async (naatId) => {
        try {
          const naat = await appwriteService.getNaatById(naatId);
          return {
            ...naat,
            watchedAt: timestamps[naatId] || Date.now(),
          };
        } catch (err) {
          console.error(`Failed to fetch naat ${naatId}:`, err);
          return null;
        }
      });

      const naats = await Promise.all(naatPromises);

      // Filter out null values (failed fetches)
      const validNaats = naats.filter(
        (naat): naat is HistoryItem => naat !== null
      );

      // Append to existing history
      setHistory((prev) => [...prev, ...validNaats]);
      setCurrentPage((prev) => prev + 1);

      // Check if there are more items to load
      setHasMore(endIndex < allHistoryIds.length);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load more history";
      setError(new Error(errorMessage));
      console.error("Error loading more history:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, currentPage, allHistoryIds, timestamps]);

  /**
   * Refresh history (reset and reload from beginning)
   */
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get fresh data from storage
      const historyIds = await storageService.getWatchHistory();
      const historyTimestamps =
        await storageService.getWatchHistoryTimestamps();

      setAllHistoryIds(historyIds);
      setTimestamps(historyTimestamps);
      setCurrentPage(0);
      setHistory([]);

      if (historyIds.length === 0) {
        setHasMore(false);
        return;
      }

      // Load first page
      const idsToLoad = historyIds.slice(0, PAGE_SIZE);
      const naatPromises = idsToLoad.map(async (naatId) => {
        try {
          const naat = await appwriteService.getNaatById(naatId);
          return {
            ...naat,
            watchedAt: historyTimestamps[naatId] || Date.now(),
          };
        } catch (err) {
          console.error(`Failed to fetch naat ${naatId}:`, err);
          return null;
        }
      });

      const naats = await Promise.all(naatPromises);
      const validNaats = naats.filter(
        (naat): naat is HistoryItem => naat !== null
      );

      setHistory(validNaats);
      setCurrentPage(1);
      setHasMore(historyIds.length > PAGE_SIZE);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh history";
      setError(new Error(errorMessage));
      console.error("Error refreshing history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(async () => {
    try {
      setError(null);

      await storageService.clearWatchHistory();

      setHistory([]);
      setAllHistoryIds([]);
      setTimestamps({});
      setCurrentPage(0);
      setHasMore(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear history";
      setError(new Error(errorMessage));
      console.error("Error clearing history:", err);
      throw err;
    }
  }, []);

  /**
   * Remove a single item from history
   */
  const removeFromHistory = useCallback(
    async (naatId: string) => {
      try {
        setError(null);

        await storageService.removeFromWatchHistory(naatId);

        // Update all state
        setHistory((prev) => prev.filter((item) => item.$id !== naatId));
        setAllHistoryIds((prev) => prev.filter((id) => id !== naatId));

        // Update hasMore if we removed the last item
        setHasMore((prev) => {
          const newLength = allHistoryIds.length - 1;
          return newLength > history.length - 1;
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to remove from history";
        setError(new Error(errorMessage));
        console.error("Error removing from history:", err);
        throw err;
      }
    },
    [allHistoryIds.length, history.length]
  );

  // Initialize history on mount
  useEffect(() => {
    initializeHistory();
  }, [initializeHistory]);

  return {
    history,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    clearHistory,
    removeFromHistory,
  };
}
