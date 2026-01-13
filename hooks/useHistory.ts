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
  refresh: () => Promise<void>;
  clearHistory: () => Promise<void>;
  removeFromHistory: (naatId: string) => Promise<void>;
}

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load history from storage and fetch naat details
   */
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get history IDs and timestamps from storage
      const historyIds = await storageService.getWatchHistory();
      const timestamps = await storageService.getWatchHistoryTimestamps();

      if (historyIds.length === 0) {
        setHistory([]);
        return;
      }

      // Fetch naat details for each ID
      const naatPromises = historyIds.map(async (naatId) => {
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

      setHistory(validNaats);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load history";
      setError(new Error(errorMessage));
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh history
   */
  const refresh = useCallback(async () => {
    await loadHistory();
  }, [loadHistory]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(async () => {
    try {
      setError(null);

      // Clear history from storage
      const historyIds = await storageService.getWatchHistory();

      // Clear each item (this will trigger the storage service to clear the array)
      for (const id of historyIds) {
        // We'll need to add a method to remove individual items or clear all
      }

      // For now, we'll manually clear by saving an empty array
      // Note: We need to add a clearWatchHistory method to storage service
      await storageService.clearWatchHistory();

      setHistory([]);
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
  const removeFromHistory = useCallback(async (naatId: string) => {
    try {
      setError(null);

      await storageService.removeFromWatchHistory(naatId);

      // Update state immediately
      setHistory((prev) => prev.filter((item) => item.$id !== naatId));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to remove from history";
      setError(new Error(errorMessage));
      console.error("Error removing from history:", err);
      throw err;
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    error,
    refresh,
    clearHistory,
    removeFromHistory,
  };
}
