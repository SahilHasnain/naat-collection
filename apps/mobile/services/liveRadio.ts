/**
 * Live Radio Service
 *
 * Manages the 24/7 live naat radio feature with synchronized playback
 */

import { appwriteConfig } from "@/config/appwrite";
import { LiveRadioState } from "@/types/live-radio";
import { Naat } from "@naat-collection/shared";
import {
  Client,
  Databases,
  RealtimeResponseEvent,
} from "react-native-appwrite";

const LIVE_RADIO_COLLECTION_ID = "live_radio";
const LIVE_RADIO_DOCUMENT_ID = "current_state";

class LiveRadioService {
  private client: Client;
  private databases: Databases;

  constructor() {
    this.client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);

    this.databases = new Databases(this.client);
  }

  /**
   * Get the current live radio state
   */
  async getCurrentState(): Promise<LiveRadioState | null> {
    try {
      const response = await this.databases.getDocument(
        appwriteConfig.databaseId,
        LIVE_RADIO_COLLECTION_ID,
        LIVE_RADIO_DOCUMENT_ID,
      );

      return response as unknown as LiveRadioState;
    } catch (error) {
      console.error("[LiveRadio] Error fetching current state:", error);
      return null;
    }
  }

  /**
   * Get the current naat details
   */
  async getCurrentNaat(naatId: string): Promise<Naat | null> {
    try {
      const response = await this.databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.naatsCollectionId,
        naatId,
      );

      return response as unknown as Naat;
    } catch (error) {
      console.error("[LiveRadio] Error fetching naat:", error);
      return null;
    }
  }

  /**
   * Calculate the current playback position based on start time
   */
  calculatePlaybackPosition(startedAt: string, duration: number): number {
    const startTime = new Date(startedAt).getTime();
    const now = Date.now();
    const elapsed = now - startTime;

    // If elapsed time exceeds duration, the naat should have ended
    if (elapsed >= duration) {
      return duration; // Return full duration to trigger next track
    }

    return Math.max(0, elapsed);
  }

  /**
   * Subscribe to live radio state changes using Appwrite Realtime
   */
  subscribeToChanges(callback: (state: LiveRadioState) => void): () => void {
    const unsubscribe = this.client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${LIVE_RADIO_COLLECTION_ID}.documents`,
      (response: RealtimeResponseEvent<LiveRadioState>) => {
        if (
          response.events.includes(
            `databases.*.collections.*.documents.${LIVE_RADIO_DOCUMENT_ID}.update`,
          )
        ) {
          callback(response.payload);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }

  /**
   * Get approximate listener count (users who accessed live radio recently)
   * This is a simple implementation - can be enhanced with proper analytics
   */
  async getListenerCount(): Promise<number> {
    // For now, return a placeholder
    // In production, you'd track this with analytics or a separate collection
    return Math.floor(Math.random() * 50) + 10; // Random 10-60 for demo
  }

  /**
   * Get the next naats in the playlist
   */
  async getPlaylist(naatIds: string[]): Promise<Naat[]> {
    try {
      const naats: Naat[] = [];

      for (const id of naatIds.slice(0, 5)) {
        // Get next 5
        const naat = await this.getCurrentNaat(id);
        if (naat) {
          naats.push(naat);
        }
      }

      return naats;
    } catch (error) {
      console.error("[LiveRadio] Error fetching playlist:", error);
      return [];
    }
  }
}

export const liveRadioService = new LiveRadioService();
