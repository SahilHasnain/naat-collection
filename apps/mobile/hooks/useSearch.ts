import { useCallback, useEffect, useRef, useState } from "react";
import { appwriteService } from "../services/appwrite";
import type { Naat, UseSearchReturn } from "../types";

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 300;

/**
 * Custom hook for searching naats with debouncing
 *
 * Features:
 * - Debounced search with 300ms delay
 * - Real-time filtering as user types
 * - Clear search to restore full list
 * - Error handling
 * - Loading states
 * - Channel filtering support
 *
 * @param channelId - Optional channel ID to filter search results (null = all channels)
 * @returns UseSearchReturn object with search state and control functions
 */
export function useSearch(channelId: string | null = null): UseSearchReturn {
  const [query, setQueryState] = useState<string>("");
  const [results, setResults] = useState<Naat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Ref to store the debounce timeout
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to track if component is mounted
  const isMountedRef = useRef<boolean>(true);

  /**
   * Perform the actual search
   */
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const searchResults = await appwriteService.searchNaats(
          searchQuery,
          channelId
        );

        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setResults(searchResults);
        }
      } catch (error) {
        console.error("Search failed:", error);

        // On error, clear results
        if (isMountedRef.current) {
          setResults([]);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [channelId]
  );

  /**
   * Set search query with debouncing
   * Triggers search after 300ms of inactivity
   */
  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // If query is empty, clear results immediately
      if (!newQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Set loading state immediately for better UX
      setLoading(true);

      // Set new timeout for debounced search
      debounceTimeoutRef.current = setTimeout(() => {
        performSearch(newQuery);
      }, DEBOUNCE_DELAY);
    },
    [performSearch]
  );

  /**
   * Clear search query and results
   * Restores to initial state
   */
  const clearSearch = useCallback(() => {
    // Clear any pending debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    setQueryState("");
    setResults([]);
    setLoading(false);
  }, []);

  // Reset search results when channelId changes
  useEffect(() => {
    // If there's an active search query, re-run the search with the new channelId
    if (query.trim()) {
      performSearch(query);
    } else {
      // Otherwise just clear results
      setResults([]);
    }
  }, [channelId, query, performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Clear any pending timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    query,
    results,
    loading,
    setQuery,
    clearSearch,
  };
}
