/**
 * Appwrite Service
 *
 * Platform-agnostic service for interacting with Appwrite backend.
 * Handles fetching naats, searching, and error handling.
 */

import type {
  AppwriteConfig,
  AudioUrlResponse,
  Channel,
  ChannelDocument,
  IAppwriteService,
  Naat,
} from "@naat-collection/shared";
import { Client, Databases, Query } from "appwrite";

export interface AppwriteServiceOptions {
  config: AppwriteConfig;
  onError?: (error: Error, context?: Record<string, any>) => void;
}

/**
 * AppwriteService class handles all Appwrite database operations
 */
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

  /**
   * Initializes the Appwrite client with configuration
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.client
      .setEndpoint(this.config.endpoint)
      .setProject(this.config.projectId);

    this.isInitialized = true;
  }

  /**
   * Fetches a paginated list of naats from the database
   */
  async getNaats(
    limit: number = 20,
    offset: number = 0,
    sortBy: "latest" | "popular" | "oldest" = "latest",
    channelId?: string | null,
  ): Promise<Naat[]> {
    this.initialize();

    try {
      const queries = [Query.limit(limit), Query.offset(offset)];

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

  /**
   * Fetches a single naat by its ID
   */
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

  /**
   * Searches for naats matching the provided query string
   */
  async searchNaats(query: string, channelId?: string | null): Promise<Naat[]> {
    this.initialize();

    if (!query || query.trim() === "") {
      return [];
    }

    try {
      const queries = [
        Query.search("title", query),
        Query.orderDesc("uploadDate"),
      ];

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

  /**
   * Fetches distinct channels from the database
   */
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
        };
      });

      return channels;
    } catch (error) {
      this.onError?.(error as Error, { context: "getChannels" });
      throw error;
    }
  }

  /**
   * Get audio URL from Appwrite Storage
   */
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
