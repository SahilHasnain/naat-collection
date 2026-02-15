/**
 * Playback Mode Context
 *
 * Manages mutual exclusion between normal audio and live radio playback
 * Ensures only one mode is active at a time
 */

import React, { createContext, useCallback, useContext, useState } from "react";

type PlaybackMode = "normal" | "live" | "none";

interface PlaybackModeContextType {
  mode: PlaybackMode;
  setMode: (mode: PlaybackMode) => void;
  isNormalAudioActive: boolean;
  isLiveRadioActive: boolean;
}

const PlaybackModeContext = createContext<PlaybackModeContextType | undefined>(
  undefined,
);

export const PlaybackModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setModeState] = useState<PlaybackMode>("none");

  const setMode = useCallback(
    (newMode: PlaybackMode) => {
      console.log("[PlaybackMode] Switching from", mode, "to", newMode);
      setModeState(newMode);
    },
    [mode],
  );

  const value: PlaybackModeContextType = {
    mode,
    setMode,
    isNormalAudioActive: mode === "normal",
    isLiveRadioActive: mode === "live",
  };

  return (
    <PlaybackModeContext.Provider value={value}>
      {children}
    </PlaybackModeContext.Provider>
  );
};

export const usePlaybackMode = () => {
  const context = useContext(PlaybackModeContext);
  if (context === undefined) {
    throw new Error("usePlaybackMode must be used within PlaybackModeProvider");
  }
  return context;
};
