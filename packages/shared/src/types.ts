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
  audioId?: string; // Appwrite Storage file ID for audio
  createdAt: string;
  updatedAt: string;
}

// Sort option type for filtering naats
export type SortOption = "forYou" | "latest" | "popular" | "oldest";

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
    public recoverable: boolean = true,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Service interfaces
export interface IAppwriteService {
  getNaats(
    limit: number,
    offset: number,
    sortBy?: "latest" | "popular" | "oldest",
    channelId?: string | null,
  ): Promise<Naat[]>;
  getNaatById(id: string): Promise<Naat>;
  searchNaats(query: string, channelId?: string | null): Promise<Naat[]>;
  getAudioUrl(audioId?: string | null): Promise<AudioUrlResponse>;
  getChannels(): Promise<Channel[]>;
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
