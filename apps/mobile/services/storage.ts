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
  FAVORITE_NAAT_IDS: "@naat_favorite_ids",
  FAVORITE_SYNC_QUEUE: "@naat_favorite_sync_queue",
  HISTORY_SYNC_QUEUE: "@naat_history_sync_queue",
  HISTORY_CLEARED_AT: "@naat_history_cleared_at",
  DEVICE_ID: "@naat_device_id",
  FOR_YOU_SESSION: "@naat_for_you_session",
} as const;

/**
 * Maximum number of recent positions to maintain
 */
const MAX_RECENT_POSITIONS = 10;

/**
 * Maximum number of watch history items to maintain
 */
export const MAX_WATCH_HISTORY = 100;

export interface FavoriteSyncEvent {
  naatId: string;
  isFavorite: boolean;
  clientUpdatedAt: string;
  deviceId: string;
}

export interface HistorySyncEvent {
  /** Naat document ID, or "*" for a clear-all marker. */
  naatId: string;
  isRemoved: boolean;
  /** Epoch ms of the watch (or of the clear-all for "*" events). */
  watchedAt: number;
  clientUpdatedAt: string;
  deviceId: string;
}

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

  async getFavoriteNaatIds(): Promise<string[]> {
    try {
      const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_NAAT_IDS);
      if (!storedIds) return [];

      const parsedIds: unknown = JSON.parse(storedIds);
      return Array.isArray(parsedIds)
        ? parsedIds.filter((id): id is string => typeof id === "string")
        : [];
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "getFavoriteNaatIds",
      });
      return [];
    }
  }

  async setFavoriteNaat(naatId: string, isFavorite: boolean): Promise<void> {
    try {
      const favoriteIds = new Set(await this.getFavoriteNaatIds());
      if (isFavorite) {
        favoriteIds.add(naatId);
      } else {
        favoriteIds.delete(naatId);
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.FAVORITE_NAAT_IDS,
        JSON.stringify([...favoriteIds]),
      );
      await this.enqueueFavoriteSync({
        naatId,
        isFavorite,
        clientUpdatedAt: new Date().toISOString(),
        deviceId: await this.getDeviceId(),
      });
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "setFavoriteNaat",
        naatId,
        isFavorite,
      });
      throw new AppError(
        "Failed to update favorite.",
        ErrorCode.STORAGE_ERROR,
        true,
      );
    }
  }

  async setFavoriteNaatIds(naatIds: string[]): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.FAVORITE_NAAT_IDS,
      JSON.stringify([...new Set(naatIds)]),
    );
  }

  async getFavoriteSyncQueue(): Promise<FavoriteSyncEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_SYNC_QUEUE);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as FavoriteSyncEvent[]) : [];
    } catch {
      return [];
    }
  }

  async clearFavoriteSyncQueue(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.FAVORITE_SYNC_QUEUE);
  }

  private async enqueueFavoriteSync(event: FavoriteSyncEvent): Promise<void> {
    const queue = await this.getFavoriteSyncQueue();
    const nextQueue = [
      ...queue.filter((queuedEvent) => queuedEvent.naatId !== event.naatId),
      event,
    ];
    await AsyncStorage.setItem(
      STORAGE_KEYS.FAVORITE_SYNC_QUEUE,
      JSON.stringify(nextQueue),
    );
  }

  async getHistorySyncQueue(): Promise<HistorySyncEvent[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY_SYNC_QUEUE);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? (parsed as HistorySyncEvent[]) : [];
    } catch {
      return [];
    }
  }

  async clearHistorySyncQueue(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY_SYNC_QUEUE);
  }

  private async enqueueHistorySync(event: HistorySyncEvent): Promise<void> {
    const queue = await this.getHistorySyncQueue();
    // Merge by key: use "*" as-is (last write wins), else by naatId
    const nextQueue = [
      ...queue.filter((queuedEvent) => {
        if (event.naatId === "*") {
          return queuedEvent.naatId !== "*";
        }
        if (queuedEvent.naatId === "*") {
          return false;
        }
        return queuedEvent.naatId !== event.naatId;
      }),
      event,
    ];
    await AsyncStorage.setItem(
      STORAGE_KEYS.HISTORY_SYNC_QUEUE,
      JSON.stringify(nextQueue),
    );
  }

  async getHistoryClearedAt(): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY_CLEARED_AT);
      if (!data) return null;
      const value = Number(data);
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  async setHistoryClearedAt(clearedAt: number): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY_CLEARED_AT, String(clearedAt));
  }

  private async getDeviceId(): Promise<string> {
    const existingDeviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (existingDeviceId) return existingDeviceId;

    const deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    return deviceId;
  }

  private async queueCloudSync(): Promise<void> {
    try {
      const module = await import("@/services/cloudSync");
      const cloudSync = (module as any).cloudSyncService || (module as any).default;
      if (cloudSync?.scheduleCloudSync) {
        cloudSync.scheduleCloudSync();
      }
    } catch {
      // Ignore - cloud sync not available
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
  /**
   * Set watch history from cloud sync without re-enqueuing or scheduling sync
   */
  async setWatchHistoryFromSync(
    history: string[],
    timestamps: Record<string, number>,
  ): Promise<void> {
    try {
      const limitedHistory = history.slice(0, MAX_WATCH_HISTORY);
      const limitedTimestamps: Record<string, number> = {};
      for (const id of limitedHistory) {
        if (typeof timestamps[id] === "number") {
          limitedTimestamps[id] = timestamps[id];
        } else {
          limitedTimestamps[id] = Date.now();
        }
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.WATCH_HISTORY,
        JSON.stringify(limitedHistory),
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.WATCH_HISTORY_TIMESTAMPS,
        JSON.stringify(limitedTimestamps),
      );
    } catch (error) {
      logError(wrapError(error, ErrorCode.STORAGE_ERROR), {
        context: "setWatchHistoryFromSync",
      });
      throw new AppError(
        "Failed to apply synced watch history.",
        ErrorCode.STORAGE_ERROR,
        true,
      );
    }
  }

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

      const deviceId = await this.getDeviceId();
      await this.enqueueHistorySync({
        naatId,
        isRemoved: false,
        watchedAt: timestamps[naatId],
        clientUpdatedAt: new Date().toISOString(),
        deviceId,
      });
      void this.queueCloudSync();
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

      const deviceId = await this.getDeviceId();
      await this.enqueueHistorySync({
        naatId,
        isRemoved: true,
        watchedAt: Date.now(),
        clientUpdatedAt: new Date().toISOString(),
        deviceId,
      });
      void this.queueCloudSync();
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
      const clearedAt = Date.now();
      await this.setHistoryClearedAt(clearedAt);

      const deviceId = await this.getDeviceId();
      await this.enqueueHistorySync({
        naatId: "*",
        isRemoved: true,
        watchedAt: clearedAt,
        clientUpdatedAt: new Date().toISOString(),
        deviceId,
      });
      void this.queueCloudSync();
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
