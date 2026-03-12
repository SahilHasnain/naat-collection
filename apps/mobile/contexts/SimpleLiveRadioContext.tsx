import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import TrackPlayer, { State } from 'react-native-track-player';

interface CurrentTrack {
  id: string;
  title: string;
  duration: number;
  elapsedSeconds: number;
  startedAt: string;
}

interface SimpleLiveRadioContextType {
  isPlaying: boolean;
  currentTrack: CurrentTrack | null;
  isLoading: boolean;
  error: string | null;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
}

const SimpleLiveRadioContext = createContext<SimpleLiveRadioContextType | undefined>(undefined);

// Your Docker container URL
const LIVE_RADIO_BASE_URL = 'http://your-server.com:8080';

export const SimpleLiveRadioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const metadataIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

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

  // Fetch current track metadata
  const fetchMetadata = async () => {
    try {
      const response = await fetch(`${LIVE_RADIO_BASE_URL}/api/current`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentTrack(data.currentTrack);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch metadata');
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
      setError('Network error');
    }
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

      // Clear any existing tracks
      await TrackPlayer.reset();

      // Add the HLS stream
      await TrackPlayer.add({
        id: 'live-radio',
        url: `${LIVE_RADIO_BASE_URL}/live/master.m3u8`,
        title: 'Live Radio',
        artist: 'Your Radio Station',
        isLiveStream: true,
      });

      // Start playing
      await TrackPlayer.play();
      setIsPlaying(true);
      
      // Start polling for metadata
      startMetadataPolling();

    } catch (error) {
      console.error('Error starting live radio:', error);
      setError('Failed to start live radio');
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
    const subscription = TrackPlayer.addEventListener('playback-state', (state) => {
      setIsPlaying(state.state === State.Playing);
    });

    return () => subscription?.remove();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMetadataPolling();
    };
  }, []);

  const value: SimpleLiveRadioContextType = {
    isPlaying,
    currentTrack,
    isLoading,
    error,
    play,
    pause,
    stop,
  };

  return (
    <SimpleLiveRadioContext.Provider value={value}>
      {children}
    </SimpleLiveRadioContext.Provider>
  );
};

export const useSimpleLiveRadio = () => {
  const context = useContext(SimpleLiveRadioContext);
  if (context === undefined) {
    throw new Error('useSimpleLiveRadio must be used within a SimpleLiveRadioProvider');
  }
  return context;
};