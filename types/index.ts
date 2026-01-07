// Core data models
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

// Service interfaces
export interface IAppwriteService {
  getNaats(
    limit: number,
    offset: number,
    sortBy?: "latest" | "popular" | "oldest"
  ): Promise<Naat[]>;
  getNaatById(id: string): Promise<Naat>;
  searchNaats(query: string): Promise<Naat[]>;
  getAudioUrl(youtubeId: string): Promise<AudioUrlResponse>;
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
}

export enum AudioErrorCode {
  INVALID_ID = "INVALID_ID",
  EXTRACTION_FAILED = "EXTRACTION_FAILED",
  YTDLP_NOT_FOUND = "YTDLP_NOT_FOUND",
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  URL_EXPIRED = "URL_EXPIRED",
}
