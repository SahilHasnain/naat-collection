/**
 * Appwrite Service
 *
 * This service handles all interactions with the Appwrite backend,
 * including fetching naats, searching, and error handling with timeouts.
 */

import * as Sentry from "@sentry/react-native";
import { Client, Databases, Query } from "appwrite";
import { appwriteConfig, validateAppwriteConfig } from "../config/appwrite";
import {
  AppError,
  AudioUrlResponse,
  Channel,
  ChannelDocument,
  ErrorCode,
  IAppwriteService,
  Naat,
} from "../types";
import {
  DEFAULT_TIMEOUT,
  logError,
  withCacheFallback,
  wrapError,
} from "../utils/errorHandling";

/**
 * AppwriteService class handles all Appwrite database operations
 */
export class AppwriteService implements IAppwriteService {
  private client: Client;
  private database: Databases;
  private isInitialized: boolean = false;

  constructor() {
    this.client = new Client();
    this.database = new Databases(this.client);
  }

  /**
   * Initializes the Appwrite client with configuration
   * @throws AppError if configuration is invalid
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      validateAppwriteConfig();

      this.client
        .setEndpoint(appwriteConfig.endpoint)
        .setProject(appwriteConfig.projectId);

      this.isInitialized = true;

      // Log successful initialization to Sentry
      Sentry.addBreadcrumb({
        category: "appwrite",
        message: "Appwrite client initialized",
        level: "info",
      });
    } catch (error) {
      // Capture initialization errors in Sentry
      Sentry.captureException(error, {
        tags: {
          component: "appwrite",
          action: "initialize",
        },
      });

      throw new AppError(
        "Failed to initialize Appwrite client. Please check your configuration.",
        ErrorCode.API_ERROR,
        false
      );
    }
  }

  /**
   * Fetches a paginated list of naats from the database
   * @param limit - Number of naats to fetch (default: 20)
   * @param offset - Number of naats to skip for pagination (default: 0)
   * @param sortBy - Sort order: "latest", "popular", or "oldest" (default: "latest")
   * @param channelId - Optional channel ID to filter by (null = all channels)
   * @returns Promise resolving to array of Naat objects
   * @throws AppError if the request fails or times out
   */
  async getNaats(
    limit: number = 20,
    offset: number = 0,
    sortBy: "latest" | "popular" | "oldest" = "latest",
    channelId?: string | null
  ): Promise<Naat[]> {
    this.initialize();

    const channelKey = channelId || "all";
    const cacheKey = `naats_${channelKey}_${limit}_${offset}_${sortBy}`;

    try {
      // Build queries based on sort option
      const queries = [Query.limit(limit), Query.offset(offset)];

      // Add channel filter if channelId is provided
      if (channelId) {
        queries.push(Query.equal("channelId", channelId));
      }

      switch (sortBy) {
        case "popular":
          // Sort by views in descending order (most popular first)
          queries.push(Query.orderDesc("views"));
          break;
        case "oldest":
          // Sort by upload date in ascending order (oldest first)
          queries.push(Query.orderAsc("uploadDate"));
          break;
        case "latest":
        default:
          // Sort by upload date in descending order (latest first)
          queries.push(Query.orderDesc("uploadDate"));
          break;
      }

      const response = await withCacheFallback(
        () =>
          this.database.listDocuments({
            databaseId: appwriteConfig.databaseId,
            collectionId: appwriteConfig.naatsCollectionId,
            queries,
          }),
        cacheKey,
        {
          timeoutMs: DEFAULT_TIMEOUT,
          maxAttempts: 3,
        }
      );

      return response.documents as unknown as Naat[];
    } catch (error) {
      const wrappedError = wrapError(error, ErrorCode.NETWORK_ERROR);

      // Send to Sentry with context
      Sentry.captureException(wrappedError, {
        tags: {
          component: "appwrite",
          action: "getNaats",
        },
        contexts: {
          request: {
            limit,
            offset,
            sortBy,
            channelId: channelId || "all",
          },
        },
      });

      logError(wrappedError, {
        context: "getNaats",
        limit,
        offset,
        sortBy,
        channelId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Unable to load naats. Please check your internet connection.",
        ErrorCode.NETWORK_ERROR,
        true
      );
    }
  }

  /**
   * Fetches a single naat by its ID
   * @param id - The unique identifier of the naat
   * @returns Promise resolving to a Naat object
   * @throws AppError if the naat is not found or request fails
   */
  async getNaatById(id: string): Promise<Naat> {
    this.initialize();

    if (!id || id.trim() === "") {
      throw new AppError(
        "Invalid naat ID provided.",
        ErrorCode.API_ERROR,
        false
      );
    }

    const cacheKey = `naat_${id}`;

    try {
      const response = await withCacheFallback(
        () =>
          this.database.getDocument({
            databaseId: appwriteConfig.databaseId,
            collectionId: appwriteConfig.naatsCollectionId,
            documentId: id,
          }),
        cacheKey,
        {
          timeoutMs: DEFAULT_TIMEOUT,
          maxAttempts: 3,
        }
      );

      return response as unknown as Naat;
    } catch (error) {
      logError(wrapError(error, ErrorCode.API_ERROR), {
        context: "getNaatById",
        id,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Unable to load naat details. Please try again.",
        ErrorCode.API_ERROR,
        true
      );
    }
  }

  /**
   * Searches for naats matching the provided query string
   * @param query - Search query to filter naats by title
   * @param channelId - Optional channel ID to filter by (null = all channels)
   * @returns Promise resolving to array of matching Naat objects
   * @throws AppError if the search request fails or times out
   */
  async searchNaats(query: string, channelId?: string | null): Promise<Naat[]> {
    this.initialize();

    if (!query || query.trim() === "") {
      return [];
    }

    const channelKey = channelId || "all";
    const cacheKey = `search_${channelKey}_${query}`;

    try {
      const queries = [
        Query.search("title", query),
        Query.orderDesc("uploadDate"),
      ];

      // Add channel filter if channelId is provided
      if (channelId) {
        queries.push(Query.equal("channelId", channelId));
      }

      const response = await withCacheFallback(
        () =>
          this.database.listDocuments({
            databaseId: appwriteConfig.databaseId,
            collectionId: appwriteConfig.naatsCollectionId,
            queries,
          }),
        cacheKey,
        {
          timeoutMs: DEFAULT_TIMEOUT,
          maxAttempts: 3,
        }
      );

      return response.documents as unknown as Naat[];
    } catch (error) {
      logError(wrapError(error, ErrorCode.NETWORK_ERROR), {
        context: "searchNaats",
        query,
        channelId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Search failed. Please check your connection and try again.",
        ErrorCode.NETWORK_ERROR,
        true
      );
    }
  }

  /**
   * Fetches distinct channels from the database
   * @returns Promise resolving to array of Channel objects sorted alphabetically
   * @throws AppError if the request fails or times out
   */
  async getChannels(): Promise<Channel[]> {
    this.initialize();

    const cacheKey = "channels_list";

    try {
      const response = await withCacheFallback(
        () =>
          this.database.listDocuments({
            databaseId: appwriteConfig.databaseId,
            collectionId: appwriteConfig.channelsCollectionId,
            queries: [
              Query.orderAsc("channelName"), // Sort alphabetically by name
              Query.limit(100), // Reasonable limit for channels
            ],
          }),
        cacheKey,
        {
          timeoutMs: DEFAULT_TIMEOUT,
          maxAttempts: 3,
        }
      );

      // Map ChannelDocument to Channel interface
      const channels: Channel[] = response.documents.map((doc) => {
        const channelDoc = doc as unknown as ChannelDocument;
        return {
          id: channelDoc.channelId,
          name: channelDoc.channelName,
        };
      });

      return channels;
    } catch (error) {
      logError(wrapError(error, ErrorCode.NETWORK_ERROR), {
        context: "getChannels",
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Unable to load channels. Please check your internet connection.",
        ErrorCode.NETWORK_ERROR,
        true
      );
    }
  }

  /**
   * Get audio URL from Appwrite Storage
   * @param audioId - The storage file ID
   * @returns Audio URL response
   * @throws AppError if audioId is not provided or invalid
   */
  async getAudioUrl(audioId?: string | null): Promise<AudioUrlResponse> {
    if (!audioId || audioId.trim() === "") {
      return {
        success: false,
        error: "Audio not available for this naat yet.",
      };
    }

    try {
      // Return the file view URL for streaming
      const audioUrl = `${appwriteConfig.endpoint}/storage/buckets/audio-files/files/${audioId}/view?project=${appwriteConfig.projectId}`;

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

/**
 * Singleton instance of AppwriteService
 */
export const appwriteService = new AppwriteService();
