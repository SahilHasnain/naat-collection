"use client";

import { NaatGrid } from "@/components/NaatGrid";
import { SearchBar } from "@/components/SearchBar";
import { appwriteService } from "@/lib/appwrite";
import type { Naat } from "@naat-collection/shared";
import Fuse from "fuse.js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SearchPageClientProps {
  initialQuery: string;
}

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

export function SearchPageClient({ initialQuery }: SearchPageClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [naats, setNaats] = useState<Naat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Ref to store all naats for client-side search
  const allNaatsRef = useRef<Naat[]>([]);

  // Ref to store Fuse instance
  const fuseRef = useRef<Fuse<Naat> | null>(null);

  // Load all naats once for client-side search
  useEffect(() => {
    const loadNaats = async () => {
      try {
        setIsLoadingData(true);
        // Fetch a large batch of naats (adjust limit as needed)
        const fetchedNaats = await appwriteService.getNaats(
          5000, // Fetch up to 5000 naats
          0,
          "latest",
          null,
        );

        allNaatsRef.current = fetchedNaats;
        // Initialize Fuse with the naats
        fuseRef.current = new Fuse(fetchedNaats, FUSE_OPTIONS);
      } catch (err) {
        console.error("Failed to load naats for search:", err);
        setError("Failed to load search data");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadNaats();
  }, []);

  useEffect(() => {
    const searchNaats = () => {
      if (!query.trim()) {
        setNaats([]);
        setError(null);
        return;
      }

      if (isLoadingData) {
        return; // Wait for data to load
      }

      setIsLoading(true);
      setError(null);

      try {
        if (!fuseRef.current) {
          // Fallback: if Fuse not initialized, do simple filter
          const filtered = allNaatsRef.current.filter((naat) =>
            naat.title.toLowerCase().includes(query.toLowerCase()),
          );
          setNaats(filtered);
        } else {
          // Use Fuse.js for fuzzy search
          const fuseResults = fuseRef.current.search(query);

          // Extract the items from Fuse results (sorted by relevance)
          const searchResults = fuseResults.map((result) => result.item);

          setNaats(searchResults);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        console.error("Error searching naats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchNaats();
      if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      } else {
        router.push("/search");
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, router, isLoadingData]);

  const isSearching = query.trim().length > 0;
  const showLoading = isLoading || isLoadingData;

  return (
    <div className="max-w-7xl mx-auto py-8">
      <header className="mb-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-6">Search Naats</h1>
        <SearchBar value={query} onChangeText={setQuery} />
      </header>

      {error && (
        <div className="bg-accent-error/10 border border-accent-error/20 text-accent-error px-4 py-3 rounded mb-6 mx-4 sm:mx-6 lg:mx-8">
          {error}
        </div>
      )}

      {showLoading && (
        <div className="text-center py-12 px-4">
          <p className="text-neutral-400">
            {isLoadingData ? "Loading search data..." : "Searching..."}
          </p>
        </div>
      )}

      {!showLoading && isSearching && (
        <>
          <div className="mb-6 px-4 sm:px-6 lg:px-8">
            <p className="text-neutral-400">
              {naats.length > 0
                ? `Found ${naats.length} result${naats.length === 1 ? "" : "s"} for "${query}"`
                : `No results found for "${query}"`}
            </p>
          </div>

          {naats.length > 0 && <NaatGrid naats={naats} searchQuery={query} />}

          {naats.length === 0 && !error && (
            <div className="text-center py-12 px-4">
              <p className="text-neutral-400 mb-4">
                No naats found matching your search.
              </p>
              <p className="text-sm text-neutral-500">
                Try different keywords or check your spelling.
              </p>
            </div>
          )}
        </>
      )}

      {!isSearching && !showLoading && (
        <div className="text-center py-12 px-4">
          <svg
            className="mx-auto h-12 w-12 text-neutral-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-neutral-400 mb-2">Start searching for naats</p>
          <p className="text-sm text-neutral-500">
            Enter keywords to find your favorite naats
          </p>
        </div>
      )}
    </div>
  );
}
