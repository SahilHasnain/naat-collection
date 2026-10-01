/**
 * Audio Download Service — web build
 * Web downloads are handed to the browser, which saves them to the user's
 * configured Downloads folder.
 */

import type {
  DownloadMetadata,
  DownloadProgress,
} from "./audioDownload";

export type { DownloadMetadata, DownloadProgress } from "./audioDownload";

const sanitizeFilename = (value: string, fallback: string): string => {
  const filename = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return filename || fallback;
};

const downloadInBrowser = async (
  url: string,
  filename: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> => {
  onProgress?.({ totalBytes: 0, bytesWritten: 0, progress: 0 });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);

  onProgress?.({
    totalBytes: blob.size,
    bytesWritten: blob.size,
    progress: 1,
  });

  return filename;
};

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
    audioId: string,
    audioUrl: string,
    _youtubeId: string,
    title: string,
    _duration: number,
    _channelName: string,
    _views: number,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<string> {
    const filename = `${sanitizeFilename(title, audioId)}.m4a`;
    return downloadInBrowser(audioUrl, filename, onProgress);
  }

  async downloadExportedAudio(
    downloadUrl: string,
    audioId: string,
    title: string,
    _duration: number,
    _channelName: string,
    _views: number,
    _thumbnailUrl?: string,
    _sourceAudioId?: string,
    _startMs?: number,
    _endMs?: number,
  ): Promise<string> {
    const filename = `${sanitizeFilename(title, audioId)}-ab-export.m4a`;
    return downloadInBrowser(downloadUrl, filename);
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
