"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { appwriteService } from "@/lib/appwrite";
import type { Naat } from "@naat-collection/shared";
import {
  formatDuration,
  formatRelativeTime,
  formatViews,
} from "@naat-collection/shared";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NaatCardProps {
  naat: Naat;
  onPlay?: (naatId: string) => void;
}

export function NaatCard({ naat, onPlay }: NaatCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const router = useRouter();
  const { actions } = useAudioPlayer();

  const handleClick = async () => {
    // Check user's playback preference
    const playbackMode = localStorage.getItem("playbackMode");

    if (playbackMode === "audio") {
      // User prefers audio-only mode, play directly
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
        });

        // Call onPlay callback if provided
        onPlay?.(naat.$id);
      } else {
        // Fallback to video mode if audio not available
        console.log("Audio not available, falling back to video mode");
        router.push(`/naats/${naat.$id}`);
      }
    } else {
      // Default to video page (first-time users or video preference)
      router.push(`/naats/${naat.$id}`);
    }
  };

  return (
    <div
      className="rounded-2xl bg-neutral-800 shadow-lg overflow-hidden cursor-pointer transition-opacity duration-150 hover:opacity-90"
      onClick={handleClick}
    >
      {/* Thumbnail Container with 16:9 aspect ratio */}
      <div className="relative aspect-video bg-neutral-700">
        {imageLoading && !imageError && (
          <div className="absolute inset-0 bg-neutral-700 animate-pulse" />
        )}

        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-700">
            <span className="text-5xl mb-2">🎵</span>
            <span className="text-sm text-neutral-400">No Thumbnail</span>
          </div>
        ) : (
          <Image
            src={naat.thumbnailUrl}
            alt={naat.title}
            fill
            className="object-cover"
            loading="lazy"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        )}

        {/* Duration Badge - bottom-right corner */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg">
          {formatDuration(naat.duration)}
        </div>

        {/* Play Icon Overlay - centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black/30 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="p-4">
        <h3 className="text-base font-bold text-white line-clamp-2 mb-2">
          {naat.title}
        </h3>

        <div className="flex items-center text-sm font-semibold text-neutral-300 mb-2">
          <span className="mr-1">👤</span>
          <span className="line-clamp-1">{naat.channelName}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <div className="flex items-center">
            <span className="mr-1">📅</span>
            <span>{formatRelativeTime(naat.uploadDate)}</span>
          </div>
          <div className="flex items-center">
            <span className="mr-1">👁️</span>
            <span>{formatViews(naat.views)} views</span>
          </div>
        </div>
      </div>
    </div>
  );
}
