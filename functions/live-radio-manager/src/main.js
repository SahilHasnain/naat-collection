/**
 * Live Radio Manager Function
 *
 * Simplified approach: Manages a rotating playlist
 * 1. Maintains a fixed playlist of naats
 * 2. Advances currentTrackIndex when track duration expires
 * 3. Clients play from beginning (no position sync)
 *
 * This function should be triggered every 3 minutes
 */

import { Client, Databases, Query } from "node-appwrite";

// Constants
const LIVE_RADIO_COLLECTION_ID = "live_radio";
const LIVE_RADIO_DOCUMENT_ID = "current_state";
const PLAYLIST_SIZE = 50; // Fixed rotating playlist

/**
 * Generate a random playlist of naats
 */
async function generatePlaylist(databases, databaseId, naatsCollectionId) {
  const playlist = [];
  const seenIds = new Set();
  const MAX_DURATION = 3600; // 1 hour in seconds

  // Get total count of naats under 1 hour
  const countResponse = await databases.listDocuments(
    databaseId,
    naatsCollectionId,
    [Query.limit(1), Query.lessThanEqual("duration", MAX_DURATION)],
  );

  const totalNaats = countResponse.total;

  if (totalNaats === 0) {
    throw new Error("No naats found in database under 1 hour duration");
  }

  // Generate playlist with random naats
  for (let i = 0; i < PLAYLIST_SIZE && seenIds.size < totalNaats; i++) {
    const randomOffset = Math.floor(Math.random() * totalNaats);

    const response = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [
        Query.limit(1),
        Query.offset(randomOffset),
        Query.lessThanEqual("duration", MAX_DURATION),
        Query.select(["$id"]),
      ],
    );

    if (response.documents.length > 0) {
      const naatId = response.documents[0].$id;
      if (!seenIds.has(naatId)) {
        playlist.push(naatId);
        seenIds.add(naatId);
      }
    }
  }

  return playlist;
}

/**
 * Initialize or update the live radio state
 */
async function updateLiveRadioState(
  databases,
  databaseId,
  currentTrackIndex,
  playlist,
) {
  try {
    const now = new Date().toISOString();

    const data = {
      currentTrackIndex,
      playlist,
      updatedAt: now,
    };

    // Try to update existing document
    try {
      await databases.updateDocument(
        databaseId,
        LIVE_RADIO_COLLECTION_ID,
        LIVE_RADIO_DOCUMENT_ID,
        data,
      );
      console.log("Updated live radio state");
    } catch (updateError) {
      // If document doesn't exist, create it
      if (updateError.code === 404) {
        await databases.createDocument(
          databaseId,
          LIVE_RADIO_COLLECTION_ID,
          LIVE_RADIO_DOCUMENT_ID,
          data,
        );
        console.log("Created live radio state");
      } else {
        throw updateError;
      }
    }

    return data;
  } catch (error) {
    console.error("Error updating live radio state:", error);
    throw error;
  }
}

/**
 * Check if current track should advance to next
 */
async function shouldAdvanceTrack(databases, databaseId, naatsCollectionId) {
  try {
    // Get current state
    const currentState = await databases.getDocument(
      databaseId,
      LIVE_RADIO_COLLECTION_ID,
      LIVE_RADIO_DOCUMENT_ID,
    );

    // Get current track from playlist
    const currentTrackId =
      currentState.playlist[currentState.currentTrackIndex];

    if (!currentTrackId) {
      console.log("No current track, needs initialization");
      return { shouldAdvance: true, needsInit: true };
    }

    // Get track details
    const currentTrack = await databases.getDocument(
      databaseId,
      naatsCollectionId,
      currentTrackId,
    );

    // Calculate time since last update
    const lastUpdate = new Date(currentState.updatedAt).getTime();
    const now = Date.now();
    const elapsed = now - lastUpdate;
    const duration = currentTrack.duration * 1000; // Convert to milliseconds

    // Advance if elapsed time exceeds track duration
    return {
      shouldAdvance: elapsed >= duration,
      needsInit: false,
      elapsed,
      duration,
    };
  } catch (error) {
    console.log(
      "Error checking track status, needs initialization:",
      error.message,
    );
    return { shouldAdvance: true, needsInit: true };
  }
}

/**
 * Main function handler
 */
export default async ({ req, res, log, error }) => {
  try {
    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const naatsCollectionId = process.env.APPWRITE_NAATS_COLLECTION_ID;

    log("Checking if track needs to advance...");

    // Check if we need to advance the track
    const status = await shouldAdvanceTrack(
      databases,
      databaseId,
      naatsCollectionId,
    );

    if (!status.shouldAdvance && !status.needsInit) {
      log(
        `Current track still playing (${Math.floor(status.elapsed / 1000)}s / ${Math.floor(status.duration / 1000)}s)`,
      );
      return res.json({
        success: true,
        message: "Current track still playing",
        advanced: false,
      });
    }

    let currentTrackIndex = 0;
    let playlist = [];

    if (status.needsInit) {
      log("Initializing radio with new playlist...");
      // Generate new playlist
      playlist = await generatePlaylist(
        databases,
        databaseId,
        naatsCollectionId,
      );
      currentTrackIndex = 0;
    } else {
      log("Advancing to next track...");
      // Get current state and advance
      const currentState = await databases.getDocument(
        databaseId,
        LIVE_RADIO_COLLECTION_ID,
        LIVE_RADIO_DOCUMENT_ID,
      );

      playlist = currentState.playlist;
      currentTrackIndex =
        (currentState.currentTrackIndex + 1) % playlist.length;

      // If we've wrapped around to the beginning, generate a fresh playlist
      if (currentTrackIndex === 0) {
        log("Playlist completed, generating fresh playlist...");
        playlist = await generatePlaylist(
          databases,
          databaseId,
          naatsCollectionId,
        );
      }
    }

    // Update state
    const state = await updateLiveRadioState(
      databases,
      databaseId,
      currentTrackIndex,
      playlist,
    );

    // Get current track info for response
    const currentTrackId = playlist[currentTrackIndex];
    const currentTrack = await databases.getDocument(
      databaseId,
      naatsCollectionId,
      currentTrackId,
    );

    log(
      `Now playing: ${currentTrack.title} (${currentTrackIndex + 1}/${playlist.length})`,
    );

    return res.json({
      success: true,
      message: status.needsInit ? "Radio initialized" : "Track advanced",
      advanced: true,
      currentTrack: {
        id: currentTrack.$id,
        title: currentTrack.title,
        duration: currentTrack.duration,
        index: currentTrackIndex,
      },
      playlistSize: playlist.length,
    });
  } catch (err) {
    error("Error in live radio manager:", err);
    return res.json(
      {
        success: false,
        error: err.message,
      },
      500,
    );
  }
};
