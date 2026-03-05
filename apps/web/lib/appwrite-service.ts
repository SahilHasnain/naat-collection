/**
 * Appwrite Service
 *
 * Service for interacting with Appwrite backend.
 */

import { Client, Databases, Query } from "appwrite";
import type {
    AppwriteConfig,
    AudioUrlResponse,
    Channel,
    ChannelDocument,
    IAppwriteService,
    Naat,
} from "./shared/types";

export interface AppwriteServiceOptions {
  config: AppwriteConfig;
  onError?: (error: Error, context?: Record<string, any>) => void;
}

export class AppwriteService implements IAppwriteService {
  private client: Client;
  private database: Databases;
  private config: AppwriteConfig;
  private isInitialized: boolean = false;
  private onError?: (error: Error, context?: Record<string, any>) => void;

  constructor(options: AppwriteServiceOptions) {
    this.config = options.config;
    this.onError = options.onError;
    this.client = new Client();
    this.database = new Databases(this.client);
  }

  private initialize(): void {
    if (this.isInitialized) return;
    this.client
      .setEndpoint(this.config.endpoint)
      .setProject(this.config.projectId);
    this.isInitialized = true;
  }

  async getNaats(
    limit: number = 20,
    offset: number = 0,
    sortBy: "latest" | "popular" | "oldest" = "latest",
    channelId?: string | null,
  ): Promise<Naat[]> {
    this.initialize();

    try {
      const queries = [Query.limit(limit), Query.offset(offset)];
      queries.push(Query.or([
        Query.equal("exclude", false),
        Query.isNull("exclude")
      ]));

      if (channelId) {
        queries.push(Query.equal("channelId", channelId));
      }

      switch (sortBy) {
        case "popular":
          queries.push(Query.orderDesc("views"));
          break;
        case "oldest":
          queries.push(Query.orderAsc("uploadDate"));
          break;
        case "latest":
        default:
          queries.push(Query.orderDesc("uploadDate"));
          break;
      }

      const response = await this.database.listDocuments(
        this.config.databaseId,
        this.config.naatsCollectionId,
        queries,
      );

      return response.documents as unknown as Naat[];
    } catch (error) {
      this.onError?.(error as Error, {
        context: "getNaats",
        limit,
        offset,
        sortBy,
        channelId,
      });
      throw error;
    }
  }

  async getNaatById(id: string): Promise<Naat> {
    this.initialize();

    try {
      const response = await this.database.getDocument(
        this.config.databaseId,
        this.config.naatsCollectionId,
        id,
      );

      return response as unknown as Naat;
    } catch (error) {
      this.onError?.(error as Error, { context: "getNaatById", id });
      throw error;
    }
  }

  async getNaatByYoutubeId(youtubeId: string): Promise<Naat | null> {
    this.initialize();

    try {
      const response = await this.database.listDocuments(
        this.config.databaseId,
        this.config.naatsCollectionId,
        [Query.equal("youtubeId", youtubeId), Query.limit(1)],
      );

      if (response.documents.length === 0) return null;
      return response.documents[0] as unknown as Naat;
    } catch (error) {
      this.onError?.(error as Error, {
        context: "getNaatByYoutubeId",
        youtubeId,
      });
      throw error;
    }
  }

  async searchNaats(query: string, channelId?: string | null): Promise<Naat[]> {
    this.initialize();

    if (!query || query.trim() === "") return [];

    try {
      const queries = [
        Query.search("title", query),
        Query.orderDesc("uploadDate"),
      ];

      queries.push(Query.or([
        Query.equal("exclude", false),
        Query.isNull("exclude")
      ]));

      if (channelId) {
        queries.push(Query.equal("channelId", channelId));
      }

      const response = await this.database.listDocuments(
        this.config.databaseId,
        this.config.naatsCollectionId,
        queries,
      );

      return response.documents as unknown as Naat[];
    } catch (error) {
      this.onError?.(error as Error, {
        context: "searchNaats",
        query,
        channelId,
      });
      throw error;
    }
  }

  async getChannels(): Promise<Channel[]> {
    this.initialize();

    try {
      const response = await this.database.listDocuments(
        this.config.databaseId,
        this.config.channelsCollectionId,
        [Query.orderAsc("channelName"), Query.limit(100)],
      );

      const channels: Channel[] = response.documents.map((doc) => {
        const channelDoc = doc as unknown as ChannelDocument;
        return {
          id: channelDoc.channelId,
          name: channelDoc.channelName,
          isOfficial: channelDoc.isOfficial ?? true,
          isOther: channelDoc.isOther ?? false,
          type: channelDoc.type ?? "channel",
          playlistId: channelDoc.playlistId,
        };
      });

      return channels;
    } catch (error) {
      this.onError?.(error as Error, { context: "getChannels" });
      throw error;
    }
  }

  async getAudioUrl(audioId?: string | null): Promise<AudioUrlResponse> {
    if (!audioId || audioId.trim() === "") {
      return {
        success: false,
        error: "Audio not available for this naat yet.",
      };
    }

    try {
      const audioUrl = `${this.config.endpoint}/storage/buckets/audio-files/files/${audioId}/view?project=${this.config.projectId}`;

      return {
        success: true,
        audioUrl,
        fromStorage: true,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to load audio from storage.",
      };
    }
  }
}
