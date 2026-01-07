/**
 * Appwrite Function: Video Ingestion Service
 *
 * This function fetches naat videos from YouTube channels and stores them
 * in the Appwrite database. It runs on a scheduled basis (cron job) to keep
 * the content library updated.
 *
 * Environment Variables Required:
 * - APPWRITE_FUNCTION_PROJECT_ID: Appwrite project ID (auto-provided)
 * - APPWRITE_API_KEY: API key with database write permissions
 * - APPWRITE_DATABASE_ID: Database ID
 * - APPWRITE_NAATS_COLLECTION_ID: Naats collection ID
 * - YOUTUBE_CHANNEL_IDS: Comma-separated YouTube channel IDs to fetch videos from
 * - YOUTUBE_CHANNEL_ID: (Legacy) Single YouTube channel ID (fallback if YOUTUBE_CHANNEL_IDS not set)
 * - YOUTUBE_API_KEY: YouTube Data API v3 key
 */

import { Client, Databases, ID, Query } from "node-appwrite";

/**
 * Fetches videos from a YouTube channel using YouTube Data API v3
 * @param {string} channelId - YouTube channel ID
 * @param {string} apiKey - YouTube API key
 * @param {number} maxResults - Maximum number of videos to fetch
 * @param {Function} log - Logging function
 * @returns {Promise<Object>} Object containing channelId, channelName, and videos array
 */
