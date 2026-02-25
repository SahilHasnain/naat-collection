import { SearchSuggestion } from "@/components/SearchSuggestions";
import {
  addToSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeFromSearchHistory,
  SearchHistoryItem,
} from "@/services/searchHistory";
import type { Naat } from "@/types";
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

  // Update suggestions when history changes
  useEffect(() => {
    if (history.length > 0) {
      const newSuggestions = generateSuggestions("");
      setSuggestions(newSuggestions);
    }
  }, [history, generateSuggestions]);

  const loadHistory = async () => {
    const historyItems = await getSearchHistory();
    setHistory(historyItems);
  };

  /**
   * Generate suggestions based on query
   * - If query is empty, show recent search history
   * - If query has text, show matching naats
   */
  const generateSuggestions = useCallback(
    (query: string): SearchSuggestion[] => {
      const trimmedQuery = query.trim().toLowerCase();

      // Show history when query is empty
      if (!trimmedQuery) {
        return history.slice(0, maxSuggestions).map((item) => ({
          id: item.id,
          text: item.query,
          type: "history" as const,
        }));
      }

      // Generate suggestions from naats
      const matchingNaats = naats
        .filter((naat) => {
          const titleMatch = naat.title.toLowerCase().includes(trimmedQuery);
          const channelMatch = naat.channelName
            .toLowerCase()
            .includes(trimmedQuery);
          return titleMatch || channelMatch;
        })
        .slice(0, maxSuggestions);

      return matchingNaats.map((naat) => ({
        id: naat.$id,
        text: naat.title,
        thumbnailUrl: naat.thumbnailUrl,
        type: "suggestion" as const,
      }));
    },
    [history, naats, maxSuggestions],
  );

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
