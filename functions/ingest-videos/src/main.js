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
 * Fetches videos from a YouTube playlist using YouTube Data API v3
 * @param {string} playlistId - YouTube playlist ID
 * @param {string} apiKey - YouTube API key
 * @param {number} maxResults - Maximum number of videos to fetch
 * @param {Function} log - Logging function
 * @returns {Promise<Object>} Object containing playlistId, playlistName, and videos array
 */
async function fetchYouTubePlaylistVideos(
  playlistId,
  apiKey,
  maxResults = 5000,
  log,
) {
  const baseUrl = "https://www.googleapis.com/youtube/v3";

  try {
    // First, get the playlist info
    const playlistResponse = await fetch(
      `${baseUrl}/playlists?part=snippet&id=${playlistId}&key=${apiKey}`,
    );

    if (!playlistResponse.ok) {
      throw new Error(
        `YouTube API error: ${playlistResponse.status} ${playlistResponse.statusText}`,
      );
    }

    const playlistData = await playlistResponse.json();

    if (!playlistData.items || playlistData.items.length === 0) {
      throw new Error(`Playlist not found: ${playlistId}`);
    }

    const playlistName = playlistData.items[0].snippet.title;

    // Fetch videos from the playlist with pagination
    const allVideoItems = [];
    let pageToken = null;
    const perPage = 50; // YouTube API max per request

    while (allVideoItems.length < maxResults) {
      let playlistItemsUrl = `${baseUrl}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${perPage}&key=${apiKey}`;

      if (pageToken) {
        playlistItemsUrl += `&pageToken=${pageToken}`;
      }

      const itemsResponse = await fetch(playlistItemsUrl);

      if (!itemsResponse.ok) {
        throw new Error(
          `YouTube API error: ${itemsResponse.status} ${itemsResponse.statusText}`,
        );
      }

      const itemsData = await itemsResponse.json();

      if (!itemsData.items || itemsData.items.length === 0) {
        break;
      }

      allVideoItems.push(...itemsData.items);

      pageToken = itemsData.nextPageToken;

      if (!pageToken) {
        break; // No more pages
      }
    }

    if (allVideoItems.length === 0) {
      return { playlistId, playlistName, videos: [] };
    }

    const limitedVideoItems = allVideoItems.slice(0, maxResults);

    // Fetch video details in batches (max 50 IDs per request)
    const allVideosData = [];
    const batchSize = 50;

    for (let i = 0; i < limitedVideoItems.length; i += batchSize) {
      const batch = limitedVideoItems.slice(i, i + batchSize);
      const videoIds = batch
        .map((item) => item.contentDetails.videoId)
        .filter((id) => id) // Filter out any undefined IDs
        .join(",");

      if (!videoIds) continue;

      const videosResponse = await fetch(
        `${baseUrl}/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${apiKey}`,
      );

      if (!videosResponse.ok) {
        throw new Error(
          `YouTube API error: ${videosResponse.status} ${videosResponse.statusText}`,
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

    return { playlistId, playlistName, videos };
  } catch (error) {
    throw new Error(
      `Failed to fetch YouTube playlist videos: ${error.message}`,
    );
  }
}

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
      `${baseUrl}/channels?part=contentDetails,snippet&id=${channelId}&key=${apiKey}`,
    );

    if (!channelResponse.ok) {
      throw new Error(
        `YouTube API error: ${channelResponse.status} ${channelResponse.statusText}`,
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
          `YouTube API error: ${playlistResponse.status} ${playlistResponse.statusText}`,
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
        `${baseUrl}/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${apiKey}`,
      );

      if (!videosResponse.ok) {
        throw new Error(
          `YouTube API error: ${videosResponse.status} ${videosResponse.statusText}`,
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
  channelId,
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
      },
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
  newViews,
) {
  try {
    const document = await databases.updateDocument(
      databaseId,
      collectionId,
      documentId,
      {
        views: newViews,
      },
    );

    return document;
  } catch (error) {
    throw new Error(`Failed to update video views: ${error.message}`);
  }
}

/**
 * Check if a video should be filtered out based on channel and title rules
 * @param {boolean} isOfficial - Whether the channel is official
 * @param {string} title - The video title
 * @returns {boolean} - true if video should be filtered out (excluded)
 */
function shouldFilterVideo(isOfficial, title) {
  // If channel is official, don't filter any videos
  if (isOfficial) {
    return false;
  }

  // For non-official channels, only include videos with Owais Raza/Qadri in title
  const titleLower = title.toLowerCase();

  // Common spelling variations for "Owais"
  const owaisVariations = [
    "owais",
    "owias",
    "owes",
    "owaiz",
    "awais",
    "awaiz",
    "uwais",
    "uwaiz",
  ];

  // Check if title contains "Owais" (any variation)
  const hasOwais = owaisVariations.some((owais) => titleLower.includes(owais));

  // Check if title contains "Raza" (exact, no variations)
  const hasRaza = titleLower.includes("raza");

  // Check if title contains "Qadri" (exact, no variations)
  const hasQadri = titleLower.includes("qadri");

  // Must match one of these patterns:
  // 1. Owais + Raza
  // 2. Owais + Qadri
  // 3. Owais + Raza + Qadri
  const isOwaisVideo = hasOwais && (hasRaza || hasQadri);

  // Filter out (return true) if it does NOT match the pattern
  return !isOwaisVideo;
}

/**
 * Processes videos for a single source (channel or playlist)
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @param {Map} existingVideosMap - Map of existing videos
 * @param {Object} source - Source object from database (channel or playlist)
 * @param {string} youtubeApiKey - YouTube API key
 * @param {Function} log - Logging function
 * @param {Function} logError - Error logging function
 * @returns {Promise<Object>} Processing results
 */
async function processSource(
  databases,
  databaseId,
  collectionId,
  existingVideosMap,
  source,
  youtubeApiKey,
  log,
  logError,
) {
  const sourceType = source.type || "channel";
  const isOfficial = source.isOfficial ?? true;
  const sourceName = source.channelName;
  const sourceId = source.channelId;

  log(
    `Processing ${sourceType}: ${sourceName} (${isOfficial ? "Official" : "Non-official"})`,
  );

  try {
    let fetchedData;

    // Fetch videos based on source type
    if (sourceType === "playlist") {
      if (!source.playlistId) {
        throw new Error("Playlist ID is missing");
      }
      fetchedData = await fetchYouTubePlaylistVideos(
        source.playlistId,
        youtubeApiKey,
        5000,
        log,
      );
    } else {
      // Default to channel
      fetchedData = await fetchYouTubeVideos(
        sourceId,
        youtubeApiKey,
        5000,
        log,
      );
    }

    const { videos } = fetchedData;
    const displayName =
      fetchedData.channelName || fetchedData.playlistName || sourceName;

    log(`Found ${videos.length} videos for ${sourceType}: ${displayName}`);

    // Process each video
    const results = {
      sourceId,
      sourceName: displayName,
      sourceType,
      isOfficial,
      processed: videos.length,
      added: 0,
      updated: 0,
      unchanged: 0,
      filtered: 0,
      errors: [],
    };

    for (const video of videos) {
      try {
        // Filter out videos less than 1 minute (60 seconds)
        if (video.duration < 60) {
          log(`Filtered: ${video.title} (duration ${video.duration}s < 60s)`);
          results.filtered++;
          continue;
        }

        // Check if video should be filtered out
        if (shouldFilterVideo(isOfficial, video.title)) {
          log(
            `Filtered: ${video.title} (non-Owais from non-official ${sourceType})`,
          );
          results.filtered++;
          continue;
        }

        const existingVideo = existingVideosMap.get(video.youtubeId);

        if (existingVideo) {
          // Video exists - check if views need updating
          if (existingVideo.views !== video.views) {
            await updateVideoViews(
              databases,
              databaseId,
              collectionId,
              existingVideo.documentId,
              video.views,
            );

            log(
              `Updated video: ${video.title} (${existingVideo.views} → ${video.views} views)`,
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
            displayName,
            sourceId,
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
    logError(`Error processing ${sourceType} ${sourceId}: ${error.message}`);
    return {
      sourceId,
      sourceName,
      sourceType,
      isOfficial,
      processed: 0,
      added: 0,
      updated: 0,
      unchanged: 0,
      filtered: 0,
      errors: [error.message],
    };
  }
}

/**
 * Fetches all channels from the database
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} channelsCollectionId - Channels collection ID
 * @param {Function} log - Logging function
 * @returns {Promise<Array>} Array of channel objects
 */
async function getAllChannels(
  databases,
  databaseId,
  channelsCollectionId,
  log,
) {
  try {
    const allChannels = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await databases.listDocuments(
        databaseId,
        channelsCollectionId,
        [Query.limit(limit), Query.offset(offset)],
      );

      allChannels.push(...response.documents);

      if (response.documents.length < limit) {
        break;
      }

      offset += limit;
    }

    log(`Fetched ${allChannels.length} channels from database`);
    return allChannels;
  } catch (error) {
    throw new Error(`Failed to fetch channels: ${error.message}`);
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
      "APPWRITE_CHANNELS_COLLECTION_ID",
      "YOUTUBE_API_KEY",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    );

    if (missingVars.length > 0) {
      const errorMsg = `Missing required environment variables: ${missingVars.join(", ")}`;
      logError(errorMsg);
      return res.json(
        {
          success: false,
          error: errorMsg,
        },
        500,
      );
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(
        process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
      )
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_NAATS_COLLECTION_ID;
    const channelsCollectionId = process.env.APPWRITE_CHANNELS_COLLECTION_ID;
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;

    // Fetch channels from database
    log("Fetching channels from database...");
    const channels = await getAllChannels(
      databases,
      databaseId,
      channelsCollectionId,
      log,
    );

    if (channels.length === 0) {
      const errorMsg =
        "No channels found in database. Please add channels first.";
      logError(errorMsg);
      return res.json(
        {
          success: false,
          error: errorMsg,
        },
        500,
      );
    }

    log(`Found ${channels.length} channel(s) to process`);

    log("Fetching existing videos from database...");

    // Fetch all existing videos once
    const existingVideosMap = await getAllExistingVideos(
      databases,
      databaseId,
      collectionId,
    );

    log(`Found ${existingVideosMap.size} existing videos in database`);

    // Process each source (channel or playlist) sequentially
    const sourceResults = [];
    for (const source of channels) {
      const result = await processSource(
        databases,
        databaseId,
        collectionId,
        existingVideosMap,
        source,
        youtubeApiKey,
        log,
        logError,
      );
      sourceResults.push(result);
    }

    // Calculate overall statistics
    const overallResults = {
      sourcesProcessed: sourceResults.length,
      totalProcessed: sourceResults.reduce((sum, r) => sum + r.processed, 0),
      totalAdded: sourceResults.reduce((sum, r) => sum + r.added, 0),
      totalUpdated: sourceResults.reduce((sum, r) => sum + r.updated, 0),
      totalUnchanged: sourceResults.reduce((sum, r) => sum + r.unchanged, 0),
      totalFiltered: sourceResults.reduce(
        (sum, r) => sum + (r.filtered || 0),
        0,
      ),
      totalErrors: sourceResults.reduce((sum, r) => sum + r.errors.length, 0),
    };

    log("Video ingestion completed");
    log(
      `Overall Summary: ${overallResults.totalAdded} added, ${overallResults.totalUpdated} updated, ${overallResults.totalUnchanged} unchanged, ${overallResults.totalFiltered} filtered, ${overallResults.totalErrors} errors across ${overallResults.sourcesProcessed} source(s)`,
    );

    return res.json({
      success: true,
      overall: overallResults,
      sources: sourceResults,
    });
  } catch (err) {
    const errorMsg = `Fatal error during ingestion: ${err.message}`;
    logError(errorMsg);

    return res.json(
      {
        success: false,
        error: errorMsg,
      },
      500,
    );
  }
};
