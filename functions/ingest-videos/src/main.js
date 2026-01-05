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
 * - RECITER_NAME: Name of the reciter (default: "Unknown Reciter")
 * - RECITER_ID: ID of the reciter (default: "default-reciter")
 */

import { Client, Databases, ID, Query } from "node-appwrite";

/**
 * Fetches videos from a YouTube channel using YouTube Data API v3
 * @param {string} channelId - YouTube channel ID
 * @param {string} apiKey - YouTube API key
 * @param {number} maxResults - Maximum number of videos to fetch
 * @returns {Promise<Array>} Array of video objects
 */
async function fetchYouTubeVideos(channelId, apiKey, maxResults = 50) {
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

    // Fetch videos from the uploads playlist
    const playlistResponse = await fetch(
      `${baseUrl}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`
    );

    if (!playlistResponse.ok) {
      throw new Error(
        `YouTube API error: ${playlistResponse.status} ${playlistResponse.statusText}`
      );
    }

    const playlistData = await playlistResponse.json();

    if (!playlistData.items || playlistData.items.length === 0) {
      return [];
    }

    // Get video IDs to fetch durations
    const videoIds = playlistData.items
      .map((item) => item.contentDetails.videoId)
      .join(",");

    // Fetch video details including duration
    const videosResponse = await fetch(
      `${baseUrl}/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`
    );

    if (!videosResponse.ok) {
      throw new Error(
        `YouTube API error: ${videosResponse.status} ${videosResponse.statusText}`
      );
    }

    const videosData = await videosResponse.json();

    // Transform the data into our format
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
 * Checks if a video already exists in the database
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @param {string} youtubeId - YouTube video ID
 * @returns {Promise<boolean>} True if video exists, false otherwise
 */
async function videoExists(databases, databaseId, collectionId, youtubeId) {
  try {
    const result = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("youtubeId", youtubeId),
      Query.limit(1),
    ]);

    return result.documents.length > 0;
  } catch (error) {
    throw new Error(`Failed to check video existence: ${error.message}`);
  }
}

/**
 * Inserts a new video into the database
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @param {Object} video - Video object
 * @param {string} reciterName - Reciter name
 * @param {string} reciterId - Reciter ID
 * @returns {Promise<Object>} Created document
 */
async function insertVideo(
  databases,
  databaseId,
  collectionId,
  video,
  reciterName,
  reciterId
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
        reciterName: reciterName,
        reciterId: reciterId,
        youtubeId: video.youtubeId,
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
    const reciterName = process.env.RECITER_NAME || "Unknown Reciter";
    const reciterId = process.env.RECITER_ID || "default-reciter";

    log(`Fetching videos from YouTube channel: ${channelId}`);

    // Fetch videos from YouTube
    const videos = await fetchYouTubeVideos(channelId, youtubeApiKey);

    log(`Found ${videos.length} videos on YouTube`);

    // Process each video
    const results = {
      processed: videos.length,
      added: 0,
      skipped: 0,
      errors: [],
    };

    for (const video of videos) {
      try {
        // Check if video already exists
        const exists = await videoExists(
          databases,
          databaseId,
          collectionId,
          video.youtubeId
        );

        if (exists) {
          log(`Skipping existing video: ${video.title} (${video.youtubeId})`);
          results.skipped++;
          continue;
        }

        // Insert new video
        await insertVideo(
          databases,
          databaseId,
          collectionId,
          video,
          reciterName,
          reciterId
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
    log(
      `Summary: ${results.added} added, ${results.skipped} skipped, ${results.errors.length} errors`
    );

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
