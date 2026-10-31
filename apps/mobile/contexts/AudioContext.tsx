import { usePlaybackMode } from "@/contexts/PlaybackModeContext";
import {
  setupPlayer,
  updateNotificationCapabilities,
} from "@/services/trackPlayerService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TrackPlayer, {
  Event,
  RepeatMode,
  State,
  useProgress,
  useTrackPlayerEvents,
} from "@weights-ai/react-native-track-player";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface AudioMetadata {
  audioUrl: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  isLocalFile: boolean;
  audioId?: string;
  voiceSourceAudioId?: string;
  youtubeId?: string;
  naatId?: string; // Naat document ID for deep linking
  views?: number;
}

/**
 * Result of a queue mutation. Callers turn this into user feedback so the
 * behaviour is identical from every entry point (card menu, history, sheet).
 */
export type QueueAction =
  | "started" // nothing was playing, so the track started immediately
  | "queued" // appended / inserted into the upcoming list
  | "moved" // was already queued and got promoted to play next
  | "already-current" // the track is the one playing right now
  | "already-queued" // the track is already in the upcoming list
  | "full" // the upcoming list hit MAX_QUEUE
  | "failed"; // RNTP rejected the mutation

/** Stable identity for a track across the app and the RNTP queue. */
export function getAudioKey(audio: AudioMetadata): string {
  return audio.naatId || audio.audioId || audio.audioUrl;
}

const MAX_QUEUE = 50;

function toTrack(audio: AudioMetadata) {
  return {
    id: getAudioKey(audio),
    url: audio.audioUrl,
    title: audio.title,
    artist: audio.channelName,
    artwork: audio.thumbnailUrl,
    naatId: audio.naatId,
    audioId: audio.audioId,
  };
}

interface AudioContextType {
  // State
  currentAudio: AudioMetadata | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  volume: number;
  error: Error | null;
  isRepeatEnabled: boolean;
  isAutoplayEnabled: boolean;
  abRepeatPointA: number | null;
  abRepeatPointB: number | null;
  isABRepeatActive: boolean;
  /** Upcoming tracks, in play order. Excludes the currently playing track. */
  queue: AudioMetadata[];

  // Actions
  loadAndPlay: (audio: AudioMetadata) => Promise<void>;
  /** Insert at the front of the queue (right after the current track). */
  playNext: (audio: AudioMetadata) => Promise<QueueAction>;
  /** Append to the end of the queue. */
  addToQueue: (audio: AudioMetadata) => Promise<QueueAction>;
  removeFromQueue: (key: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  /** Jump straight to an upcoming track. */
  playFromQueue: (key: string) => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (positionMillis: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  stop: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  toggleRepeat: () => Promise<void>;
  toggleAutoplay: () => Promise<void>;
  setAutoplayCallback: (callback: (() => Promise<void>) | null) => void;
  setTrackCompleteCallback: (
    callback: ((naatId: string | undefined) => void) | null,
  ) => void;
  setABRepeatPointA: (position: number | null) => void;
  setABRepeatPointB: (position: number | null) => void;
  clearABRepeat: () => void;
  toggleABRepeat: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const REPEAT_KEY = "@audio_repeat_enabled";
const AUTOPLAY_KEY = "@audio_autoplay_enabled";

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { mode, setMode, isNormalAudioActive, isLiveRadioActive } =
    usePlaybackMode();
  const [currentAudio, setCurrentAudio] = useState<AudioMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1.0);
  const [error, setError] = useState<Error | null>(null);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);
  const [abRepeatPointA, setAbRepeatPointA] = useState<number | null>(null);
  const [abRepeatPointB, setAbRepeatPointB] = useState<number | null>(null);
  const [isABRepeatActive, setIsABRepeatActive] = useState(false);
  const [queue, setQueue] = useState<AudioMetadata[]>([]);

  // Debug: Log when currentAudio changes
  useEffect(() => {
    console.log(
      "[AudioContext] currentAudio changed:",
      currentAudio?.title || "null",
    );
  }, [currentAudio]);

