import TrackPlayer, { State } from '@weights-ai/react-native-track-player';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface CurrentTrack {
  id: string;
  title: string;
  duration: number;
  elapsedSeconds: number;
  startedAt: string;
}

interface LiveRadioContextType {
  isPlaying: boolean;
  currentTrack: CurrentTrack | null;
  currentNaat: CurrentTrack | null; // Alias for compatibility
  upcomingNaats: CurrentTrack[];
  listenerCount: number;
  isLoading: boolean;
  error: string | null;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  refresh: () => Promise<void>;
}

const LiveRadioContext = createContext<LiveRadioContextType | undefined>(undefined);

// Your Docker container URL
const LIVE_RADIO_BASE_URL = 'http://owaisrazaqadri.duckdns.org:8080';

export const LiveRadioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [upcomingNaats, setUpcomingNaats] = useState<CurrentTrack[]>([]);
  const [listenerCount, setListenerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const metadataIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialized = useRef(false);
  const lastTrackId = useRef<string | null>(null);

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

  // Fetch current track metadata and check for track changes
  const fetchMetadata = async () => {
    try {
      const response = await fetch(`${LIVE_RADIO_BASE_URL}/api/current`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentTrack(data.currentTrack);
        setUpcomingNaats(data.upcomingTracks || []);
        setListenerCount(data.listenerCount || 0);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch metadata');
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
      setError('Network error');
    }
  };

  // Refresh function
  const refresh = async () => {
    await fetchMetadata();
  };

  // Start metadata polling
  const startMetadataPolling = () => {
    if (metadataIntervalRef.current) return;
    
    // Fetch immediately
    fetchMetadata();
    
    // Then poll every 10 seconds
    metadataIntervalRef.current = setInterval(fetchMetadata, 10000);
  };

  // Stop metadata polling
  const stopMetadataPolling = () => {
    if (metadataIntervalRef.current) {
      clearInterval(metadataIntervalRef.current);
      metadataIntervalRef.current = null;
    }
  };

  const play = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🎵 Starting live radio...');

      // Get current track info first
      await fetchMetadata();
      
      if (!currentTrack) {
        throw new Error('No track currently available');
      }

      // Clear any existing tracks
      await TrackPlayer.reset();
      console.log('✅ TrackPlayer reset');

      // Add the Icecast stream directly
      const track = {
        id: 'live-radio-icecast',
        url: `http://owaisrazaqadri.duckdns.org:8000/live`,
        title: currentTrack?.title || 'Live Radio',
        artist: 'Owais Raza Qadri Radio',
      };
      
      console.log('🎵 Adding Icecast stream:', track.url);
      await TrackPlayer.add(track);
      console.log('✅ Track added');

      // Start playing
      console.log('▶️ Starting playback...');
      await TrackPlayer.play();
      console.log('✅ Playback started');
      
      setIsPlaying(true);
      lastTrackId.current = currentTrack.id;
      
      // Start polling for metadata updates
      startMetadataPolling();

    } catch (error) {
      console.error('❌ Error starting live radio:', error);
      setError(`Failed to start live radio: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const pause = async () => {
    try {
      await TrackPlayer.pause();
      setIsPlaying(false);
      stopMetadataPolling();
    } catch (error) {
      console.error('Error pausing live radio:', error);
    }
  };

  const stop = async () => {
    try {
      await TrackPlayer.stop();
      await TrackPlayer.reset();
      setIsPlaying(false);
      setCurrentTrack(null);
      stopMetadataPolling();
    } catch (error) {
      console.error('Error stopping live radio:', error);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMetadataPolling();
    };
  }, []);

  const value: LiveRadioContextType = {
    isPlaying,
    currentTrack,
    currentNaat: currentTrack, // Alias for compatibility
    upcomingNaats,
    listenerCount,
    isLoading,
    error,
    play,
    pause,
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