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
   * Get current track ID from state
   */
  getCurrentTrackId(state: LiveRadioState): string | null {
    if (!state.playlist || state.playlist.length === 0) {
      return null;
    }
    return state.playlist[state.currentTrackIndex] || null;
  }

  /**
   * Get next track ID from state
   */
  getNextTrackId(state: LiveRadioState): string | null {
    if (!state.playlist || state.playlist.length === 0) {
      return null;
    }
    const nextIndex = (state.currentTrackIndex + 1) % state.playlist.length;
    return state.playlist[nextIndex] || null;
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
   * Get upcoming naats from playlist
   */
  async getUpcomingNaats(
    state: LiveRadioState,
    count: number = 5,
  ): Promise<Naat[]> {
    try {
      const naats: Naat[] = [];
      const playlistLength = state.playlist.length;

      for (let i = 1; i <= count && i < playlistLength; i++) {
        const index = (state.currentTrackIndex + i) % playlistLength;
        const naatId = state.playlist[index];
        const naat = await this.getCurrentNaat(naatId);
        if (naat) {
          naats.push(naat);
        }
      }

      return naats;
    } catch (error) {
      console.error("[LiveRadio] Error fetching upcoming naats:", error);
      return [];
    }
  }
}

export const liveRadioService = new LiveRadioService();
