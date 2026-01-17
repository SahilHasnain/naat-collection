/**
 * Audio Download Service
 * Handles downloading and managing audio files on device
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const AUDIO_DIRECTORY = `${FileSystem.documentDirectory}audio/`;
const DOWNLOAD_METADATA_KEY = "@audio_downloads";

export interface DownloadMetadata {
  audioId: string;
  youtubeId: string;
  title: string;
  localUri: string;
  downloadedAt: number;
  fileSize: number;
}

export interface DownloadProgress {
  totalBytes: number;
  bytesWritten: number;
  progress: number; // 0-1
}

class AudioDownloadService {
  /**
   * Initialize audio directory
   */
  async initialize(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(AUDIO_DIRECTORY, {
        intermediates: true,
      });
    }
  }

  /**
   * Get local file path for an audio
   */
  getLocalPath(audioId: string): string {
    return `${AUDIO_DIRECTORY}${audioId}.m4a`;
  }

  /**
   * Check if audio is downloaded
   */
  async isDownloaded(audioId: string): Promise<boolean> {
    const localPath = this.getLocalPath(audioId);
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    return fileInfo.exists;
  }

  /**
   * Get download metadata
   */
  async getDownloadMetadata(audioId: string): Promise<DownloadMetadata | null> {
    try {
      const metadataJson = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
      if (!metadataJson) return null;

      const metadata: Record<string, DownloadMetadata> =
        JSON.parse(metadataJson);
      return metadata[audioId] || null;
    } catch {
      return null;
    }
  }

  /**
   * Save download metadata
   */
  async saveDownloadMetadata(metadata: DownloadMetadata): Promise<void> {
    try {
      const metadataJson = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
      const allMetadata: Record<string, DownloadMetadata> = metadataJson
        ? JSON.parse(metadataJson)
        : {};

      allMetadata[metadata.audioId] = metadata;
      await AsyncStorage.setItem(
        DOWNLOAD_METADATA_KEY,
        JSON.stringify(allMetadata)
      );
    } catch (error) {
      console.error("Failed to save download metadata:", error);
    }
  }

  /**
   * Download audio file
   */
  async downloadAudio(
    audioId: string,
    audioUrl: string,
    youtubeId: string,
    title: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    await this.initialize();

    const localPath = this.getLocalPath(audioId);

    // Create download resumable
    const downloadResumable = FileSystem.createDownloadResumable(
      audioUrl,
      localPath,
      {},
      (downloadProgress) => {
        if (onProgress) {
          // Safely calculate progress to prevent negative or extreme values
          const totalBytes = downloadProgress.totalBytesExpectedToWrite || 0;
          const bytesWritten = downloadProgress.totalBytesWritten || 0;

          // Ensure progress is between 0 and 1
          let progressValue = 0;
          if (totalBytes > 0 && bytesWritten >= 0) {
            progressValue = Math.min(Math.max(bytesWritten / totalBytes, 0), 1);
          }

          const progress: DownloadProgress = {
            totalBytes,
            bytesWritten,
            progress: progressValue,
          };
          onProgress(progress);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (!result) {
      throw new Error("Download failed");
    }

    // Save metadata
    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    const metadata: DownloadMetadata = {
      audioId,
      youtubeId,
      title,
      localUri: result.uri,
      downloadedAt: Date.now(),
      fileSize: fileInfo.exists && "size" in fileInfo ? fileInfo.size : 0,
    };

    await this.saveDownloadMetadata(metadata);

    return result.uri;
  }

  /**
   * Delete downloaded audio
   */
  async deleteAudio(audioId: string): Promise<void> {
    const localPath = this.getLocalPath(audioId);

    // Delete file
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(localPath);
    }

    // Remove metadata
    try {
      const metadataJson = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
      if (metadataJson) {
        const allMetadata: Record<string, DownloadMetadata> =
          JSON.parse(metadataJson);
        delete allMetadata[audioId];
        await AsyncStorage.setItem(
          DOWNLOAD_METADATA_KEY,
          JSON.stringify(allMetadata)
        );
      }
    } catch (error) {
      console.error("Failed to remove download metadata:", error);
    }
  }

  /**
   * Get all downloaded audios
   */
  async getAllDownloads(): Promise<DownloadMetadata[]> {
    try {
      const metadataJson = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
      if (!metadataJson) return [];

      const allMetadata: Record<string, DownloadMetadata> =
        JSON.parse(metadataJson);
      return Object.values(allMetadata);
    } catch {
      return [];
    }
  }

  /**
   * Get total size of downloaded audios
   */
  async getTotalDownloadSize(): Promise<number> {
    const downloads = await this.getAllDownloads();
    return downloads.reduce((total, download) => total + download.fileSize, 0);
  }

  /**
   * Clear all downloads
   */
  async clearAllDownloads(): Promise<void> {
    const downloads = await this.getAllDownloads();

    for (const download of downloads) {
      await this.deleteAudio(download.audioId);
    }
  }
}

export const audioDownloadService = new AudioDownloadService();
