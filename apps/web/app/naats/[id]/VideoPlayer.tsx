"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { usePlaybackPreference } from "@/hooks/usePlaybackPreference";
import { appwriteService } from "@/lib/appwrite";
import type { Naat } from "@naat-collection/shared";
import { useRouter } from "next/navigation";

interface VideoPlayerProps {
  naat: Naat;
}

export function VideoPlayer({ naat }: VideoPlayerProps) {
  const router = useRouter();
  const { actions } = useAudioPlayer();
  const { playbackMode, updatePlaybackMode, isLoaded } =
    usePlaybackPreference();

  // Don't auto-redirect when user explicitly navigates to video page
  // Only respect audio preference when clicking from cards, not when switching from audio player

  const handlePlayAsAudio = async () => {
    // Save preference
    updatePlaybackMode("audio");

    // Fetch audio URL from storage
    const response = await appwriteService.getAudioUrl(naat.audioId);

    if (response.success && response.audioUrl) {
      // Load audio in the audio player
      await actions.loadAndPlay({
        audioUrl: response.audioUrl,
        title: naat.title,
        channelName: naat.channelName,
        thumbnailUrl: naat.thumbnailUrl,
        audioId: naat.audioId,
        youtubeId: naat.youtubeId,
      });

      // Navigate back to home page
      router.push("/");
    } else {
      console.error("Audio not available:", response.error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Header with back button */}
      <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full hover:bg-neutral-700 transition-colors flex items-center justify-center"
          aria-label="Go back"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-white line-clamp-1 flex-1">
          {naat.title}
        </h1>
      </div>

      {/* Video Player Container */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Video Player */}
        <div className="bg-black rounded-xl overflow-hidden shadow-2xl mb-6">
          {/* Mobile/Tablet: 16:9, Desktop: 21:9 (ultrawide) for less height */}
          <div className="relative aspect-video lg:aspect-[21/9]">
            {/* YouTube iframe embed */}
            <iframe
              src={`https://www.youtube.com/embed/${naat.youtubeId}?autoplay=1&rel=0`}
              title={naat.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>

        {/* Play as Audio Button */}
        <div className="mb-6">
          <button
            onClick={handlePlayAsAudio}
            className="w-full sm:w-auto px-6 py-3 bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z" />
            </svg>
            Play as Audio Only
          </button>
        </div>
      </div>
    </div>
  );
}
