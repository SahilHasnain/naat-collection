"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FullPlayerModal } from "./FullPlayerModal";

export function MiniPlayer() {
  const { state, actions } = useAudioPlayer();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Don't render if no audio is loaded
  if (!state.currentAudio) {
    return null;
  }

  // Calculate progress percentage
  const progressPercentage =
    state.duration > 0 ? (state.position / state.duration) * 100 : 0;

  // Handle expand click
  const handleExpand = () => {
    setIsModalOpen(true);
  };

  // Handle switch to video - navigate to video page
  const handleSwitchToVideo = () => {
    if (state.currentAudio.youtubeId) {
      // Close modal first
      setIsModalOpen(false);
      // Use window.location for full page navigation to ensure it works
      window.location.href = `/naats/${state.currentAudio.youtubeId}`;
    }
  };

  // Handle close with animation
  const handleClose = () => {
    actions.stop();
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        {/* Progress bar at top edge */}
        <div className="h-0.5 bg-neutral-700 w-full">
          <div
            className="h-full bg-accent-primary transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Main player container - clickable to expand */}
        <div
          className="h-[72px] bg-neutral-800 border-t border-neutral-700 px-4 flex items-center gap-4 cursor-pointer hover:bg-neutral-700/50 transition-colors"
          onClick={handleExpand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleExpand();
            }
          }}
          aria-label="Expand player"
        >
          {/* Thumbnail */}
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
            <Image
              src={state.currentAudio.thumbnailUrl}
              alt={state.currentAudio.title}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {state.currentAudio.title}
            </h3>
            <p className="text-xs text-neutral-400 truncate">
              {state.currentAudio.channelName}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Play/Pause button */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent expand when clicking play/pause
                actions.togglePlayPause();
              }}
              className="w-10 h-10 rounded-full bg-neutral-700 hover:bg-neutral-600 transition-colors flex items-center justify-center"
              aria-label={state.isPlaying ? "Pause" : "Play"}
              aria-pressed={state.isPlaying}
            >
              {state.isPlaying ? (
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent expand when clicking close
                handleClose();
              }}
              className="w-10 h-10 rounded-full hover:bg-neutral-700 transition-colors flex items-center justify-center"
              aria-label="Close player"
            >
              <svg
                className="w-5 h-5 text-neutral-400 hover:text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Full Player Modal */}
      <FullPlayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSwitchToVideo={handleSwitchToVideo}
      />
    </>
  );
}
