"use client";

import { ChannelFilter } from "@/components/ChannelFilter";
import { DurationFilter } from "@/components/DurationFilter";
import { NaatGrid } from "@/components/NaatGrid";
import { SearchBar } from "@/components/SearchBar";
import { SortFilter, type SortOption } from "@/components/SortFilter";
import { useNaats } from "@/hooks/useNaats";
import { appwriteService } from "@/lib/appwrite";
import type { Channel, DurationOption, Naat } from "@naat-collection/shared";
import { filterNaatsByDuration } from "@naat-collection/shared";
import { useEffect, useRef, useState } from "react";

interface HomeClientProps {
  initialChannels: Channel[];
}

export function HomeClient({ initialChannels }: HomeClientProps) {
  const [channels] = useState<Channel[]>(initialChannels);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [selectedSort, setSelectedSort] = useState<SortOption>("forYou");
  const [selectedDuration, setSelectedDuration] =
    useState<DurationOption>("all");
  const [searchResults, setSearchResults] = useState<Naat[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Use the smart hook for browse mode
  const {
    naats: browseNaats,
    loading: browseLoading,
    error: browseError,
    hasMore,
    loadMore,
  } = useNaats(selectedChannelId, selectedSort);

  // Ref for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle search separately
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const fetchSearch = async () => {
      setSearchLoading(true);
      setSearchError(null);

      try {
        const results = await appwriteService.searchNaats(
          searchQuery,
          selectedChannelId,
        );
        setSearchResults(results);
      } catch (err) {
        setSearchError(
          err instanceof Error ? err.message : "Failed to search naats",
        );
        console.error("Error searching naats:", err);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(fetchSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedChannelId]);

  // Infinite scroll setup
  useEffect(() => {
    if (searchQuery.trim()) return; // Don't use infinite scroll in search mode

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !browseLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, browseLoading, loadMore, searchQuery]);

  // Trigger initial load
  useEffect(() => {
    if (!searchQuery.trim() && browseNaats.length === 0 && !browseLoading) {
      loadMore();
    }
  }, [searchQuery, browseNaats.length, browseLoading, loadMore]);

  const isSearching = searchQuery.trim().length > 0;
  const baseNaats = isSearching ? searchResults : browseNaats;
  // Apply duration filter
  const displayNaats = filterNaatsByDuration(baseNaats, selectedDuration);
  const loading = isSearching ? searchLoading : browseLoading;
  const error = isSearching ? searchError : browseError?.message || null;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Bar - Mobile */}
      {isMobile && (
        <>
          <div className="bg-gray-800 border-b border-gray-700 p-4">
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              isMobile={true}
            />
          </div>

          {!isSearching && (
            <>
              <ChannelFilter
                channels={channels}
                selectedChannelId={selectedChannelId}
                onChannelChange={setSelectedChannelId}
                loading={false}
                isMobile={true}
              />
              <SortFilter
                selectedSort={selectedSort}
                onSortChange={setSelectedSort}
                isMobile={true}
              />
              <DurationFilter
                selectedDuration={selectedDuration}
                onDurationChange={setSelectedDuration}
                isMobile={true}
              />
            </>
          )}
        </>
      )}

      {/* Top Bar - Desktop */}
      {!isMobile && (
        <>
          {/* Search Header - Fixed */}
          <div className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 py-4 px-6 z-50">
            <div className="max-w-7xl mx-auto">
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                isMobile={false}
              />
            </div>
          </div>

          {/* Spacer for fixed header */}
          <div className="h-[73px]" />

          {/* Filter Bar - Static positioned, compact */}
          {!isSearching && (
            <div className="bg-gray-800/95 border-b border-gray-700 py-2 px-6">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <ChannelFilter
                    channels={channels}
                    selectedChannelId={selectedChannelId}
                    onChannelChange={setSelectedChannelId}
                    loading={false}
                    isMobile={false}
                  />
                  <DurationFilter
                    selectedDuration={selectedDuration}
                    onDurationChange={setSelectedDuration}
                    isMobile={false}
                  />
                </div>
                <SortFilter
                  selectedSort={selectedSort}
                  onSortChange={setSelectedSort}
                  isMobile={false}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {loading && displayNaats.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-gray-700 border-t-accent-primary rounded-full animate-spin" />
            </div>
          ) : displayNaats.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                {isSearching
                  ? "No naats found matching your search."
                  : "No naats available yet. Check back soon!"}
              </p>
            </div>
          ) : (
            <>
              <NaatGrid
                naats={displayNaats}
                channelId={selectedChannelId}
                sortOption={selectedSort}
                searchQuery={searchQuery}
              />

              {/* Infinite scroll trigger - only in browse mode */}
              {!isSearching && (
                <div ref={loadMoreRef} className="py-8">
                  {browseLoading && (
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-gray-700 border-t-accent-primary rounded-full animate-spin" />
                    </div>
                  )}
                  {!hasMore && browseNaats.length > 0 && (
                    <p className="text-center text-gray-500">
                      No more naats to load
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
