import { setupPlayer } from "@/services/trackPlayerService";
import { useEffect, useState } from "react";
import { State, usePlaybackState } from "react-native-track-player";

export function useTrackPlayer() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const playbackState = usePlaybackState();

  useEffect(() => {
    let isMounted = true;

    async function setup() {
      try {
        const isSetup = await setupPlayer();
        if (isSetup && isMounted) {
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

  const isPlaying = playbackState.state === State.Playing;
  const isPaused = playbackState.state === State.Paused;
  const isBuffering = playbackState.state === State.Buffering;

  return {
    isPlayerReady,
    isPlaying,
    isPaused,
    isBuffering,
    playbackState: playbackState.state,
  };
}
