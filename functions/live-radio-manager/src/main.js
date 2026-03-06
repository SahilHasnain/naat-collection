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
 * Normalize title for comparison
 */
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/official|video|hd|audio|version|lyrics|full|new|latest/gi, '')
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio (0-100)
 */
function similarityRatio(str1, str2) {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return maxLen === 0 ? 100 : ((maxLen - distance) / maxLen) * 100;
}

/**
 * Check if title is too similar to any in the list
 */
function isTooSimilar(title, seenTitles, threshold = 85) {
  const normalized = normalizeTitle(title);
  
  for (const seenTitle of seenTitles) {
    const similarity = similarityRatio(normalized, seenTitle);
    if (similarity >= threshold) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate a random playlist of naats
 */
async function generatePlaylist(databases, databaseId, naatsCollectionId) {
  const playlist = [];
  const seenIds = new Set();
  const seenTitles = []; // Track normalized titles for similarity check
  const MAX_DURATION = 1200; // 20 minutes in seconds
  const MAX_ATTEMPTS = PLAYLIST_SIZE * 3; // Prevent infinite loops

  // Get total count of naats under 20 minutes that are not excluded, have radio enabled, and have audioId
  const countResponse = await databases.listDocuments(
    databaseId,
    naatsCollectionId,
    [
      Query.limit(1),
      Query.lessThanEqual("duration", MAX_DURATION),
      Query.equal("radio", true),
      Query.isNotNull("audioId"),
      Query.or([
        Query.equal("exclude", false),
        Query.isNull("exclude")
      ])
    ],
  );

  const totalNaats = countResponse.total;

  if (totalNaats === 0) {
    throw new Error("No naats found with radio enabled, audioId present, under 20 minutes duration, and not excluded");
  }

  let attempts = 0;

  // Generate playlist with random naats, avoiding similar titles
  while (playlist.length < PLAYLIST_SIZE && attempts < MAX_ATTEMPTS) {
    attempts++;
    const randomOffset = Math.floor(Math.random() * totalNaats);

    const response = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [
        Query.limit(1),
        Query.offset(randomOffset),
        Query.lessThanEqual("duration", MAX_DURATION),
        Query.equal("radio", true),
        Query.isNotNull("audioId"),
        Query.or([
          Query.equal("exclude", false),
          Query.isNull("exclude")
        ]),
        Query.select(["$id", "title"]),
      ],
    );

    if (response.documents.length > 0) {
      const naat = response.documents[0];
      const naatId = naat.$id;
      const naatTitle = naat.title;

      // Skip if already added
      if (seenIds.has(naatId)) {
        continue;
      }

      // Skip if title is too similar to existing ones (85% threshold)
      if (isTooSimilar(naatTitle, seenTitles, 85)) {
        console.log(`Skipping similar title: ${naatTitle}`);
        continue;
      }

      // Add to playlist
      playlist.push(naatId);
      seenIds.add(naatId);
      seenTitles.push(normalizeTitle(naatTitle));
    }
  }

  if (playlist.length < PLAYLIST_SIZE) {
    console.log(`Warning: Only generated ${playlist.length} unique tracks (target: ${PLAYLIST_SIZE})`);
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
  return updateLiveRadioStateWithTimestamp(
    databases,
    databaseId,
    currentTrackIndex,
    playlist,
    new Date().toISOString()
  );
}

/**
 * Initialize or update the live radio state with custom timestamp
 */
async function updateLiveRadioStateWithTimestamp(
  databases,
  databaseId,
  currentTrackIndex,
  playlist,
  timestamp,
) {
  try {
    const data = {
      currentTrackIndex,
      playlist,
      updatedAt: timestamp,
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

      // Get current track to calculate when it actually started
      const currentTrackId = currentState.playlist[currentState.currentTrackIndex];
      const currentTrack = await databases.getDocument(
        databaseId,
        naatsCollectionId,
        currentTrackId,
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

      // Calculate when the new track actually started
      // This accounts for the delay between when track finished and when function ran
      const lastUpdate = new Date(currentState.updatedAt).getTime();
      const now = Date.now();
      const elapsed = now - lastUpdate;
      const trackDuration = currentTrack.duration * 1000;
      
      // If we're late (elapsed > trackDuration), backdate the start time
      const newTrackStartTime = elapsed > trackDuration 
        ? new Date(lastUpdate + trackDuration).toISOString()
        : new Date().toISOString();
      
      log(`Track finished ${Math.floor(elapsed / 1000)}s ago, backdating start time by ${Math.floor((elapsed - trackDuration) / 1000)}s`);

      // Update state with corrected timestamp
      const state = await updateLiveRadioStateWithTimestamp(
        databases,
        databaseId,
        currentTrackIndex,
        playlist,
        newTrackStartTime,
      );

      // Get current track info for response
      const nextTrackId = playlist[currentTrackIndex];
      const nextTrack = await databases.getDocument(
        databaseId,
        naatsCollectionId,
        nextTrackId,
      );

      log(
        `Now playing: ${nextTrack.title} (${currentTrackIndex + 1}/${playlist.length})`,
      );

      return res.json({
        success: true,
        message: "Track advanced",
        advanced: true,
        currentTrack: {
          id: nextTrack.$id,
          title: nextTrack.title,
          duration: nextTrack.duration,
          index: currentTrackIndex,
        },
        playlistSize: playlist.length,
      });
    }

    // This code only runs for initialization (status.needsInit === true)
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
      message: "Radio initialized",
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
