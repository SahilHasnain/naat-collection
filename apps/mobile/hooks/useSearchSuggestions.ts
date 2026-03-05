import { SearchSuggestion } from "@/components/SearchSuggestions";
import {
  addToSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeFromSearchHistory,
  SearchHistoryItem,
} from "@/services/searchHistory";
import { type Naat } from "@/types";
import { searchItems } from "@naat-collection/shared";
import { useCallback, useEffect, useState } from "react";

interface UseSearchSuggestionsOptions {
  naats: Naat[];
  maxSuggestions?: number;
}

export function useSearchSuggestions({
  naats,
  maxSuggestions = 10,
}: UseSearchSuggestionsOptions) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  // Load search history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const historyItems = await getSearchHistory();
    setHistory(historyItems);
  };

  /**
   * Generate suggestions based on query
   * - If query is empty, ALWAYS show recent search history (regardless of disable flag)
   * - If query has text, show matching naats using same algorithm as search (unless disabled)
   */
  const generateSuggestions = useCallback(
    (query: string): SearchSuggestion[] => {
      const trimmedQuery = query.trim();

      // ALWAYS show history when query is empty (ignore disable flag for history)
      if (!trimmedQuery) {
        return history.slice(0, maxSuggestions).map((item) => ({
          id: item.id,
          text: item.query,
          type: "history" as const,
        }));
      }

      // Check if search suggestions are disabled (only affects suggestions while typing, NOT history)
      const disableSuggestions = process.env.EXPO_PUBLIC_DISABLE_SEARCH_SUGGESTIONS === "true";
      
      if (disableSuggestions) {
        return [];
      }

      // Use the same search algorithm as the main search
      const searchResults = searchItems(naats, trimmedQuery, {
        searchInChannel: true,
        minScore: 60,
      });

      // Return top suggestions
      return searchResults.slice(0, maxSuggestions).map((naat: Naat) => ({
        id: naat.$id,
        text: naat.title,
        thumbnailUrl: naat.thumbnailUrl,
        type: "suggestion" as const,
      }));
    },
    [history, naats, maxSuggestions],
  );

  // Update suggestions when history changes
  useEffect(() => {
    if (history.length > 0) {
      const newSuggestions = generateSuggestions("");
      setSuggestions(newSuggestions);
    }
  }, [history, generateSuggestions]);

  /**
   * Update suggestions based on query
   */
  const updateSuggestions = useCallback(
    (query: string) => {
      const newSuggestions = generateSuggestions(query);
      setSuggestions(newSuggestions);
    },
    [generateSuggestions],
  );

  /**
   * Add query to search history
   */
  const addToHistory = useCallback(async (query: string) => {
    await addToSearchHistory(query);
    await loadHistory();
  }, []);

  /**
   * Remove item from search history
   */
  const removeFromHistory = useCallback(async (id: string) => {
    await removeFromSearchHistory(id);
    await loadHistory();
  }, []);

  /**
   * Clear all search history
   */
  const clearHistory = useCallback(async () => {
    await clearSearchHistory();
    await loadHistory();
  }, []);

  return {
    suggestions,
    history,
    updateSuggestions,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
