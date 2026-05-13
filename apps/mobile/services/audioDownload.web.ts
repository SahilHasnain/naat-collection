import AsyncStorage from "@react-native-async-storage/async-storage";

const DOWNLOAD_METADATA_KEY = "@audio_downloads";

export interface DownloadMetadata {
  audioId: string;
  youtubeId: string;
  title: string;
  localUri: string;
  thumbnailLocalUri?: string;
  downloadedAt: number;
  fileSize: number;
  duration: number;
  channelName: string;
  views: number;
}

export interface DownloadProgress {
  totalBytes: number;
  bytesWritten: number;
  progress: number;
}

class AudioDownloadServiceWeb {
  async initialize(): Promise<void> {}

  getThumbnailPath(audioId: string): string {
    return audioId;
  }

  async downloadThumbnail(): Promise<string | null> {
    return null;
  }

  getLocalPath(audioId: string): string {
    return audioId;
  }

  async isDownloaded(): Promise<boolean> {
    return false;
  }

  async getDownloadMetadata(audioId: string): Promise<DownloadMetadata | null> {
    try {
      const metadataJson = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
      if (!metadataJson) return null;
      const metadata: Record<string, DownloadMetadata> = JSON.parse(metadataJson);
      return metadata[audioId] || null;
    } catch {
      return null;
    }
  }

  async saveDownloadMetadata(metadata: DownloadMetadata): Promise<void> {
    try {
      const metadataJson = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
      const allMetadata: Record<string, DownloadMetadata> = metadataJson
        ? JSON.parse(metadataJson)
        : {};
      allMetadata[metadata.audioId] = metadata;
      await AsyncStorage.setItem(DOWNLOAD_METADATA_KEY, JSON.stringify(allMetadata));
    } catch (error) {
      console.error("Failed to save download metadata on web:", error);
    }
  }

  async downloadAudio(): Promise<string> {
    throw new Error("Downloads are not supported on web.");
  }

  async deleteAudio(audioId: string): Promise<void> {
    try {
      const metadataJson = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
      if (!metadataJson) return;
      const allMetadata: Record<string, DownloadMetadata> = JSON.parse(metadataJson);
      delete allMetadata[audioId];
      await AsyncStorage.setItem(DOWNLOAD_METADATA_KEY, JSON.stringify(allMetadata));
    } catch (error) {
      console.error("Failed to remove download metadata on web:", error);
    }
  }

  async getAllDownloads(): Promise<DownloadMetadata[]> {
    try {
      const metadataJson = await AsyncStorage.getItem(DOWNLOAD_METADATA_KEY);
      if (!metadataJson) return [];
      return Object.values(JSON.parse(metadataJson));
    } catch {
      return [];
    }
  }

  async getTotalDownloadSize(): Promise<number> {
    const downloads = await this.getAllDownloads();
    return downloads.reduce((total, download) => total + (download.fileSize || 0), 0);
  }

  async clearAllDownloads(): Promise<void> {
    await AsyncStorage.removeItem(DOWNLOAD_METADATA_KEY);
  }
}

export const audioDownloadService = new AudioDownloadServiceWeb();
