import { usePlaybackMode } from "@/contexts/PlaybackModeContext";
import { updateNotificationCapabilities } from "@/services/trackPlayerService";
import TrackPlayer, { State } from "@weights-ai/react-native-track-player";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface LiveRadioContextType {
  isPlaying: boolean;
  currentNaat: { title: string }; // Static title, never null
  upcomingNaats: never[];
  listenerCount: number;
  isLoading: boolean;
  error: string | null;
  showMiniPlayer: boolean; // Controls mini player visibility
  play: () => Promise<void>;
  pause: (fromLivePage?: boolean) => Promise<void>;
  pauseFromMiniPlayer: () => Promise<void>; // Special pause that keeps mini player visible
  stop: () => Promise<void>;
  refresh: () => Promise<void>;
}

const LiveRadioContext = createContext<LiveRadioContextType | undefined>(
  undefined,
);

// Your Docker container URL - only used for stream URL
const LIVE_RADIO_STREAM_URL = "https://owaisrazaqadri.duckdns.org/live";

export const LiveRadioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { setMode, isNormalAudioActive } = usePlaybackMode();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);

  const isInitialized = useRef(false);
  const stopSource = useRef<"dismiss" | "mini-pause" | null>(null);

  // Static data - no metadata fetching
  const currentNaat = { title: "Naat Radio" };
  const upcomingNaats: never[] = [];
  const listenerCount = 0;

  // Initialize TrackPlayer
  useEffect(() => {
    const initializePlayer = async () => {
      if (isInitialized.current) return;

      try {
        await TrackPlayer.setupPlayer();
        isInitialized.current = true;
      } catch (error) {
        console.error("Error initializing TrackPlayer:", error);
      }
    };

    initializePlayer();
  }, []);

  // Refresh function - no-op since we don't fetch metadata
  const refresh = useCallback(async () => {
    // No metadata to refresh
  }, []);

  const stopInternal = useCallback(
    async (source: "dismiss" | "mini-pause") => {
      stopSource.current = source;

      await TrackPlayer.stop();
      await TrackPlayer.reset();
      await updateNotificationCapabilities(false);

      setIsPlaying(false);
      setIsLoading(false);
      setMode("none");
      setShowMiniPlayer(source === "mini-pause");
    },
    [setMode],
  );

  const stop = useCallback(async () => {
    try {
      await stopInternal("dismiss");
    } catch (error) {
      console.error("Error stopping naat radio:", error);
    }
  }, [stopInternal]);

  // Stop naat radio when normal audio becomes active
  useEffect(() => {
    if (isNormalAudioActive && (isPlaying || showMiniPlayer)) {
      console.log("[LiveRadio] Normal audio active, stopping naat radio");
      // Only update our state, don't change the mode or touch TrackPlayer
      // AudioContext is already in "normal" mode and will handle TrackPlayer
      setIsPlaying(false);
      setIsLoading(false);
      setShowMiniPlayer(false);
    }
  }, [isNormalAudioActive, isPlaying, showMiniPlayer]);

  const play = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);
      setShowMiniPlayer(true);

      // Switch mode first to avoid "normal" mode cleanup hiding live mini player.
      setMode("live");

      console.log("🎵 Starting naat radio...");

      await updateNotificationCapabilities(true);

      // Always rebuild the live stream track so replay reconnects to server.
      await TrackPlayer.reset();
      console.log("✅ TrackPlayer reset");

      const track = {
        id: "live-radio-icecast",
        url: LIVE_RADIO_STREAM_URL,
        title: "Naat Radio",
        artwork: require("@/assets/images/gumbad.png"),
      };

      console.log("🎵 Adding Icecast stream:", track.url);
      await TrackPlayer.add(track);
      console.log("✅ Track added");

      console.log("▶️ Starting playback...");
      await TrackPlayer.play();
      console.log("✅ Playback started");
    } catch (error) {
      console.error("❌ Error starting naat radio:", error);
      setError(`Failed to start naat radio: ${(error as Error).message}`);
      setIsLoading(false);
      setIsPlaying(false);
      setShowMiniPlayer(false);
      setMode("none");
      await updateNotificationCapabilities(false);
    }
  };

  const pause = async (fromLivePage = false) => {
    void fromLivePage;
    await stop();
  };

  const pauseFromMiniPlayer = async () => {
    try {
      await stopInternal("mini-pause");
    } catch (error) {
      console.error("Error stopping naat radio from mini player:", error);
    }
  };

  // Monitor TrackPlayer state changes
  useEffect(() => {
    const subscription = TrackPlayer.addEventListener(
      "playback-state" as any,
      async (state: any) => {
        console.log("🎵 TrackPlayer state changed:", state);

        const playbackState = state?.state ?? state;
        const isBuffering =
          playbackState === State.Buffering || playbackState === State.Loading;
        const isCurrentlyPlaying = playbackState === State.Playing;
        const isStopped =
          playbackState === State.Stopped || playbackState === State.None;

        // Check if the current track is our naat radio track
        try {
          const currentTrack = await TrackPlayer.getActiveTrack();
          const isNaatRadioTrack = currentTrack?.id === "live-radio-icecast";

          if (isNaatRadioTrack) {
            // Only update our state if it's our track
            setIsPlaying(isCurrentlyPlaying);
            setIsLoading(isBuffering);

            if (isCurrentlyPlaying || isBuffering) {
              setShowMiniPlayer(true);
              setMode("live");
            }

            if (isStopped) {
              const shouldKeepMiniVisible = stopSource.current === "mini-pause";
              setShowMiniPlayer(shouldKeepMiniVisible);
              setMode("none");
              stopSource.current = null;
            }
          } else if (currentTrack && currentTrack.id !== "live-radio-icecast") {
            // If a different track is playing, ensure our state shows not playing
            setIsPlaying(false);
            setIsLoading(false);
            setShowMiniPlayer(false);
            stopSource.current = null;
          }
        } catch (error) {
          console.error("Error checking current track:", error);
        }
      },
    );

    // Also listen for errors
    const errorSubscription = TrackPlayer.addEventListener(
      "playback-error" as any,
      (error: any) => {
        console.error("❌ TrackPlayer error:", error);
        setError(`Playback error: ${error.message || "Unknown error"}`);
        setIsLoading(false);
        setIsPlaying(false);
        setShowMiniPlayer(false);
        setMode("none");
        stopSource.current = null;
      },
    );

    return () => {
      subscription?.remove();
      errorSubscription?.remove();
    };
  }, [setMode]);

  const value: LiveRadioContextType = {
    isPlaying,
    currentNaat,
    upcomingNaats,
    listenerCount,
    isLoading,
    error,
    showMiniPlayer,
    play,
    pause,
    pauseFromMiniPlayer,
    stop,
    refresh,
  };

  return (
    <LiveRadioContext.Provider value={value}>
      {children}
    </LiveRadioContext.Provider>
  );
};

export const useLiveRadioPlayer = () => {
  const context = useContext(LiveRadioContext);
  if (context === undefined) {
    throw new Error(
      "useLiveRadioPlayer must be used within a LiveRadioProvider",
    );
  }
  return context;
};
