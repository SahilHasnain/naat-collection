import {
  playbackService,
  setupPlayer,
  updateOptions,
} from "@/services/trackPlayerService";
import { useEffect, useState } from "react";

// Dynamic import to avoid build-time errors
let TrackPlayer: any = null;
let State: any = null;
let usePlaybackState: any = null;

try {
  const trackPlayerModule = require("react-native-track-player");
  TrackPlayer = trackPlayerModule.default;
  State = trackPlayerModule.State;
  usePlaybackState = trackPlayerModule.usePlaybackState;
} catch (error) {
  console.log("[TrackPlayer] Module not available yet");
}

let isServiceRegistered = false;

export function useTrackPlayer() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const playbackState = usePlaybackState ? usePlaybackState() : { state: null };

  useEffect(() => {
    if (!State || !TrackPlayer) {
      console.log("[TrackPlayer] Not available, skipping setup");
      return;
    }

    let isMounted = true;

    async function setup() {
      try {
        // Register playback service once
        if (!isServiceRegistered) {
          TrackPlayer.registerPlaybackService(() => playbackService);
          isServiceRegistered = true;
          console.log("[TrackPlayer] Playback service registered");
        }

        const isSetup = await setupPlayer();
        if (isSetup && isMounted) {
          await updateOptions();
          setIsPlayerReady(true);
          console.log("[TrackPlayer] Player initialized successfully");
        }
      } catch (error) {
        console.error("[TrackPlayer] Error setting up player:", error);
      }
    }

    setup();

    return () => {
      isMounted = false;
    };
  }, []);

  const isPlaying = State && playbackState.state === State.Playing;
  const isPaused = State && playbackState.state === State.Paused;
  const isBuffering = State && playbackState.state === State.Buffering;

  return {
    isPlayerReady,
    isPlaying,
    isPaused,
    isBuffering,
    playbackState: playbackState.state,
  };
}
