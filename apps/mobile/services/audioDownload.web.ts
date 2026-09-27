/**
 * Audio Download Service — web build
 * Downloads require the local file system (expo-file-system), which is not
 * available on web. This stub keeps the same public API so web screens render
 * without crashing; download actions report that they are unsupported.
 */

import type {
  DownloadMetadata,
  DownloadProgress,
} from "./audioDownload";

export type { DownloadMetadata, DownloadProgress } from "./audioDownload";

class AudioDownloadService {
  async initialize(): Promise<void> {}

  getThumbnailPath(_audioId: string): string {
    return "";
  }

  async downloadThumbnail(
    _youtubeId: string,
    _audioId: string,
  ): Promise<string | null> {
    return null;
  }

  async downloadThumbnailFromUrl(
    _thumbnailUrl: string,
    _audioId: string,
  ): Promise<string | null> {
    return null;
  }

  getLocalPath(_audioId: string): string {
    return "";
  }

  async isDownloaded(_audioId: string): Promise<boolean> {
    return false;
  }

  async getDownloadMetadata(
    _audioId: string,
  ): Promise<DownloadMetadata | null> {
    return null;
  }

  async saveDownloadMetadata(_metadata: DownloadMetadata): Promise<void> {}

  async downloadAudio(
    _audioId: string,
    _audioUrl: string,
    _youtubeId: string,
    _title: string,
    _duration: number,
    _channelName: string,
    _views: number,
    _onProgress?: (progress: DownloadProgress) => void,
  ): Promise<string> {
    throw new Error("Downloads are only available in the mobile app.");
  }

  async downloadExportedAudio(
    _downloadUrl: string,
    _audioId: string,
    _title: string,
    _duration: number,
    _channelName: string,
    _views: number,
    _thumbnailUrl?: string,
    _sourceAudioId?: string,
    _startMs?: number,
    _endMs?: number,
  ): Promise<string> {
    throw new Error("Downloads are only available in the mobile app.");
  }

  async deleteAudio(_audioId: string): Promise<void> {}

  async getAllDownloads(): Promise<DownloadMetadata[]> {
    return [];
  }

  async getTotalDownloadSize(): Promise<number> {
    return 0;
  }

  async clearAllDownloads(): Promise<void> {}
}

export const audioDownloadService = new AudioDownloadService();