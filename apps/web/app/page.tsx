"use client";

import { ChannelFilter } from "@/components/ChannelFilter";
import { NaatGrid } from "@/components/NaatGrid";
import { SearchBar } from "@/components/SearchBar";
import { SortFilter, type SortOption } from "@/components/SortFilter";
import { appwriteService } from "@/lib/appwrite";
import { getForYouFeed } from "@/lib/forYouAlgorithm";
import type { Channel, Naat } from "@naat-collection/shared";
import { useEffect, useState } from "react";

export default function Home() {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [selectedSort, setSelectedSort] = useState<SortOption>("forYou");
  const [loading, setLoading] = useState(true);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch channels on mount
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const channelsData = await appwriteService.getChannels();
        setChannels(channelsData);
      } catch (err) {
        console.error("Error fetching channels:", err);
      } finally {
        setChannelsLoading(false);
      }
    };
    fetchChannels();
  }, []);

  // Fetch naats when filters change
  useEffect(() => {
    const fetchNaats = async () => {
      setLoading(true);
      setError(null);

      try {
        let naatsData: Naat[];

        if (searchQuery.trim()) {
          // Search mode
          naatsData = await appwriteService.searchNaats(
            searchQuery,
            selectedChannelId,
          );
        } else if (selectedSort === "forYou") {
          // For You mode - fetch all naats and apply algorithm
          const allNaats = await appwriteService.getNaats(
            10000, // Fetch all naats (currently ~3000+)
            0,
            "latest",
            selectedChannelId,
          );
          naatsData = await getForYouFeed(allNaats, selectedChannelId);
        } else {
          // Browse mode with sort
          naatsData = await appwriteService.getNaats(
            20,
            0,
            selectedSort,
            selectedChannelId,
          );
        }

        setNaats(naatsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load naats");
        console.error("Error fetching naats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNaats();
  }, [searchQuery, selectedChannelId, selectedSort]);

  const isSearching = searchQuery.trim().length > 0;

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
                loading={channelsLoading}
                isMobile={true}
              />
              <SortFilter
                selectedSort={selectedSort}
                onSortChange={setSelectedSort}
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
                <ChannelFilter
                  channels={channels}
                  selectedChannelId={selectedChannelId}
                  onChannelChange={setSelectedChannelId}
                  loading={channelsLoading}
                  isMobile={false}
                />
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

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-gray-700 border-t-accent-primary rounded-full animate-spin" />
            </div>
          ) : naats.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                {isSearching
                  ? "No naats found matching your search."
                  : "No naats available yet. Check back soon!"}
              </p>
            </div>
          ) : (
            <NaatGrid
              naats={naats}
              channelId={selectedChannelId}
              sortOption={selectedSort}
              searchQuery={searchQuery}
            />
          )}
        </div>
      </div>
    </div>
  );
}
