/**
 * Audio Download Service
 * Handles downloading and managing audio files on device
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const AUDIO_DIRECTORY = `${FileSystem.documentDirectory}audio/`;
const THUMBNAILS_DIRECTORY = `${FileSystem.documentDirectory}thumbnails/`;
const DOWNLOAD_METADATA_KEY = "@audio_downloads";

export interface DownloadMetadata {
  audioId: string;
  youtubeId: string;
  title: string;
  localUri: string;
  thumbnailLocalUri?: string;
  downloadedAt: number;
  fileSize: number;
  duration: number; // in seconds
  channelName: string;
  views: number;
}

export interface DownloadProgress {
  totalBytes: number;
  bytesWritten: number;
  progress: number; // 0-1
}

class AudioDownloadService {
  /**
   * Initialize audio and thumbnails directories
   */
  async initialize(): Promise<void> {
    const audioDirInfo = await FileSystem.getInfoAsync(AUDIO_DIRECTORY);
    if (!audioDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(AUDIO_DIRECTORY, {
        intermediates: true,
      });
    }
    const thumbDirInfo = await FileSystem.getInfoAsync(THUMBNAILS_DIRECTORY);
    if (!thumbDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(THUMBNAILS_DIRECTORY, {
        intermediates: true,
      });
    }
  }

  /**
   * Get local thumbnail path for an audio
   */
  getThumbnailPath(audioId: string): string {
    return `${THUMBNAILS_DIRECTORY}${audioId}.jpg`;
  }

  /**
   * Download thumbnail image for offline use
   */
  async downloadThumbnail(youtubeId: string, audioId: string): Promise<string | null> {
    try {
      const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
      const localPath = this.getThumbnailPath(audioId);

      const result = await FileSystem.downloadAsync(thumbnailUrl, localPath);
      if (result && result.status === 200) {
        return result.uri;
      }
      return null;
    } catch (error) {
      console.warn("Failed to download thumbnail:", error);
      return null;
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
   * Get download metadata with migration for duration field
   */
  async getDownloadMetadata(audioId: string): Promise<DownloadMetadata | null> {
    try {
      const metadataJson = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
      if (!metadataJson) return null;

      const metadata: Record<string, DownloadMetadata> =
        JSON.parse(metadataJson);
      const downloadMetadata = metadata[audioId];

      if (!downloadMetadata) return null;

      // Migration: Add default duration if missing
      if (typeof downloadMetadata.duration === "undefined") {
        downloadMetadata.duration = 0; // Default to 0 if duration is missing
      }

      // Migration: Add default channelName if missing
      if (typeof downloadMetadata.channelName === "undefined") {
        downloadMetadata.channelName = "Unknown Channel";
      }

      // Migration: Add default views if missing
      if (typeof downloadMetadata.views === "undefined") {
        downloadMetadata.views = 0;
      }

      return downloadMetadata;
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
        JSON.stringify(allMetadata),
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
    duration: number,
    channelName: string,
    views: number,
    onProgress?: (progress: DownloadProgress) => void,
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
      },
    );

    const result = await downloadResumable.downloadAsync();

    if (!result) {
      throw new Error("Download failed");
    }

    // Save metadata
    const fileInfo = await FileSystem.getInfoAsync(result.uri);

    // Download thumbnail alongside audio
    const thumbnailLocalUri = await this.downloadThumbnail(youtubeId, audioId);

    const metadata: DownloadMetadata = {
      audioId,
      youtubeId,
      title,
      localUri: result.uri,
      thumbnailLocalUri: thumbnailLocalUri ?? undefined,
      downloadedAt: Date.now(),
      fileSize: fileInfo.exists && "size" in fileInfo ? fileInfo.size : 0,
      duration,
      channelName,
      views,
    };

    await this.saveDownloadMetadata(metadata);

    return result.uri;
  }

  /**
   * Delete downloaded audio and its thumbnail
   */
  async deleteAudio(audioId: string): Promise<void> {
    const localPath = this.getLocalPath(audioId);
    const thumbnailPath = this.getThumbnailPath(audioId);

    // Delete audio file
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(localPath);
    }

    // Delete thumbnail file
    const thumbInfo = await FileSystem.getInfoAsync(thumbnailPath);
    if (thumbInfo.exists) {
      await FileSystem.deleteAsync(thumbnailPath);
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
          JSON.stringify(allMetadata),
        );
      }
    } catch (error) {
      console.error("Failed to remove download metadata:", error);
    }
  }

  /**
   * Get all downloaded audios with migration for duration field
   */
  async getAllDownloads(): Promise<DownloadMetadata[]> {
    try {
      const metadataJson = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
      if (!metadataJson) return [];

      const allMetadata: Record<string, DownloadMetadata> =
        JSON.parse(metadataJson);

      // Migration: Add default duration if missing for any downloads
      const downloads = Object.values(allMetadata).map((download) => {
        if (typeof download.duration === "undefined") {
          download.duration = 0; // Default to 0 if duration is missing
        }
        if (typeof download.channelName === "undefined") {
          download.channelName = "Unknown Channel";
        }
        if (typeof download.views === "undefined") {
          download.views = 0;
        }
        return download;
      });

      return downloads;
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