async function fetchYouTubeVideos(channelId, apiKey, maxResults = 5000, log) {
  const baseUrl = "https://www.googleapis.com/youtube/v3";

  try {
    // First, get the uploads playlist ID and channel name for the channel
    const channelResponse = await fetch(
      `${baseUrl}/channels?part=contentDetails,snippet&id=${channelId}&key=${apiKey}`
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

    const channelName = channelData.items[0].snippet.title;
    const uploadsPlaylistId =
      channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Fetch videos from the uploads playlist with pagination
    const allVideoItems = [];
    let pageToken = null;
    const perPage = 50; // YouTube API max per request

    while (allVideoItems.length < maxResults) {
      let playlistUrl = `${baseUrl}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${perPage}&key=${apiKey}`;

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

      allVideoItems.push(...playlistData.items);

      pageToken = playlistData.nextPageToken;

      if (!pageToken) {
        break; // No more pages
      }
    }

    if (allVideoItems.length === 0) {
      return { channelId, channelName, videos: [] };
    }

    const limitedVideoItems = allVideoItems.slice(0, maxResults);

    // Fetch video details in batches (max 50 IDs per request)
    const allVideosData = [];
    const batchSize = 50;

    for (let i = 0; i < limitedVideoItems.length; i += batchSize) {
      const batch = limitedVideoItems.slice(i, i + batchSize);
      const videoIds = batch
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
      allVideosData.push(...videosData.items);
    }

    // Transform the data into our format
    const videos = allVideosData.map((video) => ({
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

    return { channelId, channelName, videos };
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
 * Fetches all existing videos from the database
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @returns {Promise<Map>} Map of youtubeId -> {documentId, views}
 */
async function getAllExistingVideos(databases, databaseId, collectionId) {
  try {
    const allDocuments = [];
    let offset = 0;
    const limit = 5000;

    while (true) {
      const response = await databases.listDocuments(databaseId, collectionId, [
        Query.limit(limit),
        Query.offset(offset),
      ]);

      allDocuments.push(...response.documents);

      if (response.documents.length < limit) {
        break;
      }

      offset += limit;
    }

    const existingVideosMap = new Map();
    allDocuments.forEach((doc) => {
      existingVideosMap.set(doc.youtubeId, {
        documentId: doc.$id,
        views: doc.views || 0,
      });
    });

    return existingVideosMap;
  } catch (error) {
    throw new Error(`Failed to fetch existing videos: ${error.message}`);
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
 * Updates the view count for an existing video
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @param {string} documentId - Document ID
 * @param {number} newViews - New view count
 * @returns {Promise<Object>} Updated document
 */
async function updateVideoViews(
  databases,
  databaseId,
  collectionId,
  documentId,
  newViews
) {
  try {
    const document = await databases.updateDocument(
      databaseId,
      collectionId,
      documentId,
      {
        views: newViews,
      }
    );

    return document;
  } catch (error) {
    throw new Error(`Failed to update video views: ${error.message}`);
  }
}

/**
 * Processes videos for a single channel
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @param {Map} existingVideosMap - Map of existing videos
 * @param {string} channelId - YouTube channel ID
 * @param {string} youtubeApiKey - YouTube API key
 * @param {Function} log - Logging function
 * @param {Function} logError - Error logging function
 * @returns {Promise<Object>} Channel processing results
 */
async function processChannel(
  databases,
  databaseId,
  collectionId,
  existingVideosMap,
  channelId,
  youtubeApiKey,
  log,
  logError
) {
  log(`Processing channel: ${channelId}`);

  try {
    // Fetch videos from YouTube
    const channelData = await fetchYouTubeVideos(
      channelId,
      youtubeApiKey,
      5000,
      log
    );
    const { channelName, videos } = channelData;

    log(`Found ${videos.length} videos for channel: ${channelName}`);

    // Process each video
    const results = {
      channelId,
      channelName,
      processed: videos.length,
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: [],
    };

    for (const video of videos) {
      try {
        const existingVideo = existingVideosMap.get(video.youtubeId);

        if (existingVideo) {
          // Video exists - check if views need updating
          if (existingVideo.views !== video.views) {
            await updateVideoViews(
              databases,
              databaseId,
              collectionId,
              existingVideo.documentId,
              video.views
            );

            log(
              `Updated video: ${video.title} (${existingVideo.views} → ${video.views} views)`
            );
            results.updated++;
          } else {
            results.unchanged++;
          }
        } else {
          // Insert new video
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
        }
      } catch (err) {
        const errorMsg = `Error processing video ${video.youtubeId}: ${err.message}`;
        logError(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    return results;
  } catch (error) {
    logError(`Error processing channel ${channelId}: ${error.message}`);
    return {
      channelId,
      channelName: "Unknown",
      processed: 0,
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: [error.message],
    };
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

    // Check for at least one channel ID
    if (!process.env.YOUTUBE_CHANNEL_IDS && !process.env.YOUTUBE_CHANNEL_ID) {
      const errorMsg =
        "Missing required environment variable: YOUTUBE_CHANNEL_IDS or YOUTUBE_CHANNEL_ID";
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
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;

    // Support both YOUTUBE_CHANNEL_IDS (comma-separated) and legacy YOUTUBE_CHANNEL_ID
    const channelIdsString =
      process.env.YOUTUBE_CHANNEL_IDS || process.env.YOUTUBE_CHANNEL_ID;
    const channelIds = channelIdsString
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    log(`Found ${channelIds.length} channel(s) to process`);

    log("Fetching existing videos from database...");

    // Fetch all existing videos once
    const existingVideosMap = await getAllExistingVideos(
      databases,
      databaseId,
      collectionId
    );

    log(`Found ${existingVideosMap.size} existing videos in database`);

    // Process each channel sequentially
    const channelResults = [];
    for (const channelId of channelIds) {
      const result = await processChannel(
        databases,
        databaseId,
        collectionId,
        existingVideosMap,
        channelId,
        youtubeApiKey,
        log,
        logError
      );
      channelResults.push(result);
    }

    // Calculate overall statistics
    const overallResults = {
      channelsProcessed: channelResults.length,
      totalProcessed: channelResults.reduce((sum, r) => sum + r.processed, 0),
      totalAdded: channelResults.reduce((sum, r) => sum + r.added, 0),
      totalUpdated: channelResults.reduce((sum, r) => sum + r.updated, 0),
      totalUnchanged: channelResults.reduce((sum, r) => sum + r.unchanged, 0),
      totalErrors: channelResults.reduce((sum, r) => sum + r.errors.length, 0),
    };

    log("Video ingestion completed");
    log(
      `Overall Summary: ${overallResults.totalAdded} added, ${overallResults.totalUpdated} updated, ${overallResults.totalUnchanged} unchanged, ${overallResults.totalErrors} errors across ${overallResults.channelsProcessed} channel(s)`
    );

    return res.json({
      success: true,
      overall: overallResults,
      channels: channelResults,
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
