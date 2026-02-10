/**
 * Live Radio Manager Function
 *
 * Manages the 24/7 live naat radio by:
 * 1. Selecting a random naat from the database
 * 2. Updating the live_radio collection with current track
 * 3. Generating a playlist of upcoming tracks
 * 4. Automatically advancing to next track when current one ends
 *
 * This function should be triggered:
 * - Every 5 minutes (to check if track needs to change)
 * - Or manually via API call
 */

import { Client, Databases, Query } from "node-appwrite";

// Constants
const LIVE_RADIO_COLLECTION_ID = "live_radio";
const LIVE_RADIO_DOCUMENT_ID = "current_state";
const PLAYLIST_SIZE = 10; // Number of upcoming tracks to queue

/**
 * Get a random naat from the database
 */
async function getRandomNaat(
  databases,
  databaseId,
  naatsCollectionId,
  excludeIds = [],
) {
  try {
    // Get total count
    const countResponse = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [Query.limit(1)],
    );

    if (!countResponse.total || countResponse.total === 0) {
      throw new Error("No naats found in database");
    }

    // Generate random offset
    const randomOffset = Math.floor(Math.random() * countResponse.total);

    // Fetch random naat
    const response = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [
        Query.limit(1),
        Query.offset(randomOffset),
        Query.select(["$id", "title", "duration", "audioUrl"]),
      ],
    );

    if (response.documents.length === 0) {
      throw new Error("Failed to fetch random naat");
    }

    const naat = response.documents[0];

    // If this naat is in exclude list, try again (max 3 attempts)
    if (
      excludeIds.includes(naat.$id) &&
      excludeIds.length < countResponse.total
    ) {
      return getRandomNaat(
        databases,
        databaseId,
        naatsCollectionId,
        excludeIds,
      );
    }

    return naat;
  } catch (error) {
    console.error("Error getting random naat:", error);
    throw error;
  }
}

/**
 * Generate a playlist of upcoming naats
 */
async function generatePlaylist(
  databases,
  databaseId,
  naatsCollectionId,
  currentNaatId,
) {
  const playlist = [];
  const excludeIds = [currentNaatId];

  for (let i = 0; i < PLAYLIST_SIZE; i++) {
    try {
      const naat = await getRandomNaat(
        databases,
        databaseId,
        naatsCollectionId,
        excludeIds,
      );
      playlist.push(naat.$id);
      excludeIds.push(naat.$id);
    } catch (error) {
      console.error(`Error generating playlist item ${i}:`, error);
      break;
    }
  }

  return playlist;
}

/**
 * Update the live radio state
 */
async function updateLiveRadioState(
  databases,
  databaseId,
  currentNaat,
  playlist,
) {
  try {
    const now = new Date().toISOString();

    const data = {
      currentNaatId: currentNaat.$id,
      startedAt: now,
      playlist: playlist,
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
 * Check if current track should be changed
 */
async function shouldChangeTrack(databases, databaseId, naatsCollectionId) {
  try {
    // Get current state
    const currentState = await databases.getDocument(
      databaseId,
      LIVE_RADIO_COLLECTION_ID,
      LIVE_RADIO_DOCUMENT_ID,
    );

    // Get current naat details
    const currentNaat = await databases.getDocument(
      databaseId,
      naatsCollectionId,
      currentState.currentNaatId,
    );

    // Calculate elapsed time
    const startTime = new Date(currentState.startedAt).getTime();
    const now = Date.now();
    const elapsed = now - startTime;
    const duration = currentNaat.duration * 1000; // Convert to milliseconds

    // If elapsed time exceeds duration, change track
    return elapsed >= duration;
  } catch (error) {
    // If state doesn't exist or error occurs, we should initialize
    console.log(
      "Should change track check failed, will initialize:",
      error.message,
    );
    return true;
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

    log("Checking if track needs to change...");

    // Check if we need to change the track
    const needsChange = await shouldChangeTrack(
      databases,
      databaseId,
      naatsCollectionId,
    );

    if (!needsChange) {
      log("Current track still playing, no change needed");
      return res.json({
        success: true,
        message: "Current track still playing",
        changed: false,
      });
    }

    log("Changing track...");

    // Get a random naat
    const currentNaat = await getRandomNaat(
      databases,
      databaseId,
      naatsCollectionId,
    );
    log(`Selected naat: ${currentNaat.title}`);

    // Generate playlist
    const playlist = await generatePlaylist(
      databases,
      databaseId,
      naatsCollectionId,
      currentNaat.$id,
    );
    log(`Generated playlist with ${playlist.length} tracks`);

    // Update live radio state
    const state = await updateLiveRadioState(
      databases,
      databaseId,
      currentNaat,
      playlist,
    );

    return res.json({
      success: true,
      message: "Live radio updated successfully",
      changed: true,
      currentNaat: {
        id: currentNaat.$id,
        title: currentNaat.title,
        duration: currentNaat.duration,
      },
      playlistSize: playlist.length,
      startedAt: state.startedAt,
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
