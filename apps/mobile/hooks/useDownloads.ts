/**
 * Custom hook for managing downloaded audio files
 */

import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useState } from "react";
import {
  audioDownloadService,
  DownloadMetadata,
} from "../services/audioDownload";

export interface UseDownloadsReturn {
  downloads: DownloadMetadata[];
  loading: boolean;
  error: Error | null;
  totalSize: number;
  refresh: () => Promise<void>;
  deleteAudio: (audioId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export function useDownloads(): UseDownloadsReturn {
  const [downloads, setDownloads] = useState<DownloadMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalSize, setTotalSize] = useState<number>(0);

  /**
   * Load downloads from the service
   */
  const loadDownloads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allDownloads = await audioDownloadService.getAllDownloads();
      setDownloads(allDownloads);

      const size = await audioDownloadService.getTotalDownloadSize();
      setTotalSize(size);
    } catch (err) {
      let errorMessage = "Failed to load downloads";

      if (err instanceof Error) {
        // Check for specific error types
        if (err.message.includes("permission")) {
          errorMessage =
            "Storage permission denied. Please enable storage access in settings.";
        } else if (
          err.message.includes("storage") ||
          err.message.includes("space")
        ) {
          errorMessage = "Storage error. Please check available space.";
        } else {
          errorMessage = err.message;
        }
      }

      const error = new Error(errorMessage);
      setError(error);
      console.error("Error loading downloads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Calculate total size of all downloads
   */
  const calculateTotalSize = useCallback(async () => {
    try {
      const size = await audioDownloadService.getTotalDownloadSize();
      setTotalSize(size);
    } catch (err) {
      console.error("Error calculating total size:", err);
    }
  }, []);

  /**
   * Delete a specific audio file
   */
  const deleteAudio = useCallback(
    async (audioId: string) => {
      try {
        setError(null);

        await audioDownloadService.deleteAudio(audioId);

        // Update state immediately
        setDownloads((prev) => prev.filter((d) => d.audioId !== audioId));
        await calculateTotalSize();
      } catch (err) {
        let errorMessage = "Failed to delete audio";

        if (err instanceof Error) {
          if (err.message.includes("permission")) {
            errorMessage = "Storage permission denied";
          } else if (err.message.includes("not found")) {
            errorMessage = "File not found. It may have been deleted already.";
            // Still remove from state if file doesn't exist
            setDownloads((prev) => prev.filter((d) => d.audioId !== audioId));
            await calculateTotalSize();
            return; // Don't throw error if file was already deleted
          } else {
            errorMessage = err.message;
          }
        }

        const error = new Error(errorMessage);
        setError(error);
        console.error("Error deleting audio:", err);
        throw error;
      }
    },
    [calculateTotalSize]
  );

  /**
   * Refresh downloads and validate file existence
   */
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allDownloads = await audioDownloadService.getAllDownloads();

      // Validate that files still exist
      const validatedDownloads: DownloadMetadata[] = [];
      let cleanedCount = 0;

      for (const download of allDownloads) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(download.localUri);

          if (fileInfo.exists) {
            validatedDownloads.push(download);
          } else {
            // File was deleted externally, clean up metadata
            try {
              await audioDownloadService.deleteAudio(download.audioId);
              cleanedCount++;
            } catch (cleanupErr) {
              console.error("Error cleaning up metadata:", cleanupErr);
            }
          }
        } catch (fileCheckErr) {
          // If we can't check the file, assume it's gone
          console.error("Error checking file:", fileCheckErr);
          try {
            await audioDownloadService.deleteAudio(download.audioId);
            cleanedCount++;
          } catch (cleanupErr) {
            console.error("Error cleaning up metadata:", cleanupErr);
          }
        }
      }

      setDownloads(validatedDownloads);
      await calculateTotalSize();

      // Notify user if files were cleaned up
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} missing file(s)`);
      }
    } catch (err) {
      let errorMessage = "Failed to refresh downloads";

      if (err instanceof Error) {
        if (err.message.includes("permission")) {
          errorMessage = "Storage permission denied";
        } else {
          errorMessage = err.message;
        }
      }

      const error = new Error(errorMessage);
      setError(error);
      console.error("Error refreshing downloads:", err);
    } finally {
      setLoading(false);
    }
  }, [calculateTotalSize]);

  /**
   * Clear all downloads
   */
  const clearAll = useCallback(async () => {
    try {
      setError(null);

      await audioDownloadService.clearAllDownloads();

      setDownloads([]);
      setTotalSize(0);
    } catch (err) {
      let errorMessage = "Failed to clear all downloads";

      if (err instanceof Error) {
        if (err.message.includes("permission")) {
          errorMessage = "Storage permission denied";
        } else {
          errorMessage = err.message;
        }
      }

      const error = new Error(errorMessage);
      setError(error);
      console.error("Error clearing all downloads:", err);
      throw error;
    }
  }, []);

  // Load downloads on mount
  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  return {
    downloads,
    loading,
    error,
    totalSize,
    refresh,
    deleteAudio,
    clearAll,
  };
}
