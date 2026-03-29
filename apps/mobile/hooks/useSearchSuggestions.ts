import { SearchSuggestion } from "@/components/SearchSuggestions";
import {
  addToSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeFromSearchHistory,
  SearchHistoryItem,
} from "@/services/searchHistory";
import { useCallback, useEffect, useState } from "react";

interface UseSearchSuggestionsOptions {
  maxSuggestions?: number;
}

export function useSearchSuggestions({
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

  const generateSuggestions = useCallback(
    (): SearchSuggestion[] => {
      return history.slice(0, maxSuggestions).map((item) => ({
        id: item.id,
        text: item.query,
        type: "history" as const,
      }));
    },
    [history, maxSuggestions],
  );

  useEffect(() => {
    setSuggestions(generateSuggestions());
  }, [history, generateSuggestions]);

  const updateSuggestions = useCallback(
    () => {
      setSuggestions(generateSuggestions());
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
