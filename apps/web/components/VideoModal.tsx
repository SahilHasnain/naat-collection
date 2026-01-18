"use client";

import { useEffect, useRef, useState } from "react";
import YouTube, { YouTubePlayer } from "react-youtube";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
  channelName?: string;
  onSwitchToAudio?: () => void;
}

export function VideoModal({
  isOpen,
  onClose,
  videoUrl,
  title,
  channelName,
  onSwitchToAudio,
}: VideoModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string): string => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : "";
  };

  const videoId = getYouTubeId(videoUrl);

  // Format time in MM:SS format
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setPosition(0);
      setDuration(0);
      setIsPlaying(false);
    }
  }, [isOpen]);

  // Update position periodically
  useEffect(() => {
    if (!isOpen || !isPlaying || !playerRef.current) return;

    intervalRef.current = setInterval(async () => {
      if (playerRef.current) {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          setPosition(currentTime);
        } catch {
          // Ignore errors
        }
      }
    }, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, isPlaying]);

  // Handle player ready
  const onReady = (event: { target: YouTubePlayer }) => {
    playerRef.current = event.target;
    setIsLoading(false);

    // Get duration
    event.target.getDuration().then((dur: number) => {
      setDuration(dur);
    });
  };

  // Handle state change
  const onStateChange = (event: { data: number }) => {
    // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    if (event.data === 1) {
      setIsPlaying(true);
    } else if (event.data === 2) {
      setIsPlaying(false);
    } else if (event.data === 0) {
      // Video ended
      setIsPlaying(false);
      if (isRepeatEnabled && playerRef.current) {
        // Restart video
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
      }
    }
  };

  // Seek to position
  const seekToPosition = (seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      setPosition(seconds);
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  // Handle overlay click to close
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-title"
    >
      {/* Header */}
      <div className="bg-neutral-800 border-b border-neutral-700 px-6 py-4 flex items-center justify-between">
        <div className="flex-1 mr-4">
          {title && (
            <h2
              id="video-title"
              className="text-base font-bold text-white leading-tight line-clamp-2"
            >
              {title}
            </h2>
          )}
          <p className="text-sm text-neutral-400 mt-1">
            {channelName || "Baghdadi Sound & Video"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full hover:bg-neutral-700 transition-colors flex items-center justify-center"
          aria-label="Close video"
        >
          <svg
            className="w-6 h-6 text-neutral-400 hover:text-white"
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

      {/* Video Player */}
      <div className="flex-1 bg-black flex items-center justify-center relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-gray-700 border-t-accent-primary rounded-full animate-spin" />
            <p className="mt-3 text-sm text-neutral-400 absolute top-1/2 mt-16">
              Loading video...
            </p>
          </div>
        )}

        <div className="w-full h-full flex items-center justify-center">
          <YouTube
            videoId={videoId}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 0,
                controls: 1,
                modestbranding: 1,
                rel: 0,
              },
            }}
            onReady={onReady}
            onStateChange={onStateChange}
            onError={() => {
              setIsLoading(false);
              alert(
                "Unable to load video. Please check your internet connection.",
              );
            }}
            className="w-full h-full"
            iframeClassName="w-full h-full"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black px-6 pb-6">
        {/* Progress Bar */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={duration}
            value={position}
            onChange={(e) => seekToPosition(parseFloat(e.target.value))}
            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
            aria-label="Seek position"
          />

          {/* Time Labels */}
          <div className="flex justify-between mt-2">
            <span className="text-sm text-neutral-400">
              {formatTime(position)}
            </span>
            <span className="text-sm text-neutral-400">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Repeat Button */}
        <div className="mb-4 flex items-center justify-center">
          <button
            onClick={() => setIsRepeatEnabled(!isRepeatEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
              isRepeatEnabled
                ? "bg-accent-primary text-white"
                : "bg-neutral-800 text-white hover:bg-neutral-700"
            }`}
            aria-label={isRepeatEnabled ? "Repeat enabled" : "Repeat disabled"}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            <span className="text-sm font-medium">Repeat</span>
          </button>
        </div>

        {/* Play as Audio Button */}
        {onSwitchToAudio && (
          <button
            onClick={onSwitchToAudio}
            className="w-full flex items-center justify-center gap-3 bg-accent-primary hover:bg-accent-primary/90 text-white font-bold py-4 px-6 rounded-2xl transition-colors"
            aria-label="Switch to audio mode"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span>Play as Audio Only</span>
          </button>
        )}
      </div>
    </div>
  );
}
