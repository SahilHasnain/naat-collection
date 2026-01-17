/**
 * Appwrite Service for React Native
 *
 * This service wraps the shared AppwriteService with Sentry error tracking
 * and platform-specific error handling.
 */

import { AppwriteService as BaseAppwriteService } from "@naat-collection/api-client";
import type {
  AppError,
  AudioUrlResponse,
  Channel,
  ErrorCode,
  IAppwriteService,
  Naat,
} from "@naat-collection/shared";
import * as Sentry from "@sentry/react-native";
import { appwriteConfig, validateAppwriteConfig } from "../config/appwrite";
import {
  DEFAULT_TIMEOUT,
  logError,
  withCacheFallback,
  wrapError,
} from "../utils/errorHandling";

/**
 * AppwriteService class with Sentry integration
 */
export class AppwriteService implements IAppwriteService {
  private baseService: BaseAppwriteService;

  constructor() {
    // Validate config on initialization
    validateAppwriteConfig();

    // Create base service with error callback
    this.baseService = new BaseAppwriteService({
      config: appwriteConfig,
      onError: (error, context) => {
        // Send errors to Sentry
        Sentry.captureException(error, {
          tags: {
            component: "appwrite",
            action: context?.context || "unknown",
          },
          contexts: {
            request: context,
          },
        });
      },
    });

    // Log successful initialization to Sentry
    Sentry.addBreadcrumb({
      category: "appwrite",
      message: "Appwrite client initialized",
      level: "info",
    });
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
    const channelKey = channelId || "all";
    const cacheKey = `naats_${channelKey}_${limit}_${offset}_${sortBy}`;

    try {
      return await withCacheFallback(
        () => this.baseService.getNaats(limit, offset, sortBy, channelId),
        cacheKey,
        {
          timeoutMs: DEFAULT_TIMEOUT,
          maxAttempts: 3,
        },
      );
    } catch (error) {
      const wrappedError = wrapError(error, ErrorCode.NETWORK_ERROR);
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
        true,
      );
    }
  }

  /**
   * Fetches a single naat by its ID
   */
  async getNaatById(id: string): Promise<Naat> {
    if (!id || id.trim() === "") {
      throw new AppError(
        "Invalid naat ID provided.",
        ErrorCode.API_ERROR,
        false,
      );
    }

    const cacheKey = `naat_${id}`;

    try {
      return await withCacheFallback(
        () => this.baseService.getNaatById(id),
        cacheKey,
        {
          timeoutMs: DEFAULT_TIMEOUT,
          maxAttempts: 3,
        },
      );
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
        true,
      );
    }
  }

  /**
   * Searches for naats matching the provided query string
   */
  async searchNaats(query: string, channelId?: string | null): Promise<Naat[]> {
    if (!query || query.trim() === "") {
      return [];
    }

    const channelKey = channelId || "all";
    const cacheKey = `search_${channelKey}_${query}`;

    try {
      return await withCacheFallback(
        () => this.baseService.searchNaats(query, channelId),
        cacheKey,
        {
          timeoutMs: DEFAULT_TIMEOUT,
          maxAttempts: 3,
        },
      );
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
        true,
      );
    }
  }

  /**
   * Fetches distinct channels from the database
   */
  async getChannels(): Promise<Channel[]> {
    const cacheKey = "channels_list";

    try {
      return await withCacheFallback(
        () => this.baseService.getChannels(),
        cacheKey,
        {
          timeoutMs: DEFAULT_TIMEOUT,
          maxAttempts: 3,
        },
      );
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
        true,
      );
    }
  }

  /**
   * Get audio URL from Appwrite Storage
   */
  async getAudioUrl(audioId?: string | null): Promise<AudioUrlResponse> {
    return this.baseService.getAudioUrl(audioId);
  }
}

/**
 * Singleton instance of AppwriteService
 */
export const appwriteService = new AppwriteService();
