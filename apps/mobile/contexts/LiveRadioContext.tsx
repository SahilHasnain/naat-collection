import { usePlaybackMode } from '@/contexts/PlaybackModeContext';
import TrackPlayer, { State } from '@weights-ai/react-native-track-player';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
const LIVE_RADIO_STREAM_URL = 'https://owaisrazaqadri.duckdns.org/live';

export const LiveRadioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setMode, isNormalAudioActive } = usePlaybackMode();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  
  const isInitialized = useRef(false);
  const pauseSource = useRef<'live-page' | 'mini-player' | 'notification' | null>(null);

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

  const stop = useCallback(async () => {
    try {
      pauseSource.current = null; // Reset pause source
      await TrackPlayer.stop();
      await TrackPlayer.reset();
      setIsPlaying(false);
      setShowMiniPlayer(false);
      setMode("none");
    } catch (error) {
      console.error('Error stopping naat radio:', error);
    }
  }, [setMode]);

  // Stop naat radio when normal audio becomes active
  useEffect(() => {
    if (isNormalAudioActive && (isPlaying || showMiniPlayer)) {
      console.log("[LiveRadio] Normal audio active, stopping naat radio");
      // Only update our state, don't change the mode or touch TrackPlayer
      // AudioContext is already in "normal" mode and will handle TrackPlayer
      setIsPlaying(false);
      setShowMiniPlayer(false);
      pauseSource.current = null;
    }
  }, [isNormalAudioActive, isPlaying, showMiniPlayer]);

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
      pauseSource.current = fromLivePage ? 'live-page' : 'notification';
      await TrackPlayer.pause();
      // State will be updated by the listener, which will handle showMiniPlayer logic
    } catch (error) {
      console.error('Error pausing naat radio:', error);
    }
  };

  const pauseFromMiniPlayer = async () => {
    try {
      pauseSource.current = 'mini-player';
      await TrackPlayer.pause();
      // State will be updated by the listener, which will handle showMiniPlayer logic
    } catch (error) {
      console.error('Error pausing naat radio from mini player:', error);
    }
  };

  // Monitor TrackPlayer state changes
  useEffect(() => {
    const subscription = TrackPlayer.addEventListener('playback-state' as any, async (state: any) => {
      console.log('🎵 TrackPlayer state changed:', state);
      
      // Check if the current track is our naat radio track
      try {
        const currentTrack = await TrackPlayer.getActiveTrack();
        const isNaatRadioTrack = currentTrack?.id === 'live-radio-icecast';
        
        if (isNaatRadioTrack) {
          // Only update our state if it's our track
          const isCurrentlyPlaying = state.state === State.Playing;
          setIsPlaying(isCurrentlyPlaying);
          
          // Handle mini player visibility based on pause source
          if (!isCurrentlyPlaying && pauseSource.current) {
            if (pauseSource.current === 'mini-player') {
              // Keep mini player visible when paused from mini player
              console.log('Paused from mini player - keeping mini player visible');
            } else {
              // Hide mini player when paused from live page or notification
              console.log(`Paused from ${pauseSource.current} - hiding mini player`);
              setShowMiniPlayer(false);
              setMode("none");
            }
            // Reset pause source
            pauseSource.current = null;
          }
        } else if (currentTrack && currentTrack.id !== 'live-radio-icecast') {
          // If a different track is playing, ensure our state shows not playing
          setIsPlaying(false);
        }
      } catch (error) {
        console.error('Error checking current track:', error);
      }
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
    throw new Error('useLiveRadioPlayer must be used within a LiveRadioProvider');
  }
  return context;
};