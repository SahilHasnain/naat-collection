/**
 * Appwrite Function: Video Ingestion Service
 *
 * This function fetches naat videos from a YouTube channel and stores them
 * in the Appwrite database. It runs on a scheduled basis (cron job) to keep
 * the content library updated.
 *
 * Environment Variables Required:
 * - APPWRITE_FUNCTION_PROJECT_ID: Appwrite project ID (auto-provided)
 * - APPWRITE_API_KEY: API key with database write permissions
 * - APPWRITE_DATABASE_ID: Database ID
 * - APPWRITE_NAATS_COLLECTION_ID: Naats collection ID
 * - YOUTUBE_CHANNEL_ID: YouTube channel ID to fetch videos from
 * - YOUTUBE_API_KEY: YouTube Data API v3 key
 * - CHANNEL_NAME: Name of the channel (default: "Unknown Channel")
 */

import { Client, Databases, ID, Query } from "node-appwrite";

/**
 * Fetches videos from a YouTube channel using YouTube Data API v3
 * Stops fetching when it encounters a video that's already stored
 * @param {string} channelId - YouTube channel ID
 * @param {string} apiKey - YouTube API key
 * @param {number} maxResults - Maximum number of new videos to fetch
 * @param {Set<string>} storedVideoIds - Set of already stored YouTube video IDs
 * @returns {Promise<Array>} Array of new video objects
 */
