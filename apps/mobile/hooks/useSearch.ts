import { searchItems } from "@naat-collection/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { appwriteService } from "../services/appwrite";
import type { Naat, UseSearchReturn } from "../types";

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 300;

/**
 * Custom hook for searching naats with custom algorithm
 *
 * Features:
 * - All search words must be present (no partial matches)
 * - Relevance-based scoring (exact phrase > word order > all words)
 * - Fast performance (no fuzzy matching overhead)
 * - Debounced search with 300ms delay
 * - Real-time filtering as user types
 * - Channel filtering support
 * - Ignores small connector words
 *
 * @param channelId - Optional channel ID to filter search results (null = all channels)
 * @returns UseSearchReturn object with search state and control functions
 */
export function useSearch(channelId: string | null = null): UseSearchReturn {
  const [query, setQueryState] = useState<string>("");
  const [results, setResults] = useState<Naat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Ref to store all naats for client-side search
  const allNaatsRef = useRef<Naat[]>([]);

  // Ref to store the debounce timeout
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to track if component is mounted
  const isMountedRef = useRef<boolean>(true);

  /**
   * Load all naats for client-side search
   */
  const loadNaats = useCallback(async () => {
    try {
      // Fetch naats from server
      const naats = await appwriteService.getNaats(
        5000, // Fetch up to 5000 naats
        0,
        "latest",
        channelId,
      );

      if (isMountedRef.current) {
        allNaatsRef.current = naats;
      }
    } catch (error) {
      console.error("Failed to load naats for search:", error);
    }
  }, [channelId]);

  /**
   * Perform the actual search using custom algorithm
   */
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Use custom search algorithm
      const searchResults = searchItems(allNaatsRef.current, searchQuery, {
        searchInChannel: true,
        minScore: 60, // Only show results with all words present
      });

      setResults(searchResults);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

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
    [performSearch],
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

  // Load naats when component mounts or channelId changes
  useEffect(() => {
    loadNaats();
  }, [loadNaats]);

  // Re-run search when channelId changes and there's an active query
  useEffect(() => {
    if (query.trim()) {
      // Reload naats and re-search
      loadNaats().then(() => {
        performSearch(query);
      });
    }
  }, [channelId]); // Only depend on channelId to avoid infinite loops

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
