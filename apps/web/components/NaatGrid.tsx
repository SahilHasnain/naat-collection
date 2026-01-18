"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { appwriteService } from "@/lib/appwrite";
import type { Naat } from "@naat-collection/shared";
import { useEffect, useRef, useState } from "react";
import { NaatCard } from "./NaatCard";

interface NaatGridProps {
  naats: Naat[];
  channelId?: string | null;
  sortOption?: "forYou" | "latest" | "popular" | "oldest";
  searchQuery?: string;
}

export function NaatGrid({
  naats: initialNaats,
  channelId,
  sortOption = "latest",
  searchQuery,
}: NaatGridProps) {
  const [naats, setNaats] = useState<Naat[]>(initialNaats);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { actions } = useAudioPlayer();

  // Reset naats when filters change
  useEffect(() => {
    setNaats(initialNaats);
    setHasMore(initialNaats.length === 20); // Assume more if we got a full batch
  }, [initialNaats, channelId, sortOption, searchQuery]);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const sortBy = sortOption === "forYou" ? "latest" : sortOption;
      const response = await fetch(
        `/api/naats?limit=20&offset=${naats.length}&sortBy=${sortBy}${
          channelId ? `&channelId=${channelId}` : ""
        }${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch naats");
      }

      const newNaats: Naat[] = await response.json();

      if (newNaats.length === 0) {
        setHasMore(false);
      } else {
        setNaats((prev) => [...prev, ...newNaats]);
        setHasMore(newNaats.length === 20);
      }
    } catch (error) {
      console.error("Error loading more naats:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        rootMargin: "500px", // Trigger 500px before reaching the bottom
      },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, naats.length, channelId, sortOption, searchQuery]);

  const handlePlay = async (naatId: string) => {
    const naat = naats.find((n) => n.$id === naatId);
    if (!naat) return;

    try {
      // Fetch audio URL from storage
      const response = await appwriteService.getAudioUrl(naat.audioId);

      if (response.success && response.audioUrl) {
        await actions.loadAndPlay({
          audioUrl: response.audioUrl,
          title: naat.title,
          channelName: naat.channelName,
          thumbnailUrl: naat.thumbnailUrl,
          audioId: naat.audioId,
          youtubeId: naat.youtubeId,
          isLocalFile: !!naat.audioId,
        });
      } else {
        console.error("Audio not available:", response.error);
      }
    } catch (error) {
      console.error("Failed to play naat:", error);
      // TODO: Show error toast to user
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-200 ease-out">
        {naats.map((naat) => (
          <NaatCard key={naat.$id} naat={naat} onPlay={handlePlay} />
        ))}
      </div>

      {/* Intersection Observer Target */}
      <div ref={observerTarget} className="h-10" />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-accent-primary rounded-full animate-spin" />
        </div>
      )}

      {/* End of Results Message */}
      {!hasMore && naats.length > 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No more naats to load
        </div>
      )}
    </>
  );
}
