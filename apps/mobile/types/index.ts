// Re-export shared types
export * from "@naat-collection/shared";

// Mobile-specific types
import { DownloadMetadata } from "../services/audioDownload";

// Sort option type for downloads
export type DownloadSortOption =
  | "date-desc"
  | "date-asc"
  | "title-asc"
  | "title-desc";

// Playback position types
export interface PlaybackPosition {
  naatId: string;
  position: number;
  timestamp: number;
}

// Hook return types (mobile-specific)
export interface UseNaatsReturn {
  naats: import("@naat-collection/shared").Naat[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => Promise<void>;
}

export interface UseChannelsReturn {
  channels: import("@naat-collection/shared").Channel[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseSearchReturn {
  query: string;
  results: import("@naat-collection/shared").Naat[];
  loading: boolean;
  setQuery: (query: string) => void;
  clearSearch: () => void;
}

export interface UsePlaybackPositionReturn {
  savedPosition: number | null;
  savePosition: (position: number) => void;
  clearPosition: () => void;
}

export interface UseDownloadsReturn {
  downloads: DownloadMetadata[];
  loading: boolean;
  error: Error | null;
  totalSize: number;
  refresh: () => Promise<void>;
  deleteAudio: (audioId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

// Storage service interface (mobile-specific)
export interface IStorageService {
  savePlaybackPosition(naatId: string, position: number): Promise<void>;
  getPlaybackPosition(naatId: string): Promise<number | null>;
  clearPlaybackPosition(naatId: string): Promise<void>;
  getRecentPositions(): Promise<PlaybackPosition[]>;
}

// Component prop types (React Native specific)
export interface NaatCardProps {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  uploadDate: string;
  channelName: string;
  views: number;
  onPress: () => void;
}

export interface VideoPlayerProps {
  videoUrl: string;
}

export interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  onError: (error: Error) => void;
  onPositionChange?: (position: number) => void;
}

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export interface EmptyStateProps {
  message: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface DownloadedAudioCardProps {
  audio: DownloadMetadata;
  onPress: () => void;
  onDelete: () => void;
}

export interface DownloadedAudioModalProps {
  visible: boolean;
  onClose: () => void;
  audio: DownloadMetadata;
}

export interface DownloadsHeaderProps {
  totalSize: number;
  downloadCount: number;
  onClearAll?: () => void;
}

// Ingestion service types (for Appwrite Functions)
export interface IngestionResult {
  processed: number;
  added: number;
  skipped: number;
  errors: string[];
}