async function fetchYouTubeVideos(
  channelId,
  apiKey,
  maxResults = 50,
  storedVideoIds = new Set()
) {
  const baseUrl = "https://www.googleapis.com/youtube/v3";

  try {
    // First, get the uploads playlist ID for the channel
    const channelResponse = await fetch(
      `${baseUrl}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
    );

    if (!channelResponse.ok) {
      throw new Error(
        `YouTube API error: ${channelResponse.status} ${channelResponse.statusText}`
      );
    }

    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const uploadsPlaylistId =
      channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Fetch videos in batches, stopping when we hit an already-stored video
    const newVideoItems = [];
    let pageToken = null;
    let shouldContinue = true;
    let consecutiveStoredCount = 0;

    while (shouldContinue && newVideoItems.length < maxResults) {
      let playlistUrl = `${baseUrl}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`;

      if (pageToken) {
        playlistUrl += `&pageToken=${pageToken}`;
      }

      const playlistResponse = await fetch(playlistUrl);

      if (!playlistResponse.ok) {
        throw new Error(
          `YouTube API error: ${playlistResponse.status} ${playlistResponse.statusText}`
        );
      }

      const playlistData = await playlistResponse.json();

      if (!playlistData.items || playlistData.items.length === 0) {
        break;
      }

      for (const item of playlistData.items) {
        const videoId = item.contentDetails.videoId;

        // If we've seen this video before, increment counter
        if (storedVideoIds.has(videoId)) {
          consecutiveStoredCount++;
          // Stop if we've hit 3 consecutive stored videos (we've caught up)
          if (consecutiveStoredCount >= 3) {
            shouldContinue = false;
            break;
          }
          continue;
        }

        // Reset counter when we find a new video
        consecutiveStoredCount = 0;
        newVideoItems.push(item);

        if (newVideoItems.length >= maxResults) {
          shouldContinue = false;
          break;
        }
      }

      pageToken = playlistData.nextPageToken;
      if (!pageToken) {
        shouldContinue = false;
      }
    }

    if (newVideoItems.length === 0) {
      return [];
    }

    // Get video IDs to fetch full details
    const videoIds = newVideoItems
      .map((item) => item.contentDetails.videoId)
      .join(",");

    const videosResponse = await fetch(
      `${baseUrl}/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${apiKey}`
    );

    if (!videosResponse.ok) {
      throw new Error(
        `YouTube API error: ${videosResponse.status} ${videosResponse.statusText}`
      );
    }

    const videosData = await videosResponse.json();

    return videosData.items.map((video) => ({
      youtubeId: video.id,
      title: video.snippet.title,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnailUrl:
        video.snippet.thumbnails.high?.url ||
        video.snippet.thumbnails.medium?.url ||
        video.snippet.thumbnails.default?.url,
      duration: parseDuration(video.contentDetails.duration),
      uploadDate: video.snippet.publishedAt,
      views: parseInt(video.statistics?.viewCount || "0", 10),
    }));
  } catch (error) {
    throw new Error(`Failed to fetch YouTube videos: ${error.message}`);
  }
}

/**
 * Parses ISO 8601 duration format (PT#H#M#S) to seconds
 * @param {string} duration - ISO 8601 duration string
 * @returns {number} Duration in seconds
 */
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) {
    return 0;
  }

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Gets the most recent video's YouTube ID from the database
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @returns {Promise<Set<string>>} Set of all stored YouTube IDs
 */
async function getStoredVideoIds(databases, databaseId, collectionId) {
  try {
    const storedIds = new Set();
    let cursor = null;
    let hasMore = true;

    // Fetch all stored video IDs using pagination
    while (hasMore) {
      const queries = [Query.select(["youtubeId"]), Query.limit(100)];
      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }

      const result = await databases.listDocuments(
        databaseId,
        collectionId,
        queries
      );

      for (const doc of result.documents) {
        storedIds.add(doc.youtubeId);
      }

      if (result.documents.length < 100) {
        hasMore = false;
      } else {
        cursor = result.documents[result.documents.length - 1].$id;
      }
    }

    return storedIds;
  } catch (error) {
    throw new Error(`Failed to get stored video IDs: ${error.message}`);
  }
}

/**
 * Inserts a new video into the database
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @param {Object} video - Video object
 * @param {string} channelName - Channel name
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Created document
 */
async function insertVideo(
  databases,
  databaseId,
  collectionId,
  video,
  channelName,
  channelId
) {
  try {
    const document = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      {
        title: video.title,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        uploadDate: video.uploadDate,
        channelName: channelName,
        channelId: channelId,
        youtubeId: video.youtubeId,
        views: video.views,
      }
    );

    return document;
  } catch (error) {
    throw new Error(`Failed to insert video: ${error.message}`);
  }
}

/**
 * Main function handler
 * @param {Object} context - Appwrite function context
 * @returns {Object} Response object
 */
export default async ({ req, res, log, error: logError }) => {
  try {
    log("Starting video ingestion process...");

    // Validate environment variables
    const requiredEnvVars = [
      "APPWRITE_FUNCTION_PROJECT_ID",
      "APPWRITE_API_KEY",
      "APPWRITE_DATABASE_ID",
      "APPWRITE_NAATS_COLLECTION_ID",
      "YOUTUBE_CHANNEL_ID",
      "YOUTUBE_API_KEY",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      const errorMsg = `Missing required environment variables: ${missingVars.join(", ")}`;
      logError(errorMsg);
      return res.json(
        {
          success: false,
          error: errorMsg,
        },
        500
      );
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(
        process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
      )
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_NAATS_COLLECTION_ID;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    const channelName = process.env.CHANNEL_NAME || "Baghdadi Sound and Video";

    // Get all stored video IDs to check against
    log("Fetching stored video IDs...");
    const storedVideoIds = await getStoredVideoIds(
      databases,
      databaseId,
      collectionId
    );

    log(`Found ${storedVideoIds.size} videos already in database.`);

    log(`Fetching videos from YouTube channel: ${channelId}`);

    // Fetch only new videos from YouTube
    const videos = await fetchYouTubeVideos(
      channelId,
      youtubeApiKey,
      50,
      storedVideoIds
    );

    log(`Found ${videos.length} new videos on YouTube`);

    // Process each video
    const results = {
      processed: videos.length,
      added: 0,
      errors: [],
    };

    for (const video of videos) {
      try {
        // Insert new video (already filtered for duplicates)
        await insertVideo(
          databases,
          databaseId,
          collectionId,
          video,
          channelName,
          channelId
        );

        log(`Added new video: ${video.title} (${video.youtubeId})`);
        results.added++;
      } catch (err) {
        const errorMsg = `Error processing video ${video.youtubeId}: ${err.message}`;
        logError(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    log("Video ingestion completed");
    log(`Summary: ${results.added} added, ${results.errors.length} errors`);

    return res.json({
      success: true,
      results: results,
    });
  } catch (err) {
    const errorMsg = `Fatal error during ingestion: ${err.message}`;
    logError(errorMsg);

    return res.json(
      {
        success: false,
        error: errorMsg,
      },
      500
    );
  }
};
