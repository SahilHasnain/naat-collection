"use client";

import { useEffect, useState } from "react";

export type PlaybackMode = "video" | "audio";

export function usePlaybackPreference() {
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("video");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load preference from localStorage on mount
    const savedMode = localStorage.getItem(
      "playbackMode",
    ) as PlaybackMode | null;
    if (savedMode) {
      setPlaybackMode(savedMode);
    }
    setIsLoaded(true);
  }, []);

  const updatePlaybackMode = (mode: PlaybackMode) => {
    setPlaybackMode(mode);
    localStorage.setItem("playbackMode", mode);
  };

  return {
    playbackMode,
    isLoaded,
    updatePlaybackMode,
    isVideoMode: playbackMode === "video",
    isAudioMode: playbackMode === "audio",
  };
}
