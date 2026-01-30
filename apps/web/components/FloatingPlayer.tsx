"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type PlayerSize = "minimized" | "compact" | "expanded";

export function FloatingPlayer() {
  const { state, actions } = useAudioPlayer();
  const [size, setSize] = useState<PlayerSize>("compact");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Initialize position (bottom-right corner)
  useEffect(() => {
    const handleInitPosition = () => {
      const savedPosition = localStorage.getItem("floatingPlayerPosition");
      if (savedPosition) {
        setPosition(JSON.parse(savedPosition));
      } else {
        // Default to bottom-right with some padding
        setPosition({
          x: window.innerWidth - 320 - 24,
          y: window.innerHeight - 120 - 24,
        });
      }
    };

    handleInitPosition();
  }, []);

  // Save position to localStorage
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem("floatingPlayerPosition", JSON.stringify(position));
    }
  }, [position]);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (size === "minimized") return;

      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    },
    [position, size],
  );

  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep within viewport bounds
      const maxX = window.innerWidth - (playerRef.current?.offsetWidth || 320);
      const maxY =
        window.innerHeight - (playerRef.current?.offsetHeight || 120);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Format time
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle switch to video - navigate to video page
  const handleSwitchToVideo = useCallback(() => {
    if (state.currentAudio?.youtubeId) {
      router.push(`/naats/${state.currentAudio.youtubeId}`);
    }
  }, [state.currentAudio?.youtubeId, router]);

  // Don't render if no audio
  if (!state.currentAudio) {
    return null;
  }

  // Calculate progress percentage
  const progressPercentage =
    state.duration > 0 ? (state.position / state.duration) * 100 : 0;

  // Minimized view (just a small icon)
  if (size === "minimized") {
    return (
      <div
        ref={playerRef}
        className="fixed z-50 w-16 h-16 rounded-full bg-neutral-800 shadow-2xl border border-neutral-700 cursor-pointer hover:scale-110 transition-transform"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onClick={() => setSize("compact")}
      >
        <div className="relative w-full h-full rounded-full overflow-hidden">
          <Image
            src={state.currentAudio.thumbnailUrl}
            alt={state.currentAudio.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {state.isPlaying ? (
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact view
  if (size === "compact") {
    return (
      <div
        ref={playerRef}
        className="fixed z-50 w-80 bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-700"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        {/* Progress bar at top */}
        <div className="h-1 bg-neutral-700 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-accent-primary transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Draggable header */}
        <div
          className="px-4 pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3">
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
              <Image
                src={state.currentAudio.thumbnailUrl}
                alt={state.currentAudio.title}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">
                {state.currentAudio.title}
              </h3>
              <p className="text-xs text-neutral-400 truncate">
                {state.currentAudio.channelName}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Time */}
            <span className="text-xs text-neutral-400 w-12">
              {formatTime(state.position)}
            </span>

            {/* Play/Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.togglePlayPause();
              }}
              className="w-10 h-10 rounded-full bg-white hover:bg-neutral-100 transition-colors flex items-center justify-center"
              aria-label={state.isPlaying ? "Pause" : "Play"}
            >
              {state.isPlaying ? (
                <svg
                  className="w-5 h-5 text-black"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-black ml-0.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Duration */}
            <span className="text-xs text-neutral-400 w-12 text-right">
              {formatTime(state.duration)}
            </span>

            {/* Expand button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSize("expanded");
              }}
              className="w-8 h-8 rounded-full hover:bg-neutral-700 transition-colors flex items-center justify-center"
              aria-label="Expand player"
            >
              <svg
                className="w-4 h-4 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>

            {/* Minimize button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSize("minimized");
              }}
              className="w-8 h-8 rounded-full hover:bg-neutral-700 transition-colors flex items-center justify-center"
              aria-label="Minimize player"
            >
              <svg
                className="w-4 h-4 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            </button>

            {/* Video button (if available) */}
            {state.currentAudio.youtubeId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwitchToVideo();
                }}
                className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center"
                aria-label="Switch to video mode"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
              </button>
            )}

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.stop();
              }}
              className="w-8 h-8 rounded-full hover:bg-neutral-700 transition-colors flex items-center justify-center"
              aria-label="Close player"
            >
              <svg
                className="w-4 h-4 text-neutral-400"
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
    );
  }

  // Expanded view
  return (
    <div
      ref={playerRef}
      className="fixed z-50 w-96 bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-700"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Header - draggable */}
      <div
        className="px-4 py-3 border-b border-neutral-700 flex items-center justify-between cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <span className="text-sm font-medium text-white">Now Playing</span>
        <div className="flex items-center gap-2">
          {/* Options menu button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsMenu(!showOptionsMenu);
              }}
              className="w-8 h-8 rounded-full hover:bg-neutral-700 transition-colors flex items-center justify-center"
              aria-label="Options menu"
            >
              <svg
                className="w-4 h-4 text-neutral-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {/* Options Menu Dropdown */}
            {showOptionsMenu && (
              <>
                {/* Overlay */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowOptionsMenu(false)}
                />

                {/* Menu */}
                <div className="absolute top-full right-0 mt-2 bg-neutral-700 rounded-lg shadow-lg z-50 min-w-[180px]">
                  {/* Repeat */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.toggleRepeat();
                      setShowOptionsMenu(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-600 w-full text-left hover:bg-neutral-600"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        color: state.isRepeatEnabled ? "#3b82f6" : "white",
                      }}
                    >
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                    </svg>
                    <span
                      className="text-sm"
                      style={{
                        color: state.isRepeatEnabled ? "#3b82f6" : "white",
                      }}
                    >
                      Repeat {state.isRepeatEnabled ? "(On)" : "(Off)"}
                    </span>
                  </button>

                  {/* Autoplay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.toggleAutoplay();
                      setShowOptionsMenu(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-neutral-600"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        color: state.isAutoplayEnabled ? "#3b82f6" : "white",
                      }}
                    >
                      <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                    </svg>
                    <span
                      className="text-sm"
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

          <button
            onClick={(e) => {
              e.stopPropagation();
              setSize("compact");
            }}
            className="w-8 h-8 rounded-full hover:bg-neutral-700 transition-colors flex items-center justify-center"
            aria-label="Collapse player"
          >
            <svg
              className="w-4 h-4 text-neutral-400"
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              actions.stop();
            }}
            className="w-8 h-8 rounded-full hover:bg-neutral-700 transition-colors flex items-center justify-center"
            aria-label="Close player"
          >
            <svg
              className="w-4 h-4 text-neutral-400"
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

      {/* Content */}
      <div className="p-6">
        {/* Album Art */}
        <div className="w-full aspect-square rounded-xl overflow-hidden mb-4">
          <Image
            src={state.currentAudio.thumbnailUrl}
            alt={state.currentAudio.title}
            width={320}
            height={320}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title and Artist */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white line-clamp-2 mb-1">
            {state.currentAudio.title}
          </h2>
          <p className="text-sm text-neutral-400">
            {state.currentAudio.channelName}
          </p>
        </div>

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
          <div className="flex justify-between mt-2">
            <span className="text-xs text-neutral-400">
              {formatTime(state.position)}
            </span>
            <span className="text-xs text-neutral-400">
              {formatTime(state.duration)}
            </span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-6">
          {/* Seek Backward */}
          <button
            onClick={() => actions.seek(Math.max(0, state.position - 10))}
            className="w-10 h-10 flex items-center justify-center hover:bg-neutral-700 rounded-full transition-colors"
            aria-label="Seek backward 10 seconds"
          >
            <svg
              className="w-6 h-6 text-white transform scale-x-[-1]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={actions.togglePlayPause}
            className="w-14 h-14 rounded-full bg-white hover:bg-neutral-100 transition-colors flex items-center justify-center"
            aria-label={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? (
              <svg
                className="w-6 h-6 text-black"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-black ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Seek Forward */}
          <button
            onClick={() =>
              actions.seek(Math.min(state.duration, state.position + 10))
            }
            className="w-10 h-10 flex items-center justify-center hover:bg-neutral-700 rounded-full transition-colors"
            aria-label="Seek forward 10 seconds"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          </button>

          {/* Video button (if available) */}
          {state.currentAudio.youtubeId && (
            <button
              onClick={handleSwitchToVideo}
              className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center"
              aria-label="Switch to video mode"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
