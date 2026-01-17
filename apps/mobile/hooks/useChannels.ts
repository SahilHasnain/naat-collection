import { useCallback, useEffect, useRef, useState } from "react";
import { appwriteService } from "../services/appwrite";
import type { Channel } from "../types";

/**
 * Return type for useChannels hook
 */
export interface UseChannelsReturn {
  channels: Channel[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing channels data with caching
 *
 * Features:
 * - Fetches available channels from Appwrite on mount
 * - In-memory caching to avoid redundant API calls
 * - Pull-to-refresh support
 * - Error handling
 * - Alphabetical sorting by channel name
 *
 * @returns UseChannelsReturn object with channels data and control functions
 */
export function useChannels(): UseChannelsReturn {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // In-memory cache to avoid redundant API calls
  const cacheRef = useRef<Channel[] | null>(null);

  // Flag to prevent multiple simultaneous loads
  const isLoadingRef = useRef<boolean>(false);

  /**
   * Fetch channels from the service
   */
  const fetchChannels = useCallback(async (): Promise<void> => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      return;
    }

    // Use cached data if available
    if (cacheRef.current !== null) {
      setChannels(cacheRef.current);
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const fetchedChannels = await appwriteService.getChannels();

      // Sort channels alphabetically by name (defensive, service should already sort)
      const sortedChannels = [...fetchedChannels].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      // Cache the results
      cacheRef.current = sortedChannels;

      // Update state
      setChannels(sortedChannels);
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error("Failed to load channels");
      setError(errorObj);

      // On error, return empty array as fallback
      setChannels([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  /**
   * Refresh the channels list (pull-to-refresh)
   * Clears cache and reloads from the beginning
   */
  const refresh = useCallback(async (): Promise<void> => {
    // Clear cache
    cacheRef.current = null;

    // Reset state
    setChannels([]);
    setError(null);
    setLoading(true);
    isLoadingRef.current = true;

    try {
      const freshChannels = await appwriteService.getChannels();

      // Sort channels alphabetically by name
      const sortedChannels = [...freshChannels].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      // Cache the results
      cacheRef.current = sortedChannels;

      // Update state
      setChannels(sortedChannels);
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error("Failed to refresh channels");
      setError(errorObj);

      // On error, return empty array as fallback
      setChannels([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Fetch channels on mount
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return {
    channels,
    loading,
    error,
    refresh,
  };
}
