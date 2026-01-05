import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlaybackPosition } from "../types";

/**
 * Storage keys used by the service
 */
const STORAGE_KEYS = {
  PLAYBACK_PREFIX: "@naat_playback_",
  RECENT_POSITIONS: "@naat_recent_positions",
} as const;

/**
 * Maximum number of recent positions to maintain
 */
const MAX_RECENT_POSITIONS = 10;

/**
 * Service for managing local storage operations
 * Handles playback position persistence using AsyncStorage
 */
export class StorageService implements StorageService {
  /**
   * Save playback position for a specific naat
   * @param naatId - Unique identifier for the naat
   * @param position - Playback position in seconds
   * @throws Error if storage operation fails
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
      console.error("Failed to save playback position:", error);
      throw new Error(`Failed to save playback position for naat ${naatId}`);
    }
  }

  /**
   * Retrieve saved playback position for a specific naat
   * @param naatId - Unique identifier for the naat
   * @returns Playback position in seconds, or null if not found
   * @throws Error if storage operation fails
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
      console.error("Failed to get playback position:", error);
      throw new Error(
        `Failed to retrieve playback position for naat ${naatId}`
      );
    }
  }

  /**
   * Clear saved playback position for a specific naat
   * @param naatId - Unique identifier for the naat
   * @throws Error if storage operation fails
   */
  async clearPlaybackPosition(naatId: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.PLAYBACK_PREFIX}${naatId}`;
      await AsyncStorage.removeItem(key);
      await this.removeFromRecentPositions(naatId);
    } catch (error) {
      console.error("Failed to clear playback position:", error);
      throw new Error(`Failed to clear playback position for naat ${naatId}`);
    }
  }

  /**
   * Get list of recent playback positions
   * @returns Array of PlaybackPosition objects, limited to 10 most recent
   * @throws Error if storage operation fails
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
      console.error("Failed to get recent positions:", error);
      throw new Error("Failed to retrieve recent playback positions");
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
      console.error("Failed to update recent positions:", error);
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
      console.error("Failed to remove from recent positions:", error);
      // Don't throw here as this is a secondary operation
    }
  }
}

// Export a singleton instance
export const storageService = new StorageService();