  const autoplayCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const trackCompleteCallbackRef = useRef<
    ((naatId: string | undefined) => void) | null
  >(null);
  const isRepeatEnabledRef = useRef(false);
  const isAutoplayEnabledRef = useRef(false);
  const isSetupRef = useRef(false);
  const abRepeatPointARef = useRef<number | null>(null);
  const abRepeatPointBRef = useRef<number | null>(null);
  const isABRepeatActiveRef = useRef(false);
  const currentAudioRef = useRef<AudioMetadata | null>(null);
  // Metadata lives in a ref because RNTP owns the real queue: the native queue
  // only stores track fields, so this map rehydrates AudioMetadata on advance.
  const metadataRef = useRef<Map<string, AudioMetadata>>(new Map());
  const queueRef = useRef<AudioMetadata[]>([]);
  const completedTrackRef = useRef<string | null>(null);

  const notifyTrackComplete = useCallback((audio: AudioMetadata | null) => {
    if (!audio) return;
    const key = getAudioKey(audio);
    if (completedTrackRef.current === key) return;
    completedTrackRef.current = key;
    trackCompleteCallbackRef.current?.(audio.naatId);
  }, []);

  // Sync refs with state
  useEffect(() => {
    currentAudioRef.current = currentAudio;
  }, [currentAudio]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    isRepeatEnabledRef.current = isRepeatEnabled;
  }, [isRepeatEnabled]);

  useEffect(() => {
    isAutoplayEnabledRef.current = isAutoplayEnabled;
  }, [isAutoplayEnabled]);

  useEffect(() => {
    abRepeatPointARef.current = abRepeatPointA;
  }, [abRepeatPointA]);

  useEffect(() => {
    abRepeatPointBRef.current = abRepeatPointB;
  }, [abRepeatPointB]);

  useEffect(() => {
    isABRepeatActiveRef.current = isABRepeatActive;
  }, [isABRepeatActive]);

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [repeatValue, autoplayValue] = await Promise.all([
          AsyncStorage.getItem(REPEAT_KEY),
          AsyncStorage.getItem(AUTOPLAY_KEY),
        ]);

        if (repeatValue !== null) {
          setIsRepeatEnabled(repeatValue === "true");
        }
        if (autoplayValue !== null) {
          setIsAutoplayEnabled(autoplayValue === "true");
        }
      } catch (err) {
        console.error("[AudioContext] Error loading preferences:", err);
      }
    };

    loadPreferences();
  }, []);

  // Setup Track Player on mount
  useEffect(() => {
    const initPlayer = async () => {
      if (isSetupRef.current) return;

      try {
        await setupPlayer();
        isSetupRef.current = true;
        console.log("[AudioContext] Track Player initialized");
      } catch (err) {
        console.error("[AudioContext] Error initializing Track Player:", err);
      }
    };

    initPlayer();
  }, []);

  // Note: Live radio stopping is handled by LiveRadioContext when isNormalAudioActive changes
  // No need to stop normal audio here when live radio becomes active

  // Reset loading state when live radio becomes active (in case loading was interrupted)
  useEffect(() => {
    if (isLiveRadioActive && isLoading) {
      console.log("[AudioContext] Live radio active, resetting loading state");
      setIsLoading(false);
    }
  }, [isLiveRadioActive, isLoading]);

  // Use Track Player hooks for progress
  const { position: trackPosition, duration: trackDuration } = useProgress();

  useEffect(() => {
    const newPosition = Math.floor(trackPosition * 1000);
    setPosition(newPosition);
    setDuration(Math.floor(trackDuration * 1000));

    // A/B repeat logic - check if we've passed point B
    if (
      isABRepeatActiveRef.current &&
      abRepeatPointARef.current !== null &&
      abRepeatPointBRef.current !== null &&
      newPosition >= abRepeatPointBRef.current
    ) {
      console.log("[AudioContext] A/B repeat: looping back to point A");
      TrackPlayer.seekTo(abRepeatPointARef.current / 1000);
    }
  }, [trackPosition, trackDuration]);

  // Queue helpers. RNTP owns the real queue; we mirror the upcoming portion
  // into React state so the UI can render it.
  const syncQueue = useCallback(async (): Promise<AudioMetadata[]> => {
    try {
      const [tracks, activeIndex] = await Promise.all([
        TrackPlayer.getQueue(),
        TrackPlayer.getActiveTrackIndex(),
      ]);
      const start = (activeIndex ?? -1) + 1;
      const upcoming = tracks
        .slice(start)
        .map((track) => metadataRef.current.get(String(track.id)))
        .filter((audio): audio is AudioMetadata => Boolean(audio));
      setQueue(upcoming);
      queueRef.current = upcoming;
      return upcoming;
    } catch (err) {
      console.error("[AudioContext] Error syncing queue:", err);
      return [];
    }
  }, []);

  // Track repeat loops one track; once a queue exists we switch to queue repeat
  // so the upcoming tracks can actually advance. Restored when it empties.
  const applyRepeatMode = useCallback(async (hasUpcoming: boolean) => {
    try {
      await TrackPlayer.setRepeatMode(
        isRepeatEnabledRef.current
          ? hasUpcoming
            ? RepeatMode.Queue
            : RepeatMode.Track
          : RepeatMode.Off,
      );
    } catch (err) {
      console.error("[AudioContext] Error applying repeat mode:", err);
    }
  }, []);

  const refreshQueue = useCallback(async () => {
    const upcoming = await syncQueue();
    await applyRepeatMode(upcoming.length > 0);
    return upcoming;
  }, [syncQueue, applyRepeatMode]);

  // Listen to playback state changes - only when normal audio is active
  useTrackPlayerEvents([Event.PlaybackState], async (event) => {
    if (!isNormalAudioActive) return;

    if (event.type === Event.PlaybackState) {
      const state = event.state;
      console.log("[AudioContext] Playback state changed:", state);
      setIsPlaying(state === State.Playing);
      setIsLoading(state === State.Buffering || state === State.Loading);

      // Don't clear currentAudio when stopped/paused - keep miniplayer visible
      // Only clear via explicit stop() call (close button)
    }
  });

  // RNTP auto-advances through the queue natively. Mirror the new active track
  // into React state so the mini player, full player and analytics stay in sync.
  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], (event) => {
    if (!isNormalAudioActive) return;

    const trackId = event.track?.id != null ? String(event.track.id) : null;
    if (!trackId) return;

    const audio = metadataRef.current.get(trackId);
    if (audio) {
      const previousKey = currentAudioRef.current
        ? getAudioKey(currentAudioRef.current)
        : null;
      if (previousKey !== trackId) {
        // New track: stale A/B markers would be meaningless.
        setAbRepeatPointA(null);
        setAbRepeatPointB(null);
        setIsABRepeatActive(false);
        currentAudioRef.current = audio;
        setCurrentAudio(audio);
      }
    }

    const previousTrackId =
      event.lastTrack?.id != null ? String(event.lastTrack.id) : null;
    if (previousTrackId) {
      notifyTrackComplete(metadataRef.current.get(previousTrackId) ?? null);
    }

    void refreshQueue();
  });

  // Listen to track end events - only when normal audio is active
  // Note: When repeat is ON, RepeatMode.Queue/Track handles looping natively
  // so PlaybackQueueEnded only fires when repeat is OFF.
  useTrackPlayerEvents([Event.PlaybackQueueEnded], async () => {
    if (!isNormalAudioActive) {
      console.log(
        "[AudioContext] Track finished but normal audio not active, ignoring",
      );
      return;
    }

    console.log("[AudioContext] Track finished");
    setIsPlaying(false);
    setQueue([]);
    queueRef.current = [];

    // Notify completion listeners when the final track has no active-track
    // transition event to report.
    notifyTrackComplete(currentAudioRef.current);

    const autoplayEnabled = isAutoplayEnabledRef.current;

    console.log("[AudioContext] Autoplay enabled:", autoplayEnabled);

    if (autoplayEnabled && autoplayCallbackRef.current) {
      console.log("[AudioContext] Autoplay triggered");
      autoplayCallbackRef.current();
    } else {
      // Don't call TrackPlayer.seekTo(0) here — it can restart playback
      setPosition(0);
    }
  });

  // Track the latest load request so a rapid re-tap supersedes an in-flight
  // load instead of being silently dropped (replace-not-drop).
  const loadVersionRef = useRef(0);

  // Load and play audio
  const loadAndPlay = useCallback(
    async (audio: AudioMetadata) => {
      // Every request bumps the version; stale async steps check it and bail
      const version = ++loadVersionRef.current;

      try {
        setIsLoading(true);
        setError(null);

        console.log("[AudioContext] Loading audio:", audio.title);

        // Clear A/B repeat points when loading new track
        setAbRepeatPointA(null);
        setAbRepeatPointB(null);
        setIsABRepeatActive(false);

        // Switch to normal audio mode
        setMode("normal");

        // Reset queue and add new track. No fixed sleep needed: LiveRadio
        // stops itself via its own effect when normal mode becomes active,
        // and reset() below takes over the shared TrackPlayer instance.
        // An explicit play is a fresh start: the old queue is discarded.
        await TrackPlayer.reset();
        if (version !== loadVersionRef.current) return; // superseded

        metadataRef.current.clear();
        completedTrackRef.current = null;
        setQueue([]);
        queueRef.current = [];

        console.log("[AudioContext] Playback source URL:", audio.audioUrl);
        const track = toTrack(audio);
        metadataRef.current.set(String(track.id), audio);
        await TrackPlayer.add(track);
        if (version !== loadVersionRef.current) return; // superseded

        // Update notification capabilities for normal mode (with seek) AFTER adding track
        await updateNotificationCapabilities(false);

        // Set volume and repeat mode
        await TrackPlayer.setVolume(volume);
        await applyRepeatMode(false);

        // Set currentAudio before playing so miniplayer appears immediately
        currentAudioRef.current = audio;
        setCurrentAudio(audio);

        // Play
        await TrackPlayer.play();

        setIsLoading(false);
        setIsPlaying(true);

        console.log("[AudioContext] Audio loaded and playing");
      } catch (err) {
        // Ignore errors from superseded loads
        if (version !== loadVersionRef.current) return;
        console.error("[AudioContext] Error loading audio:", err);
        setError(err as Error);
        setIsLoading(false);
        currentAudioRef.current = null;
        setCurrentAudio(null);
        metadataRef.current.clear();
        setQueue([]);
        queueRef.current = [];
      }
    },
    [volume, setMode, applyRepeatMode],
  );

  const hasActiveTrack = useCallback(async (): Promise<boolean> => {
    if (!currentAudioRef.current || isLiveRadioActive) return false;
    try {
      const [tracks, activeIndex] = await Promise.all([
        TrackPlayer.getQueue(),
        TrackPlayer.getActiveTrackIndex(),
      ]);
      return tracks.length > 0 && activeIndex !== undefined;
    } catch {
      return false;
    }
  }, [isLiveRadioActive]);

  /**
   * Insert right after the current track. If nothing is playing this becomes a
   * normal play so the action always has a visible result.
   */
  const playNext = useCallback(
    async (audio: AudioMetadata): Promise<QueueAction> => {
      if (!(await hasActiveTrack())) {
        await loadAndPlay(audio);
        return "started";
      }

      const key = getAudioKey(audio);
      try {
        const [tracks, activeIndex] = await Promise.all([
          TrackPlayer.getQueue(),
          TrackPlayer.getActiveTrackIndex(),
        ]);
        const active = activeIndex ?? 0;
        const existing = tracks.findIndex(
          (track) => String(track.id) === key,
        );

        if (existing === active) return "already-current";
        if (existing < 0 && tracks.length - active - 1 >= MAX_QUEUE) {
          return "full";
        }

        metadataRef.current.set(key, audio);

        // Remove any previous copy first so a naat only ever appears once.
        let insertAt = active + 1;
        if (existing >= 0) {
          await TrackPlayer.remove(existing);
          if (existing < active) insertAt = active;
        }

        await TrackPlayer.add(toTrack(audio), insertAt);
        await refreshQueue();
        return existing > active ? "moved" : "queued";
      } catch (err) {
        console.error("[AudioContext] Error playing next:", err);
        return "failed";
      }
    },
    [hasActiveTrack, loadAndPlay, refreshQueue],
  );

  /** Append to the end of the upcoming list. */
  const addToQueue = useCallback(
    async (audio: AudioMetadata): Promise<QueueAction> => {
      if (!(await hasActiveTrack())) {
        await loadAndPlay(audio);
        return "started";
      }

      const key = getAudioKey(audio);
      try {
        const [tracks, activeIndex] = await Promise.all([
          TrackPlayer.getQueue(),
          TrackPlayer.getActiveTrackIndex(),
        ]);
        const active = activeIndex ?? 0;
        const existing = tracks.findIndex(
          (track) => String(track.id) === key,
        );

        if (existing === active) return "already-current";
        if (existing >= 0) return "already-queued";
        if (tracks.length - active - 1 >= MAX_QUEUE) return "full";

        metadataRef.current.set(key, audio);
        await TrackPlayer.add(toTrack(audio));
        await refreshQueue();
        return "queued";
      } catch (err) {
        console.error("[AudioContext] Error adding to queue:", err);
        return "failed";
      }
    },
    [hasActiveTrack, loadAndPlay, refreshQueue],
  );

  const removeFromQueue = useCallback(
    async (key: string) => {
      try {
        const [tracks, activeIndex] = await Promise.all([
          TrackPlayer.getQueue(),
          TrackPlayer.getActiveTrackIndex(),
        ]);
        const index = tracks.findIndex((track) => String(track.id) === key);
        if (index >= 0 && index > (activeIndex ?? -1)) {
          await TrackPlayer.remove(index);
        }
        await refreshQueue();
      } catch (err) {
        console.error("[AudioContext] Error removing from queue:", err);
      }
    },
    [refreshQueue],
  );

  const clearQueue = useCallback(async () => {
    try {
      await TrackPlayer.removeUpcomingTracks();
    } catch (err) {
      console.error("[AudioContext] Error clearing queue:", err);
    }
    setQueue([]);
    queueRef.current = [];
    await applyRepeatMode(false);
  }, [applyRepeatMode]);

  const playFromQueue = useCallback(
    async (key: string) => {
      try {
        const [tracks, activeIndex] = await Promise.all([
          TrackPlayer.getQueue(),
          TrackPlayer.getActiveTrackIndex(),
        ]);
        const index = tracks.findIndex((track) => String(track.id) === key);
        if (index < 0) return;
        if (index !== activeIndex) {
          await TrackPlayer.skip(index);
        }
        await TrackPlayer.play();
        await refreshQueue();
      } catch (err) {
        console.error("[AudioContext] Error playing queued track:", err);
      }
    },
    [refreshQueue],
  );

  const skipToNext = useCallback(async () => {
    try {
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
      await refreshQueue();
    } catch (err) {
      console.error("[AudioContext] Error skipping to next track:", err);
    }
  }, [refreshQueue]);

  const skipToPrevious = useCallback(async () => {
    try {
      await TrackPlayer.skipToPrevious();
      await TrackPlayer.play();
      await refreshQueue();
    } catch (err) {
      console.error("[AudioContext] Error skipping to previous track:", err);
    }
  }, [refreshQueue]);

  // Play
  const play = useCallback(async () => {
    try {
      await TrackPlayer.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("[AudioContext] Error playing:", err);
      setError(err as Error);
    }
  }, []);

  // Pause
  const pause = useCallback(async () => {
    try {
      await TrackPlayer.pause();
      setIsPlaying(false);
    } catch (err) {
      console.error("[AudioContext] Error pausing:", err);
      setError(err as Error);
    }
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  // Seek
  const seek = useCallback(async (positionMillis: number) => {
    try {
      await TrackPlayer.seekTo(positionMillis / 1000);
      setPosition(positionMillis);
    } catch (err) {
      console.error("[AudioContext] Error seeking:", err);
      setError(err as Error);
    }
  }, []);

  // Set volume
  const setVolume = useCallback(async (newVolume: number) => {
    setVolumeState(newVolume);
    try {
      await TrackPlayer.setVolume(newVolume);
    } catch (err) {
      console.error("[AudioContext] Error setting volume:", err);
    }
  }, []);

  // Stop and clear
  const stop = useCallback(async () => {
    console.log("[AudioContext] stop() called");
    try {
      await TrackPlayer.reset();
    } catch (err) {
      console.error("[AudioContext] Error stopping:", err);
    }

    metadataRef.current.clear();
    setQueue([]);
    queueRef.current = [];
    currentAudioRef.current = null;
    setCurrentAudio(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setError(null);
    setIsLoading(false);
    setMode("none");
  }, [setMode]);

  // Toggle repeat
  const toggleRepeat = useCallback(async () => {
    const newValue = !isRepeatEnabled;
    setIsRepeatEnabled(newValue);
    // Update the ref immediately: applyRepeatMode reads it synchronously.
    isRepeatEnabledRef.current = newValue;
    try {
      await applyRepeatMode(queueRef.current.length > 0);
      await AsyncStorage.setItem(REPEAT_KEY, String(newValue));
      console.log("[AudioContext] Repeat toggled:", newValue);
    } catch (err) {
      console.error("[AudioContext] Error saving repeat preference:", err);
    }
  }, [applyRepeatMode, isRepeatEnabled]);

  // Toggle autoplay
  const toggleAutoplay = useCallback(async () => {
    const newValue = !isAutoplayEnabled;
    setIsAutoplayEnabled(newValue);
    try {
      await AsyncStorage.setItem(AUTOPLAY_KEY, String(newValue));
      console.log("[AudioContext] Autoplay toggled:", newValue);
    } catch (err) {
      console.error("[AudioContext] Error saving autoplay preference:", err);
    }
  }, [isAutoplayEnabled]);

  // Set autoplay callback (to be called from screen with access to data)
  const setAutoplayCallback = useCallback(
    (callback: (() => Promise<void>) | null) => {
      autoplayCallbackRef.current = callback;
    },
    [],
  );

  // Set track-complete callback (notifies when a track finishes, regardless of autoplay)
  const setTrackCompleteCallback = useCallback(
    (callback: ((naatId: string | undefined) => void) | null) => {
      trackCompleteCallbackRef.current = callback;
    },
    [],
  );

  // A/B Repeat functions
  const setABRepeatPointAFunc = useCallback((position: number | null) => {
    setAbRepeatPointA(position);
    console.log("[AudioContext] A/B repeat point A set:", position);
  }, []);

  const setABRepeatPointBFunc = useCallback(
    (position: number | null) => {
      setAbRepeatPointB(position);
      // Automatically enable A/B repeat when point B is set
      if (position !== null && abRepeatPointA !== null) {
        setIsABRepeatActive(true);
        console.log(
          "[AudioContext] A/B repeat point B set and auto-enabled:",
          position,
        );
      } else {
        console.log("[AudioContext] A/B repeat point B set:", position);
      }
    },
    [abRepeatPointA],
  );

  const clearABRepeat = useCallback(() => {
    setAbRepeatPointA(null);
    setAbRepeatPointB(null);
    setIsABRepeatActive(false);
    console.log("[AudioContext] A/B repeat cleared");
  }, []);

  const toggleABRepeat = useCallback(() => {
    if (abRepeatPointA !== null && abRepeatPointB !== null) {
      const newValue = !isABRepeatActive;
      setIsABRepeatActive(newValue);
      console.log("[AudioContext] A/B repeat toggled:", newValue);
    }
  }, [abRepeatPointA, abRepeatPointB, isABRepeatActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      TrackPlayer.reset();
    };
  }, []);

  const value: AudioContextType = {
    currentAudio,
    isPlaying,
    isLoading,
    position,
    duration,
    volume,
    error,
    isRepeatEnabled,
    isAutoplayEnabled,
    abRepeatPointA,
    abRepeatPointB,
    isABRepeatActive,
    queue,
    loadAndPlay,
    playNext,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playFromQueue,
    skipToNext,
    skipToPrevious,
    play,
    pause,
    seek,
    setVolume,
    stop,
    togglePlayPause,
    toggleRepeat,
    toggleAutoplay,
    setAutoplayCallback,
    setTrackCompleteCallback,
    setABRepeatPointA: setABRepeatPointAFunc,
    setABRepeatPointB: setABRepeatPointBFunc,
    clearABRepeat,
    toggleABRepeat,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within AudioProvider");
  }
  return context;
};
