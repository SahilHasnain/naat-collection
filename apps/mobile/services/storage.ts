import AsyncStorage from "@react-native-async-storage/async-storage";
import type { IStorageService, PlaybackPosition } from "../types";
import { AppError, ErrorCode } from "../types";
import { logError, wrapError } from "../utils/errorHandling";

/**
 * Storage keys used by the service
 */
const STORAGE_KEYS = {
  PLAYBACK_PREFIX: "@naat_playback_",
  RECENT_POSITIONS: "@naat_recent_positions",
  PLAYBACK_MODE: "@naat_playback_mode",
  WATCH_HISTORY: "@naat_watch_history",
  WATCH_HISTORY_TIMESTAMPS: "@naat_watch_history_timestamps",
  FOR_YOU_SESSION: "@naat_for_you_session",
} as const;

/**
 * Maximum number of recent positions to maintain
 */
const MAX_RECENT_POSITIONS = 10;

/**
 * Maximum number of watch history items to maintain
 */
const MAX_WATCH_HISTORY = 100;

/**
 * Service for managing local storage operations
 * Handles playback position persistence using AsyncStorage
 */
export class StorageService implements IStorageService {
  /**
   * Save playback position for a specific naat
   * @param naatId - Unique identifier for the naat
   * @param position - Playback position in seconds
   * @throws AppError if storage operation fails
   */
  async savePlaybackPosition(naatId: string, position: number): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.PLAYBACK_PREFIX}${naatId}`;
      const data: PlaybackPosition = {
        naatId,
        position,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(key, JSON.stringify(data));
      await this.updateRecentPositions(naatId);
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "savePlaybackPosition",
        naatId,
        position,
      });

      throw new AppError(
        "Failed to save playback position.",
        ErrorCode.STORAGE_ERROR,
        true
      );
    }
  }

  /**
   * Retrieve saved playback position for a specific naat
   * @param naatId - Unique identifier for the naat
   * @returns Playback position in seconds, or null if not found
   * @throws AppError if storage operation fails
   */
  async getPlaybackPosition(naatId: string): Promise<number | null> {
    try {
      const key = `${STORAGE_KEYS.PLAYBACK_PREFIX}${naatId}`;
      const data = await AsyncStorage.getItem(key);

      if (!data) {
        return null;
      }

      const parsed: PlaybackPosition = JSON.parse(data);
      return parsed.position;
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "getPlaybackPosition",
        naatId,
      });

      throw new AppError(
        "Failed to retrieve playback position.",
        ErrorCode.STORAGE_ERROR,
        true
      );
    }
  }

  /**
   * Clear saved playback position for a specific naat
   * @param naatId - Unique identifier for the naat
   * @throws AppError if storage operation fails
   */
  async clearPlaybackPosition(naatId: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.PLAYBACK_PREFIX}${naatId}`;
      await AsyncStorage.removeItem(key);
      await this.removeFromRecentPositions(naatId);
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "clearPlaybackPosition",
        naatId,
      });

      throw new AppError(
        "Failed to clear playback position.",
        ErrorCode.STORAGE_ERROR,
        true
      );
    }
  }

  /**
   * Get list of recent playback positions
   * @returns Array of PlaybackPosition objects, limited to 10 most recent
   * @throws AppError if storage operation fails
   */
  async getRecentPositions(): Promise<PlaybackPosition[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_POSITIONS);

      if (!data) {
        return [];
      }

      const naatIds: string[] = JSON.parse(data);
      const positions: PlaybackPosition[] = [];

      for (const naatId of naatIds) {
        const key = `${STORAGE_KEYS.PLAYBACK_PREFIX}${naatId}`;
        const positionData = await AsyncStorage.getItem(key);

        if (positionData) {
          positions.push(JSON.parse(positionData));
        }
      }

      return positions;
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "getRecentPositions",
      });

      throw new AppError(
        "Failed to retrieve recent playback positions.",
        ErrorCode.STORAGE_ERROR,
        true
      );
    }
  }

  /**
   * Update the list of recent positions with a new naatId
   * Maintains a maximum of 10 items, removing oldest when limit is reached
   * @param naatId - Unique identifier for the naat
   * @private
   */
  private async updateRecentPositions(naatId: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_POSITIONS);
      let naatIds: string[] = data ? JSON.parse(data) : [];

      // Remove naatId if it already exists
      naatIds = naatIds.filter((id) => id !== naatId);

      // Add to the beginning of the array
      naatIds.unshift(naatId);

      // Limit to MAX_RECENT_POSITIONS
      if (naatIds.length > MAX_RECENT_POSITIONS) {
        naatIds = naatIds.slice(0, MAX_RECENT_POSITIONS);
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_POSITIONS,
        JSON.stringify(naatIds)
      );
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "updateRecentPositions",
        naatId,
      });
      // Don't throw here as this is a secondary operation
    }
  }

  /**
   * Remove a naatId from the recent positions list
   * @param naatId - Unique identifier for the naat
   * @private
   */
  private async removeFromRecentPositions(naatId: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_POSITIONS);

      if (!data) {
        return;
      }

      let naatIds: string[] = JSON.parse(data);
      naatIds = naatIds.filter((id) => id !== naatId);

      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_POSITIONS,
        JSON.stringify(naatIds)
      );
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "removeFromRecentPositions",
        naatId,
      });
      // Don't throw here as this is a secondary operation
    }
  }

  /**
   * Save playback mode preference
   * @param mode - Playback mode ('video' | 'audio')
   * @throws AppError if storage operation fails
   */
  async savePlaybackMode(mode: "video" | "audio"): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYBACK_MODE, mode);
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "savePlaybackMode",
        mode,
      });

      throw new AppError(
        "Failed to save playback mode preference.",
        ErrorCode.STORAGE_ERROR,
        true
      );
    }
  }

  /**
   * Load saved playback mode preference
   * @returns Playback mode ('video' | 'audio'), or null if not found
   * @throws AppError if storage operation fails
   */
  async loadPlaybackMode(): Promise<"video" | "audio" | null> {
    try {
      const mode = await AsyncStorage.getItem(STORAGE_KEYS.PLAYBACK_MODE);

      if (!mode) {
        return null;
      }

      // Validate the stored value
      if (mode === "video" || mode === "audio") {
        return mode;
      }

      return null;
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "loadPlaybackMode",
      });

      throw new AppError(
        "Failed to load playback mode preference.",
        ErrorCode.STORAGE_ERROR,
        true
      );
    }
  }

  /**
   * Add a naat to watch history
   * @param naatId - Unique identifier for the naat
   * @throws AppError if storage operation fails
   */
  async addToWatchHistory(naatId: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
      let history: string[] = data ? JSON.parse(data) : [];

      // Get timestamps
      const timestampsData = await AsyncStorage.getItem(
        STORAGE_KEYS.WATCH_HISTORY_TIMESTAMPS
      );
      let timestamps: Record<string, number> = timestampsData
        ? JSON.parse(timestampsData)
        : {};

      // Remove if already exists (to update timestamp)
      history = history.filter((id) => id !== naatId);

      // Add to beginning
      history.unshift(naatId);

      // Update timestamp
      timestamps[naatId] = Date.now();

      // Limit to MAX_WATCH_HISTORY
      if (history.length > MAX_WATCH_HISTORY) {
        const removed = history.slice(MAX_WATCH_HISTORY);
        history = history.slice(0, MAX_WATCH_HISTORY);

        // Clean up timestamps for removed items
        removed.forEach((id) => delete timestamps[id]);
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.WATCH_HISTORY,
        JSON.stringify(history)
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.WATCH_HISTORY_TIMESTAMPS,
        JSON.stringify(timestamps)
      );
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "addToWatchHistory",
        naatId,
      });
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Get watch history
   * @returns Array of naat IDs in watch history
   */
  async getWatchHistory(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "getWatchHistory",
      });
      return [];
    }
  }

  /**
   * Get watch history with timestamps
   * @returns Record of naat IDs to timestamps
   */
  async getWatchHistoryTimestamps(): Promise<Record<string, number>> {
    try {
      const data = await AsyncStorage.getItem(
        STORAGE_KEYS.WATCH_HISTORY_TIMESTAMPS
      );
      return data ? JSON.parse(data) : {};
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "getWatchHistoryTimestamps",
      });
      return {};
    }
  }

  /**
   * Remove a single item from watch history
   * @param naatId - Unique identifier for the naat
   */
  async removeFromWatchHistory(naatId: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
      let history: string[] = data ? JSON.parse(data) : [];

      // Get timestamps
      const timestampsData = await AsyncStorage.getItem(
        STORAGE_KEYS.WATCH_HISTORY_TIMESTAMPS
      );
      let timestamps: Record<string, number> = timestampsData
        ? JSON.parse(timestampsData)
        : {};

      // Remove from history
      history = history.filter((id) => id !== naatId);

      // Remove timestamp
      delete timestamps[naatId];

      await AsyncStorage.setItem(
        STORAGE_KEYS.WATCH_HISTORY,
        JSON.stringify(history)
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.WATCH_HISTORY_TIMESTAMPS,
        JSON.stringify(timestamps)
      );
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "removeFromWatchHistory",
        naatId,
      });
      throw new AppError(
        "Failed to remove from watch history.",
        ErrorCode.STORAGE_ERROR,
        true
      );
    }
  }

  /**
   * Clear all watch history
   */
  async clearWatchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY);
      await AsyncStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY_TIMESTAMPS);
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "clearWatchHistory",
      });
      throw new AppError(
        "Failed to clear watch history.",
        ErrorCode.STORAGE_ERROR,
        true
      );
    }
  }

  /**
   * Save For You session order
   * @param naatIds - Array of naat IDs in session order
   */
  async saveForYouSession(naatIds: string[]): Promise<void> {
    try {
      const sessionData = {
        naatIds,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        STORAGE_KEYS.FOR_YOU_SESSION,
        JSON.stringify(sessionData)
      );
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "saveForYouSession",
      });
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Get For You session order (if still valid)
   * @returns Array of naat IDs or null if session expired
   */
  async getForYouSession(): Promise<string[] | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FOR_YOU_SESSION);
      if (!data) return null;

      const sessionData = JSON.parse(data);
      const age = Date.now() - sessionData.timestamp;

      // Session expires after 1 hour
      if (age > 60 * 60 * 1000) {
        await AsyncStorage.removeItem(STORAGE_KEYS.FOR_YOU_SESSION);
        return null;
      }

      return sessionData.naatIds;
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "getForYouSession",
      });
      return null;
    }
  }

  /**
   * Clear For You session
   */
  async clearForYouSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.FOR_YOU_SESSION);
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "clearForYouSession",
      });
    }
  }
}

// Export a singleton instance
export const storageService = new StorageService();
