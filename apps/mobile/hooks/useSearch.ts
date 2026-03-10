import { searchItems } from "@naat-collection/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { appwriteService } from "../services/appwrite";
import type { Naat, UseSearchReturn } from "../types";

/**
 * Custom hook for searching naats with AI-powered semantic search
 *
 * Features:
 * - AI-powered semantic search using OpenAI + Supabase (when enabled)
 * - Fallback to client-side search if semantic search fails or disabled
 * - Debounced search with 500ms delay (longer for API calls)
 * - Real-time filtering as user types
 * - Channel filtering support
 * - Understands synonyms and related terms
 *
 * @param channelId - Optional channel ID to filter search results (null = all channels)
 * @returns UseSearchReturn object with search state and control functions
 */
export function useSearch(channelId: string | null = null, pureOnly: boolean = false): UseSearchReturn {
  const [query, setQueryState] = useState<string>("");
  const [results, setResults] = useState<Naat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Check if semantic search is enabled
  const useSemanticSearch = process.env.EXPO_PUBLIC_USE_SEMANTIC_SEARCH === "true";

  // Ref to store all naats for client-side fallback search
  const allNaatsRef = useRef<Naat[]>([]);

  // Ref to store the debounce timeout
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to track if component is mounted
  const isMountedRef = useRef<boolean>(true);

  /**
   * Load all naats for client-side fallback search
   */
  const loadNaats = useCallback(async () => {
    try {
      // Fetch naats from server
      const naats = await appwriteService.getNaats(
        5000, // Fetch up to 5000 naats
        0,
        "latest",
        channelId,
        pureOnly,
      );

      if (isMountedRef.current) {
        allNaatsRef.current = naats;
      }
    } catch (error) {
      console.error("Failed to load naats for search:", error);
    }
  }, [channelId, pureOnly]);

  /**
   * Perform semantic search using AI or fallback to client-side
   */
  const performSemanticSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Use semantic search if enabled, otherwise use client-side
      if (useSemanticSearch) {
        console.log("[Search] Using semantic search");
        const searchResults = await appwriteService.semanticSearch(searchQuery);
        
        // Filter by channel if specified
        let filteredResults = channelId
          ? searchResults.filter((naat) => naat.channelId === channelId)
          : searchResults;

        // Filter by pure if specified
        if (pureOnly) {
          filteredResults = filteredResults.filter((naat) => !!naat.cutAudio);
        }

        if (isMountedRef.current) {
          setResults(filteredResults);
        }
      } else {
        console.log("[Search] Using client-side search");
        // Use client-side search
        const searchResults = searchItems(allNaatsRef.current, searchQuery, {
          searchInChannel: true,
          minScore: 60,
        });

        if (isMountedRef.current) {
          setResults(searchResults);
        }
      }
    } catch (error) {
      console.error("Search failed, using fallback:", error);
      
      // Fallback to client-side search on any error
      try {
        const searchResults = searchItems(allNaatsRef.current, searchQuery, {
          searchInChannel: true,
          minScore: 60,
        });

        if (isMountedRef.current) {
          setResults(searchResults);
        }
      } catch (fallbackError) {
        console.error("Fallback search also failed:", fallbackError);
        if (isMountedRef.current) {
          setResults([]);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [channelId, useSemanticSearch, pureOnly]);

  /**
   * Set search query with debouncing
   * Triggers search after 500ms of inactivity (longer for API calls)
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

      // Set new timeout for debounced search (500ms for API calls)
      debounceTimeoutRef.current = setTimeout(() => {
        performSemanticSearch(newQuery);
      }, 500);
    },
    [performSemanticSearch],
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
        performSemanticSearch(query);
      });
    }
  }, [channelId, pureOnly]); // Only depend on channelId/pureOnly to avoid infinite loops

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
