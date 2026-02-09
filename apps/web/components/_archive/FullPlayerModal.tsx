"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface FullPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToVideo?: () => void;
}

export function FullPlayerModal({
  isOpen,
  onClose,
  onSwitchToVideo,
}: FullPlayerModalProps) {
  const { state, actions } = useAudioPlayer();
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Seek backward 10 seconds
  const seekBackward = useCallback(() => {
    actions.seekRelative(-10);
  }, [actions]);

  // Seek forward 10 seconds
  const seekForward = useCallback(() => {
    actions.seekRelative(10);
  }, [actions]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const handledKeys = [" ", "ArrowLeft", "ArrowRight", "Escape"];
      if (handledKeys.includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case " ":
          actions.togglePlayPause();
          setAnnouncement(state.isPlaying ? "Paused" : "Playing");
          break;
        case "ArrowLeft":
          seekBackward();
          break;
        case "ArrowRight":
          seekForward();
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, state.isPlaying, actions, seekBackward, seekForward, onClose]);

  // Don't render if no audio is loaded or not open
  if (!state.currentAudio || !isOpen) {
    return null;
  }

  // Format time in MM:SS format
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-title"
    >
      {/* Screen reader announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="h-10 w-10 flex items-center justify-center"
          aria-label="Close player"
        >
          <svg
            className="w-7 h-7 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <span className="text-sm text-neutral-400">Now Playing</span>

        <button
          onClick={() => setShowOptionsMenu(!showOptionsMenu)}
          className="h-10 w-10 flex items-center justify-center relative"
          aria-label="Options menu"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>

        {/* Options Menu */}
        {showOptionsMenu && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowOptionsMenu(false)}
            />

            {/* Menu */}
            <div className="absolute top-16 right-5 bg-neutral-800 rounded-lg shadow-lg z-50 min-w-[200px]">
              {/* Switch to Video */}
              {state.currentAudio.youtubeId && onSwitchToVideo && (
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    onSwitchToVideo();
                  }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-neutral-700 w-full text-left hover:bg-neutral-700"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                  </svg>
                  <span className="text-white text-base">Switch to Video</span>
                </button>
              )}

              {/* Repeat */}
              <button
                onClick={() => {
                  actions.toggleRepeat();
                  setShowOptionsMenu(false);
                }}
                className="flex items-center gap-3 px-4 py-3 border-b border-neutral-700 w-full text-left hover:bg-neutral-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  style={{
                    color: state.isRepeatEnabled ? "#3b82f6" : "white",
                  }}
                >
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>
                <span
                  className="text-base"
                  style={{
                    color: state.isRepeatEnabled ? "#3b82f6" : "white",
                  }}
                >
                  Repeat {state.isRepeatEnabled ? "(On)" : "(Off)"}
                </span>
              </button>

              {/* Autoplay */}
              <button
                onClick={() => {
                  actions.toggleAutoplay();
                  setShowOptionsMenu(false);
                }}
                className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-neutral-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  style={{
                    color: state.isAutoplayEnabled ? "#3b82f6" : "white",
                  }}
                >
                  <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                </svg>
                <span
                  className="text-base"
                  style={{
                    color: state.isAutoplayEnabled ? "#3b82f6" : "white",
                  }}
                >
                  Autoplay {state.isAutoplayEnabled ? "(On)" : "(Off)"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      {state.isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-accent-primary rounded-full animate-spin" />
          <p className="mt-4 text-white">Loading audio...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Album Art Section */}
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="w-80 h-80 rounded-2xl overflow-hidden shadow-lg">
              <Image
                src={state.currentAudio.thumbnailUrl}
                alt={state.currentAudio.title}
                width={320}
                height={320}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            {/* Title and Channel */}
            <div className="mt-8 w-full max-w-md">
              <h2
                id="player-title"
                className="text-center text-2xl font-bold text-white line-clamp-2"
              >
                {state.currentAudio.title}
              </h2>
              <p className="mt-2 text-center text-base text-neutral-400">
                {state.currentAudio.channelName}
              </p>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="px-6 pb-8">
            {/* Seek Bar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={state.duration || 100}
                value={state.position}
                onChange={(e) => actions.seek(parseFloat(e.target.value))}
                style={{
                  // @ts-ignore - CSS custom property
                  "--progress": `${state.duration > 0 ? (state.position / state.duration) * 100 : 0}%`,
                }}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
                aria-label="Seek position"
              />

              {/* Time Labels */}
              <div className="flex justify-between mt-2">
                <span className="text-sm text-neutral-400">
                  {formatTime(state.position)}
                </span>
                <span className="text-sm text-neutral-400">
                  {formatTime(state.duration)}
                </span>
              </div>
            </div>

            {/* Main Playback Controls */}
            <div className="flex items-center justify-center gap-8">
              {/* Seek Backward 10s */}
              <button
                onClick={seekBackward}
                className="h-14 w-14 flex items-center justify-center relative"
                aria-label="Seek backward 10 seconds"
              >
                <svg
                  className="w-10 h-10 text-white transform scale-x-[-1]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                </svg>
                <span className="absolute text-xs font-bold text-white">
                  10
                </span>
              </button>

              {/* Play/Pause Button */}
              <button
                onClick={actions.togglePlayPause}
                className="h-20 w-20 flex items-center justify-center rounded-full bg-white"
                aria-label={state.isPlaying ? "Pause" : "Play"}
              >
                {state.isPlaying ? (
                  <svg
                    className="w-10 h-10 text-black"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg
                    className="w-10 h-10 text-black ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Seek Forward 10s */}
              <button
                onClick={seekForward}
                className="h-14 w-14 flex items-center justify-center relative"
                aria-label="Seek forward 10 seconds"
              >
                <svg
                  className="w-10 h-10 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                </svg>
                <span className="absolute text-xs font-bold text-white">
                  10
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
