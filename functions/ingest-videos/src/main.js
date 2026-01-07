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
 * @param {string} channelId - YouTube channel ID
 * @param {string} apiKey - YouTube API key
 * @param {number} maxResults - Maximum number of videos to fetch
 * @returns {Promise<Array>} Array of video objects
 */
async function fetchYouTubeVideos(channelId, apiKey, maxResults = 5000) {
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
      return [];
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
    return allVideosData.map((video) => ({
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
    const channelName = process.env.CHANNEL_NAME || "Baghdadi Sound & Video";

    log("Fetching existing videos from database...");

    // Fetch all existing videos once
    const existingVideosMap = await getAllExistingVideos(
      databases,
      databaseId,
      collectionId
    );

    log(`Found ${existingVideosMap.size} existing videos in database`);
    log(`Fetching videos from YouTube channel: ${channelId}`);

    // Fetch videos from YouTube
    const videos = await fetchYouTubeVideos(channelId, youtubeApiKey);

    log(`Found ${videos.length} videos on YouTube`);

    // Process each video
    const results = {
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
            log(`Unchanged video: ${video.title} (${video.youtubeId})`);
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

    log("Video ingestion completed");
    log(
      `Summary: ${results.added} added, ${results.updated} updated, ${results.unchanged} unchanged, ${results.errors.length} errors`
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
