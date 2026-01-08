// Core data models
import { DownloadMetadata } from "../services/audioDownload";

export interface Naat {
  $id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  uploadDate: string; // ISO 8601 format
  channelName: string;
  channelId: string;
  youtubeId: string;
  views: number; // view count for popularity sorting
  audioId?: string; // Appwrite Storage file ID for audio
  createdAt: string;
  updatedAt: string;
}

// Sort option type for filtering naats
export type SortOption = "latest" | "popular" | "oldest";

// Sort option type for downloads
export type DownloadSortOption =
  | "date-desc"
  | "date-asc"
  | "title-asc"
  | "title-desc";

export interface Channel {
  id: string; // YouTube channel ID
  name: string; // Channel display name
}

export interface ChannelDocument {
  $id: string; // Document ID (same as channelId)
  channelId: string; // YouTube channel ID
  channelName: string;
  naatCount?: number; // Optional: number of naats from this channel
  lastUpdated?: string; // ISO 8601 format
  createdAt: string;
  updatedAt: string;
}

export interface Reciter {
  $id: string;
  name: string;
  bio?: string;
  profileImage?: string;
  youtubeChannelId: string;
  createdAt: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  total?: number;
  error?: string;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface SearchParams {
  query: string;
  limit?: number;
}

// Playback position types
export interface PlaybackPosition {
  naatId: string;
  position: number;
  timestamp: number;
}

// Error handling types
export enum ErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",
  PLAYBACK_ERROR = "PLAYBACK_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Hook return types
export interface UseNaatsReturn {
  naats: Naat[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => Promise<void>;
}

export interface UseChannelsReturn {
  channels: Channel[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseSearchReturn {
  query: string;
  results: Naat[];
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

// Service interfaces
export interface IAppwriteService {
  getNaats(
    limit: number,
    offset: number,
    sortBy?: "latest" | "popular" | "oldest",
    channelId?: string | null
  ): Promise<Naat[]>;
  getNaatById(id: string): Promise<Naat>;
  searchNaats(query: string, channelId?: string | null): Promise<Naat[]>;
  getAudioUrl(audioId?: string | null): Promise<AudioUrlResponse>;
  getChannels(): Promise<Channel[]>;
}

export interface IStorageService {
  savePlaybackPosition(naatId: string, position: number): Promise<void>;
  getPlaybackPosition(naatId: string): Promise<number | null>;
  clearPlaybackPosition(naatId: string): Promise<void>;
  getRecentPositions(): Promise<PlaybackPosition[]>;
}

// Component prop types
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

// Audio extraction types
export interface AudioUrlResponse {
  success: boolean;
  audioUrl?: string;
  expiresAt?: number;
  format?: string;
  quality?: string;
  error?: string;
  code?: string;
  fromStorage?: boolean; // Indicates if audio is from Appwrite Storage
}

export enum AudioErrorCode {
  INVALID_ID = "INVALID_ID",
  EXTRACTION_FAILED = "EXTRACTION_FAILED",
  YTDLP_NOT_FOUND = "YTDLP_NOT_FOUND",
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  URL_EXPIRED = "URL_EXPIRED",
}
