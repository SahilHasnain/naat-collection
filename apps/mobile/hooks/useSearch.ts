import { searchItems } from "@naat-collection/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { appwriteService } from "../services/appwrite";
import type { Naat, NaatMetadata, UseSearchReturn } from "../types";

const SEARCH_RESULT_LIMIT = 30;

function filterMetadata(
  metadata: NaatMetadata[],
  channelId: string | null,
  pureOnly: boolean,
): NaatMetadata[] {
  let filtered = metadata;

  if (channelId) {
    filtered = filtered.filter((item) => item.channelId === channelId);
  }

  if (pureOnly) {
    filtered = filtered.filter((item) => !!item.cutAudio);
  }

  return filtered;
}

async function fetchNaatsFromMetadata(
  matches: NaatMetadata[],
): Promise<Naat[]> {
  const naats = await Promise.all(
    matches.map(async (meta) => {
      try {
        return await appwriteService.getNaatById(meta.id);
      } catch (error) {
        console.error(`Failed to fetch naat ${meta.id}:`, error);
        return null;
      }
    }),
  );

  return naats.filter((naat): naat is Naat => naat !== null);
}

/**
 * Custom hook for searching naats with AI-powered semantic search
 *
 * Features:
 * - AI-powered semantic search using OpenAI + Supabase (when enabled)
 * - Metadata cache + fuzzy local search (1 read + top-match fetches)
 * - Debounced search with 500ms delay
 * - Channel filtering support
 */
export function useSearch(
  channelId: string | null = null,
  pureOnly: boolean = false,
): UseSearchReturn {
  const [query, setQueryState] = useState<string>("");
  const [results, setResults] = useState<Naat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const useSemanticSearch =
    process.env.EXPO_PUBLIC_USE_SEMANTIC_SEARCH === "true";

  const allMetadataRef = useRef<NaatMetadata[]>([]);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const loadMetadata = useCallback(async () => {
    try {
      const metadata = filterMetadata(
        await appwriteService.getNaatsMetadata(),
        channelId,
        pureOnly,
      );

      if (isMountedRef.current) {
        allMetadataRef.current = metadata;
      }
    } catch (error) {
      console.error("Failed to load metadata for search:", error);
    }
  }, [channelId, pureOnly]);

  const performClientSearch = useCallback(async (searchQuery: string) => {
    const matches = searchItems(allMetadataRef.current, searchQuery, {
      searchInChannel: true,
      minScore: 60,
    });

    const topMatches = matches.slice(0, SEARCH_RESULT_LIMIT);
    const naats = await fetchNaatsFromMetadata(topMatches);

    if (isMountedRef.current) {
      setResults(naats);
    }
  }, []);

  const performSemanticSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        if (useSemanticSearch) {
          console.log("[Search] Using semantic search");
          const searchResults = await appwriteService.semanticSearch(
            searchQuery,
          );

          let filteredResults = channelId
            ? searchResults.filter((naat) => naat.channelId === channelId)
            : searchResults;

          if (pureOnly) {
            filteredResults = filteredResults.filter((naat) => !!naat.cutAudio);
          }

          if (isMountedRef.current) {
            setResults(filteredResults);
          }
        } else {
          console.log("[Search] Using metadata cache + fuzzy search");
          await performClientSearch(searchQuery);
        }
      } catch (error) {
        console.error("Search failed, using fallback:", error);

        try {
          await performClientSearch(searchQuery);
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
    },
    [channelId, useSemanticSearch, pureOnly, performClientSearch],
  );

  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      if (!newQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      debounceTimeoutRef.current = setTimeout(() => {
        performSemanticSearch(newQuery);
      }, 500);
    },
    [performSemanticSearch],
  );

  const clearSearch = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    setQueryState("");
    setResults([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    if (query.trim()) {
      loadMetadata().then(() => {
        performSemanticSearch(query);
      });
    }
  }, [channelId, pureOnly]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

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
