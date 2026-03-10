/**
 * Shared types for the application
 */

import type { AppwriteConfig } from "./config";

export interface Naat {
  $id: string;
  title: string;
  youtubeId: string;
  thumbnailUrl: string;
  channelName: string;
  channelId: string;
  duration: number;
  views: number;
  uploadDate: string;
  audioId?: string;
  cutAudio?: string;
  cutSegments?: string; // JSON string of cut segments [{start, end}] for AI training data
  cutStatus?: string; // "processing" | "done" | "failed" | null
  exclude?: boolean;
  $createdAt: string;
  $updatedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  isOfficial?: boolean;
  isOther?: boolean;
  type?: "channel" | "playlist";
  playlistId?: string;
}

export interface ChannelDocument {
  $id: string;
  channelId: string;
  channelName: string;
  isOfficial?: boolean;
  isOther?: boolean;
  type?: "channel" | "playlist";
  playlistId?: string;
}

export interface AudioUrlResponse {
  success: boolean;
  audioUrl?: string;
  fromStorage?: boolean;
  error?: string;
}

export interface IAppwriteService {
  getNaats(
    limit?: number,
    offset?: number,
    sortBy?: "latest" | "popular" | "oldest",
    channelId?: string | null,
  ): Promise<Naat[]>;
  getNaatById(id: string): Promise<Naat>;
  getNaatByYoutubeId(youtubeId: string): Promise<Naat | null>;
  searchNaats(query: string, channelId?: string | null): Promise<Naat[]>;
  getChannels(): Promise<Channel[]>;
  getAudioUrl(audioId?: string | null): Promise<AudioUrlResponse>;
}

export type { AppwriteConfig };
