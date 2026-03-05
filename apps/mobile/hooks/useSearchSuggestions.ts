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
   * Calculate fuzzy match score for a text against a query
   * Returns a score between 0 and 1, where 1 is a perfect match
   */
  const calculateMatchScore = (text: string, query: string): number => {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match gets highest score
    if (textLower === queryLower) return 1.0;

    // Starts with query gets high score
    if (textLower.startsWith(queryLower)) return 0.9;

    // Contains exact query as substring
    if (textLower.includes(queryLower)) return 0.8;

    // Split query into words and check if all words are present
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 0);
    const textWords = textLower.split(/\s+/);

    // Check if all query words are present in text
    const allWordsPresent = queryWords.every((queryWord) =>
      textWords.some((textWord) => textWord.includes(queryWord)),
    );

    if (allWordsPresent) {
      // Calculate score based on how many words match
      const matchingWords = queryWords.filter((queryWord) =>
        textWords.some((textWord) => textWord.startsWith(queryWord)),
      );
      return 0.5 + (matchingWords.length / queryWords.length) * 0.2;
    }

    // Fuzzy character matching - check if query characters appear in order
    let textIndex = 0;
    let queryIndex = 0;
    let matchedChars = 0;

    while (textIndex < textLower.length && queryIndex < queryLower.length) {
      if (textLower[textIndex] === queryLower[queryIndex]) {
        matchedChars++;
        queryIndex++;
      }
      textIndex++;
    }

    // If all query characters found in order, give partial score
    if (matchedChars === queryLower.length) {
      return 0.3 + (matchedChars / textLower.length) * 0.2;
    }

    return 0;
  };

  /**
   * Generate suggestions based on query
   * - If query is empty, show recent search history
   * - If query has text, show matching naats with fuzzy matching
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

      // Generate suggestions from naats with scoring
      const scoredNaats = naats
        .map((naat) => {
          const titleScore = calculateMatchScore(naat.title, trimmedQuery);
          const channelScore = calculateMatchScore(
            naat.channelName,
            trimmedQuery,
          );
          const maxScore = Math.max(titleScore, channelScore);

          return {
            naat,
            score: maxScore,
          };
        })
        .filter((item) => item.score > 0.2) // Only include reasonable matches
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, maxSuggestions);

      return scoredNaats.map(({ naat }) => ({
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
