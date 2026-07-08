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
  staticFallbackUrls?: {
    naats: string;
    channels: string;
  };
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
  private staticFallbackUrls?: { naats: string; channels: string };
  private staticNaatsCache: Naat[] | null = null;
  private staticChannelsCache: Channel[] | null = null;
  private isUsingFallback: boolean = false;
  public dataSource: 'static' | 'appwrite' = 'static';

  constructor(options: AppwriteServiceOptions) {
    this.config = options.config;
    this.onError = options.onError;
    this.staticFallbackUrls = options.staticFallbackUrls;
    this.client = new Client();
    this.database = new Databases(this.client);
  }

  /**
   * Initializes the Appwrite client with configuration
   */
  /**
   * Load naats from static JSON fallback
   */
  private async loadStaticNaats(): Promise<Naat[]> {
    if (this.staticNaatsCache) {
      console.log('[Fallback] Using cached static naats');
      return this.staticNaatsCache;
    }

    if (!this.staticFallbackUrls?.naats) {
      throw new Error('Static fallback URL not configured');
    }

    console.log('[Fallback] Loading naats from static JSON:', this.staticFallbackUrls.naats);

    try {
      const response = await fetch(this.staticFallbackUrls.naats);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch static naats: ${response.status}`);
      }

      const data = await response.json();
      this.staticNaatsCache = data.data || data; // Handle both {data: [...]} and [...]
      this.isUsingFallback = true;
      this.dataSource = 'static';

      console.log(`[Fallback] Loaded ${this.staticNaatsCache.length} naats from static JSON`);
      console.log(`[Fallback] Export date: ${data.metadata?.exportedAt || 'unknown'}`);

      return this.staticNaatsCache;
    } catch (error) {
      console.error('[Fallback] Failed to load static naats:', error);
      throw error;
    }
  }

  /**
   * Load channels from static JSON fallback
   */
  private async loadStaticChannels(): Promise<any[]> {
    if (this.staticChannelsCache) {
      console.log('[Fallback] Using cached static channels');
      return this.staticChannelsCache;
    }

    if (!this.staticFallbackUrls?.channels) {
      throw new Error('Static fallback URL not configured');
    }

    console.log('[Fallback] Loading channels from static JSON:', this.staticFallbackUrls.channels);

    try {
      const response = await fetch(this.staticFallbackUrls.channels);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch static channels: ${response.status}`);
      }

      const data = await response.json();
      this.staticChannelsCache = data.data || data;
      this.isUsingFallback = true;
      this.dataSource = 'static';

      console.log(`[Fallback] Loaded ${this.staticChannelsCache.length} channels from static JSON`);

      return this.staticChannelsCache;
    } catch (error) {
      console.error('[Fallback] Failed to load static channels:', error);
      throw error;
    }
  }

  private filterAndPaginateNaats(
    naats: Naat[],
    limit: number,
    offset: number,
    sortBy: "latest" | "popular" | "oldest",
    channelId?: string | null,
    pureOnly?: boolean,
  ): Naat[] {
    let filtered = naats.filter(naat => {
      if (channelId && naat.channelId !== channelId) return false;
      if (pureOnly && !naat.cutAudio) return false;
      return true;
    });

    switch (sortBy) {
      case "popular":
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "oldest":
        filtered.sort((a, b) =>
          new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
        );
        break;
      case "latest":
      default:
        filtered.sort((a, b) =>
          new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
        break;
    }

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Check if currently using fallback mode
   */
  public isInFallbackMode(): boolean {
    return this.isUsingFallback;
  }

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
    pureOnly?: boolean,
  ): Promise<Naat[]> {
    // Try static JSON first (permanent static-export mode)
    try {
      const allNaats = await this.loadStaticNaats();
      return this.filterAndPaginateNaats(allNaats, limit, offset, sortBy, channelId, pureOnly);
    } catch (staticError) {
      console.warn('[Appwrite] Static load failed, falling back to Appwrite:', staticError);
    }

    // Appwrite fallback (existing code preserved for recovery)
    this.initialize();

    try {
      console.error("[DEBUG] getNaats: method entered, fallbackUrl:", this.staticFallbackUrls?.naats);
      const queries = [Query.limit(limit), Query.offset(offset)];

      queries.push(Query.or([
        Query.equal("exclude", false),
        Query.isNull("exclude")
      ]));

      if (channelId) {
        queries.push(Query.equal("channelId", channelId));
      }

      // Filter to only naats with cut audio
      if (pureOnly) {
        queries.push(Query.isNotNull("cutAudio"));
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

      console.error("[DEBUG] getNaats: about to call DB, offset:", offset, "limit:", limit);
      const response = await this.database.listDocuments(
        this.config.databaseId,
        this.config.naatsCollectionId,
        queries,
      );
      console.error("[DEBUG] getNaats: DB call SUCCEEDED, docs:", response.documents.length);
      this.dataSource = 'appwrite';

      return response.documents as unknown as Naat[];
    } catch (error: any) {
      console.error("[DEBUG getNaats base] name:", error?.name, "code:", error?.code, "type:", error?.type, "message:", error?.message);
      // Check for rate limit or service unavailable errors
      if (error.code === 429 || error.code === 402 || error.code === 503 || error.type === 'general_rate_limit_exceeded' || error.type === 'limit_databases_reads_exceeded') {
        console.warn('[Appwrite] Rate limit exceeded, using static fallback');
        
        try {
          const allNaats = await this.loadStaticNaats();
          return this.filterAndPaginateNaats(allNaats, limit, offset, sortBy, channelId, pureOnly);
        } catch (fallbackError) {
          console.error('[Fallback] Failed to load from static JSON:', fallbackError);
          throw error; // Throw original error if fallback also fails
        }
      }
      
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
    // Try static JSON first (permanent static-export mode)
    try {
      const allNaats = await this.loadStaticNaats();
      const naat = allNaats.find(n => n.$id === id);
      if (naat) return naat;
    } catch (staticError) {
      console.warn('[Appwrite] Static load failed for getNaatById, falling back to Appwrite:', staticError);
    }

    // Appwrite fallback (existing code preserved for recovery)
    this.initialize();

    try {
      const response = await this.database.getDocument(
        this.config.databaseId,
        this.config.naatsCollectionId,
        id,
      );

      this.dataSource = 'appwrite';
      return response as unknown as Naat;
    } catch (error) {
      this.onError?.(error as Error, { context: "getNaatById", id });
      throw error;
    }
  }

  /**
   * Fetches a single naat by its YouTube ID
   */
  async getNaatByYoutubeId(youtubeId: string): Promise<Naat | null> {
    // Try static JSON first (permanent static-export mode)
    try {
      const allNaats = await this.loadStaticNaats();
      const naat = allNaats.find(n => n.youtubeId === youtubeId);
      if (naat) return naat;
    } catch (staticError) {
      console.warn('[Appwrite] Static load failed for getNaatByYoutubeId, falling back to Appwrite:', staticError);
    }

    // Appwrite fallback (existing code preserved for recovery)
    this.initialize();

    try {
      const response = await this.database.listDocuments(
        this.config.databaseId,
        this.config.naatsCollectionId,
        [Query.equal("youtubeId", youtubeId), Query.limit(1)],
      );

      if (response.documents.length === 0) {
        return null;
      }

      this.dataSource = 'appwrite';
      return response.documents[0] as unknown as Naat;
    } catch (error) {
      this.onError?.(error as Error, {
        context: "getNaatByYoutubeId",
        youtubeId,
      });
      throw error;
    }
  }

  /**
   * Searches for naats matching the provided query string
   */
  async searchNaats(query: string, channelId?: string | null, pureOnly?: boolean): Promise<Naat[]> {
    if (!query || query.trim() === "") {
      return [];
    }

    // Try static JSON first (permanent static-export mode)
    try {
      const allNaats = await this.loadStaticNaats();
      const searchLower = query.toLowerCase();
      let results = allNaats.filter(naat => {
        if (!naat.title.toLowerCase().includes(searchLower)) return false;
        if (channelId && naat.channelId !== channelId) return false;
        if (pureOnly && !naat.cutAudio) return false;
        return true;
      });
      results.sort((a, b) =>
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      );
      return results;
    } catch (staticError) {
      console.warn('[Appwrite] Static search load failed, falling back to Appwrite:', staticError);
    }

    // Appwrite fallback (existing code preserved for recovery)
    this.initialize();

    try {
      const queries = [
        Query.search("title", query),
        Query.orderDesc("uploadDate"),
      ];

      // Exclude naats marked as excluded
      queries.push(Query.or([
        Query.equal("exclude", false),
        Query.isNull("exclude")
      ]));

      if (channelId) {
        queries.push(Query.equal("channelId", channelId));
      }

      // Filter to only naats with cut audio
      if (pureOnly) {
        queries.push(Query.isNotNull("cutAudio"));
      }

      const response = await this.database.listDocuments(
        this.config.databaseId,
        this.config.naatsCollectionId,
        queries,
        );

      this.dataSource = 'appwrite';
      return response.documents as unknown as Naat[];
    } catch (error: any) {
      // Check for rate limit errors
      if (error.code === 429 || error.code === 402 || error.code === 503 || error.type === 'general_rate_limit_exceeded' || error.type === 'limit_databases_reads_exceeded') {
        console.warn('[Appwrite] Rate limit exceeded, searching static fallback');
        
        try {
          const allNaats = await this.loadStaticNaats();
          
          // Simple case-insensitive search
          const searchLower = query.toLowerCase();
          let results = allNaats.filter(naat => {
            if (!naat.title.toLowerCase().includes(searchLower)) return false;
            if (channelId && naat.channelId !== channelId) return false;
            if (pureOnly && !naat.cutAudio) return false;
            return true;
          });

          // Sort by upload date
          results.sort((a, b) => 
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
          );

          return results;
          
        } catch (fallbackError) {
          console.error('[Fallback] Search failed:', fallbackError);
          throw error;
        }
      }
      
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
    // Try static JSON first (permanent static-export mode)
    try {
      const staticChannels = await this.loadStaticChannels();
      return staticChannels.map((doc: any) => ({
        id: doc.channelId,
        name: doc.channelName,
        isOfficial: doc.isOfficial ?? true,
        isOther: doc.isOther ?? false,
        type: doc.type ?? "channel",
        playlistId: doc.playlistId,
      }));
    } catch (staticError) {
      console.warn('[Appwrite] Static channels load failed, falling back to Appwrite:', staticError);
    }

    // Appwrite fallback (existing code preserved for recovery)
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

      this.dataSource = 'appwrite';
      return channels;
    } catch (error: any) {
      console.error("[DEBUG getChannels base] name:", error?.name, "code:", error?.code, "type:", error?.type, "message:", error?.message);
      // Check for rate limit errors
      if (error.code === 429 || error.code === 402 || error.code === 503 || error.type === 'general_rate_limit_exceeded' || error.type === 'limit_databases_reads_exceeded') {
        console.warn('[Appwrite] Rate limit exceeded, loading channels from static fallback');
        
        try {
          const staticChannels = await this.loadStaticChannels();
          
          return staticChannels.map((doc: any) => ({
            id: doc.channelId,
            name: doc.channelName,
            isOfficial: doc.isOfficial ?? true,
            isOther: doc.isOther ?? false,
            type: doc.type ?? "channel",
            playlistId: doc.playlistId,
          }));
          
        } catch (fallbackError) {
          console.error('[Fallback] Failed to load channels:', fallbackError);
          throw error;
        }
      }
      
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
