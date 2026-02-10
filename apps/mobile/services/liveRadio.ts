/**
 * Live Radio Service
 *
 * Manages the 24/7 live naat radio feature with synchronized playback
 * Uses Appwrite SDK for reliable database access
 */

import { appwriteConfig } from "@/config/appwrite";
import { appwriteService } from "@/services/appwrite";
import { LiveRadioState } from "@/types/live-radio";
import { Naat } from "@naat-collection/shared";
import { Client, Databases } from "appwrite";

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
   * Get the current naat details using existing appwriteService
   */
  async getCurrentNaat(naatId: string): Promise<Naat | null> {
    try {
      return await appwriteService.getNaatById(naatId);
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
    const channelName = `databases.${appwriteConfig.databaseId}.collections.${LIVE_RADIO_COLLECTION_ID}.documents`;

    const unsubscribe = this.client.subscribe(channelName, (response: any) => {
      // Check if this is an update event for our document
      const events = response.events || [];
      const isUpdate = events.some(
        (event: string) => event.includes("update") || event.includes("create"),
      );

      if (isUpdate && response.payload) {
        console.log("[LiveRadio] Received realtime update");
        callback(response.payload as LiveRadioState);
      }
    });

    return () => {
      unsubscribe();
    };
  }

  /**
   * Get approximate listener count
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

  /**
   * Update the live radio state (for client-side track advancement)
   */
  async updateLiveRadioState(data: {
    currentNaatId: string;
    startedAt: string;
    playlist: string[];
    updatedAt: string;
  }): Promise<void> {
    try {
      await this.databases.updateDocument(
        appwriteConfig.databaseId,
        LIVE_RADIO_COLLECTION_ID,
        LIVE_RADIO_DOCUMENT_ID,
        data,
      );
      console.log("[LiveRadio] State updated successfully");
    } catch (error) {
      console.error("[LiveRadio] Error updating state:", error);
      throw error;
    }
  }
}

export const liveRadioService = new LiveRadioService();
