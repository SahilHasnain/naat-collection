import Fuse from "fuse.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { appwriteService } from "../services/appwrite";
import type { Naat, UseSearchReturn } from "../types";

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 300;

/**
 * Fuse.js configuration for fuzzy search
 */
const FUSE_OPTIONS: Fuse.IFuseOptions<Naat> = {
  keys: [
    {
      name: "title",
      weight: 0.7, // Title is most important
    },
    {
      name: "channelName",
      weight: 0.3, // Channel name is secondary
    },
  ],
  threshold: 0.3, // 0 = exact match, 1 = match anything (0.3 is good balance)
  distance: 100, // Maximum distance for fuzzy matching
  minMatchCharLength: 2, // Minimum characters to start matching
  includeScore: true, // Include relevance score
  ignoreLocation: true, // Search anywhere in the string
  useExtendedSearch: false, // Keep it simple
};

/**
 * Custom hook for searching naats with fuzzy matching
 *
 * Features:
 * - Fuzzy search using Fuse.js (handles typos)
 * - Multi-field search (title + channelName)
 * - Debounced search with 300ms delay
 * - Real-time filtering as user types
 * - Relevance-based sorting
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

  // Ref to store all naats for client-side search
  const allNaatsRef = useRef<Naat[]>([]);

  // Ref to store Fuse instance
  const fuseRef = useRef<Fuse<Naat> | null>(null);

  // Ref to store the debounce timeout
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to track if component is mounted
  const isMountedRef = useRef<boolean>(true);

  /**
   * Load all naats for client-side search
   */
  const loadNaats = useCallback(async () => {
    try {
      // Fetch a large batch of naats (adjust limit as needed)
      const naats = await appwriteService.getNaats(
        5000, // Fetch up to 5000 naats
        0,
        "latest",
        channelId,
      );

      if (isMountedRef.current) {
        allNaatsRef.current = naats;
        // Initialize Fuse with the naats
        fuseRef.current = new Fuse(naats, FUSE_OPTIONS);
      }
    } catch (error) {
      console.error("Failed to load naats for search:", error);
    }
  }, [channelId]);

  /**
   * Perform the actual search using Fuse.js
   */
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      if (!fuseRef.current) {
        // Fallback: if Fuse not initialized, do simple filter
        const filtered = allNaatsRef.current.filter((naat) =>
          naat.title.toLowerCase().includes(searchQuery.toLowerCase()),
        );
        setResults(filtered);
      } else {
        // Use Fuse.js for fuzzy search
        const fuseResults = fuseRef.current.search(searchQuery);

        // Extract the items from Fuse results (sorted by relevance)
        const searchResults = fuseResults.map((result) => result.item);

        setResults(searchResults);
      }
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
