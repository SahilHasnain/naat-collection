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
import { Client, Databases, Query } from "appwrite";
import { Platform } from 'react-native';

const LIVE_RADIO_COLLECTION_ID = "live_radio";
const LIVE_RADIO_DOCUMENT_ID = "current_state";
const LISTENERS_COLLECTION_ID = "live_radio_listeners";
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const LISTENER_TIMEOUT = 60000; // 60 seconds (consider offline after this)

// Polyfill localStorage for React Native to suppress Appwrite SDK warnings
if (typeof window !== 'undefined' && !window.localStorage) {
  const storage = new Map();
  (window as any).localStorage = {
    getItem: (key: string) => storage.get(key) || null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
}

class LiveRadioService {
  private client: Client;
  private databases: Databases;
  private realtimeUnsubscribe: (() => void) | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listenerId: string | null = null;

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
   * Parse a playlist entry to extract the naat ID.
   * Supports pipe-delimited format (naatId|audioId|hasCutAudio) and plain naat ID strings.
   */
  private parseNaatId(entry: string): string {
    if (entry.includes('|')) {
      return entry.split('|')[0];
    }
    return entry;
  }

  /**
   * Get current track ID from state
   */
  getCurrentTrackId(state: LiveRadioState): string | null {
    if (!state.playlist || state.playlist.length === 0) {
      return null;
    }
    const entry = state.playlist[state.currentTrackIndex];
    return entry ? this.parseNaatId(entry) : null;
  }
  /**
   * Parse a playlist entry to extract the naat ID.
   * Supports pipe-delimited format (naatId|audioId|hasCutAudio) and plain naat ID strings.
   */
  private parseNaatId(entry: string): string {
    if (entry.includes('|')) {
      return entry.split('|')[0];
    }
    return entry;
  }


  /**
   * Get next track ID from state
   */
  getNextTrackId(state: LiveRadioState): string | null {
    if (!state.playlist || state.playlist.length === 0) {
      return null;
    }
    const nextIndex = (state.currentTrackIndex + 1) % state.playlist.length;
    const entry = state.playlist[nextIndex];
    return entry ? this.parseNaatId(entry) : null;
  }

  /**
   * Subscribe to live radio state changes using Appwrite Realtime
   * Provides instant updates when server advances tracks
   */
  subscribeToChanges(callback: (state: LiveRadioState) => void): () => void {
    // Clean up any existing subscription
    if (this.realtimeUnsubscribe) {
      this.realtimeUnsubscribe();
    }

    try {
      // Subscribe to the specific document using Realtime
      const channel = `databases.${appwriteConfig.databaseId}.collections.${LIVE_RADIO_COLLECTION_ID}.documents.${LIVE_RADIO_DOCUMENT_ID}`;
      
      console.log("[LiveRadio] Subscribing to realtime updates:", channel);

      const unsubscribe = this.client.subscribe(channel, (response) => {
        console.log("[LiveRadio] Realtime update received:", response.events);
        
        // Check if this is an update event
        if (response.events.some(event => event.includes('.update'))) {
          const updatedState = response.payload as unknown as LiveRadioState;
          console.log("[LiveRadio] Track changed via realtime to index:", updatedState.currentTrackIndex);
          callback(updatedState);
        }
      });

      this.realtimeUnsubscribe = unsubscribe;
      return unsubscribe;
    } catch (error) {
      console.error("[LiveRadio] Error setting up realtime subscription:", error);
      
      // Fallback to polling if realtime fails
      console.log("[LiveRadio] Falling back to polling mode");
      return this.subscribeToChangesPolling(callback);
    }
  }

  /**
   * Fallback polling method if Realtime fails
   */
  private subscribeToChangesPolling(callback: (state: LiveRadioState) => void): () => void {
    let isActive = true;
    let lastTrackIndex: number | null = null;

    const pollInterval = setInterval(async () => {
      if (!isActive) return;

      try {
        const state = await this.getCurrentState();
        if (state && state.currentTrackIndex !== lastTrackIndex) {
          console.log("[LiveRadio] Track changed via polling");
          lastTrackIndex = state.currentTrackIndex;
          callback(state);
        }
      } catch (error) {
        console.error("[LiveRadio] Error polling for changes:", error);
      }
    }, 10000); // Poll every 10 seconds as fallback

    return () => {
      isActive = false;
      clearInterval(pollInterval);
    };
  }

  /**
   * Get real-time listener count
   * Counts active listeners (heartbeat within last 60 seconds)
   */
  async getListenerCount(): Promise<number> {
    try {
      // Calculate cutoff time (60 seconds ago)
      const cutoffTime = new Date(Date.now() - LISTENER_TIMEOUT).toISOString();

      // Query for active listeners
      const response = await this.databases.listDocuments(
        appwriteConfig.databaseId,
        LISTENERS_COLLECTION_ID,
        [
          Query.greaterThan('lastHeartbeat', cutoffTime),
          Query.limit(100), // Limit to prevent large queries
        ]
      );

      return response.total;
    } catch (error) {
      console.error("[LiveRadio] Error fetching listener count:", error);
      // Return placeholder if collection doesn't exist yet
      return 0;
    }
  }

  /**
   * Get or create a persistent listener ID for this device
   * Uses a shorter, valid format that stays consistent per session
   */
  private async getListenerId(): Promise<string> {
    if (this.listenerId) {
      return this.listenerId;
    }

    // Generate a session-based ID that's valid for Appwrite (max 36 chars)
    // Format: listener_<platform>_<timestamp>_<random>
    const platform = Platform.OS.substring(0, 3); // "ios" or "and"
    const timestamp = Date.now().toString(36); // Base36 is shorter
    const random = Math.random().toString(36).substring(2, 8); // 6 chars
    
    // Total length: 9 + 3 + 1 + ~8 + 1 + 6 = ~28 chars (well under 36)
    this.listenerId = `listener_${platform}_${timestamp}_${random}`;
    
    console.log("[LiveRadio] Generated new listener ID:", this.listenerId);
    return this.listenerId;
  }

  /**
   * Register this device as an active listener
   * Creates or updates listener document with heartbeat
   */
  async registerListener(): Promise<void> {
    try {
      // Get or create listener ID
      const listenerId = await this.getListenerId();

      const now = new Date().toISOString();
      const deviceInfo = `${Platform.OS} ${Platform.Version}`;

      try {
        // Try to update existing document
        await this.databases.updateDocument(
          appwriteConfig.databaseId,
          LISTENERS_COLLECTION_ID,
          listenerId,
          {
            lastHeartbeat: now,
            deviceInfo,
          }
        );
        console.log("[LiveRadio] Updated heartbeat for listener:", listenerId);
      } catch (error: any) {
        // If document doesn't exist, create it
        if (error.code === 404) {
          await this.databases.createDocument(
            appwriteConfig.databaseId,
            LISTENERS_COLLECTION_ID,
            listenerId,
            {
              lastHeartbeat: now,
              deviceInfo,
            }
          );
          console.log("[LiveRadio] Registered as listener:", listenerId);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("[LiveRadio] Error registering listener:", error);
    }
  }

  /**
   * Start sending heartbeats to track active listening
   */
  startHeartbeat(): void {
    // Register immediately
    this.registerListener();

    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.registerListener();
    }, HEARTBEAT_INTERVAL) as unknown as NodeJS.Timeout;

    console.log("[LiveRadio] Heartbeat started");
  }

  /**
   * Stop sending heartbeats and remove listener
   */
  async stopHeartbeat(): Promise<void> {
    // Clear interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log("[LiveRadio] Heartbeat interval cleared");
    }

    // Remove listener document
    if (this.listenerId) {
      try {
        console.log("[LiveRadio] Attempting to delete listener:", this.listenerId);
        await this.databases.deleteDocument(
          appwriteConfig.databaseId,
          LISTENERS_COLLECTION_ID,
          this.listenerId
        );
        console.log("[LiveRadio] Successfully unregistered listener:", this.listenerId);
      } catch (error: any) {
        console.error("[LiveRadio] Error unregistering listener:", error);
        console.error("[LiveRadio] Listener ID was:", this.listenerId);
      }
    } else {
      console.log("[LiveRadio] No listener ID to unregister");
    }
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
        const naatId = this.parseNaatId(state.playlist[index]);
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
