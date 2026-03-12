import { usePlaybackMode } from '@/contexts/PlaybackModeContext';
import TrackPlayer, { State } from '@weights-ai/react-native-track-player';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

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

const LiveRadioContext = createContext<LiveRadioContextType | undefined>(undefined);

// Your Docker container URL - only used for stream URL
const LIVE_RADIO_STREAM_URL = 'http://owaisrazaqadri.duckdns.org:8000/live';

export const LiveRadioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setMode } = usePlaybackMode();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  
  const isInitialized = useRef(false);

  // Static data - no metadata fetching
  const currentNaat = { title: 'Naat Radio' };
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
        console.error('Error initializing TrackPlayer:', error);
      }
    };

    initializePlayer();
  }, []);

  // Refresh function - no-op since we don't fetch metadata
  const refresh = async () => {
    // No metadata to refresh
  };

  const play = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🎵 Starting naat radio...');

      // Check if we already have a track loaded (resume scenario)
      const currentTrack = await TrackPlayer.getActiveTrack();
      
      if (currentTrack && currentTrack.id === 'live-radio-icecast') {
        // Resume existing track
        console.log('▶️ Resuming playback...');
        await TrackPlayer.play();
        console.log('✅ Playback resumed');
      } else {
        // Initial play - clear and add new track
        await TrackPlayer.reset();
        console.log('✅ TrackPlayer reset');

        // Add the Icecast stream directly
        const track = {
          id: 'live-radio-icecast',
          url: LIVE_RADIO_STREAM_URL,
          title: 'Naat Radio',
          artwork: require('@/assets/images/gumbad.png'),
        };
        
        console.log('🎵 Adding Icecast stream:', track.url);
        await TrackPlayer.add(track);
        console.log('✅ Track added');

        // Start playing
        console.log('▶️ Starting playback...');
        await TrackPlayer.play();
        console.log('✅ Playback started');
      }
      
      setIsPlaying(true);
      setShowMiniPlayer(true);
      
      // Set playback mode to live
      setMode("live");

    } catch (error) {
      console.error('❌ Error starting naat radio:', error);
      setError(`Failed to start naat radio: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const pause = async (fromLivePage = false) => {
    try {
      await TrackPlayer.pause();
      setIsPlaying(false);
      
      // Hide mini player when paused from live page or notification
      setShowMiniPlayer(false);
      setMode("none");
    } catch (error) {
      console.error('Error pausing naat radio:', error);
    }
  };

  const pauseFromMiniPlayer = async () => {
    try {
      await TrackPlayer.pause();
      setIsPlaying(false);
      // Keep mini player visible and mode as "live" when paused from mini player
    } catch (error) {
      console.error('Error pausing naat radio from mini player:', error);
    }
  };

  const stop = async () => {
    try {
      await TrackPlayer.stop();
      await TrackPlayer.reset();
      setIsPlaying(false);
      setShowMiniPlayer(false);
      setMode("none");
    } catch (error) {
      console.error('Error stopping naat radio:', error);
    }
  };

  // Monitor TrackPlayer state changes
  useEffect(() => {
    const subscription = TrackPlayer.addEventListener('playback-state' as any, (state: any) => {
      console.log('🎵 TrackPlayer state changed:', state);
      setIsPlaying(state.state === State.Playing);
    });

    // Also listen for errors
    const errorSubscription = TrackPlayer.addEventListener('playback-error' as any, (error: any) => {
      console.error('❌ TrackPlayer error:', error);
      setError(`Playback error: ${error.message || 'Unknown error'}`);
    });

    return () => {
      subscription?.remove();
      errorSubscription?.remove();
    };
  }, []);

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
    throw new Error('useLiveRadioPlayer must be used within a LiveRadioProvider');
  }
  return context;
};