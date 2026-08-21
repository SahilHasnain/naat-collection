/**
 * Appwrite Function: Playlist/Channel Source Ingestion
 *
 * Daily scheduled ingestion of naat documents from the channel collection.
 * Reads channel collection documents and ingests their videos into the
 * naats collection. Which source types are ingested is controlled by the
 * INGEST_SOURCE_TYPES environment variable:
 *
 *   - "playlist"            -> only documents with type == "playlist"
 *   - "channel"             -> only documents with type == "channel"
 *   - "channel,playlist"    -> ALL documents (channels + playlists)
 *   - (unset)               -> defaults to "playlist"
 *
 * Environment Variables Required:
 * - APPWRITE_FUNCTION_PROJECT_ID: Appwrite project ID (auto-provided)
 * - APPWRITE_API_KEY: API key with database read/write permissions
 * - APPWRITE_DATABASE_ID: Database ID
 * - APPWRITE_NAATS_COLLECTION_ID: Naats collection ID
 * - APPWRITE_CHANNELS_COLLECTION_ID: Channels collection ID
 * - YOUTUBE_API_KEY: YouTube Data API v3 key
 * - INGEST_SOURCE_TYPES (optional): "playlist" (default), "channel", or "channel,playlist"
 */

import { Client, Databases, ID, Query } from "node-appwrite";

/**
 * Fetches shorts video IDs from UUSH playlist (undocumented YouTube feature)
 * @param {string} channelId - YouTube channel ID
 * @param {string} apiKey - YouTube API key
 * @param {Function} log - Logging function
 * @returns {Promise<Set>} Set of shorts video IDs
 */
async function getShortsVideoIds(channelId, apiKey, log) {
  const baseUrl = "https://www.googleapis.com/youtube/v3";
  const shortsPlaylistId = channelId.replace("UC", "UUSH");
  const shortsIds = new Set();

  try {
    log(`Fetching shorts playlist (${shortsPlaylistId})...`);
    let pageToken = null;
    let totalShorts = 0;

    do {
      let playlistUrl = `${baseUrl}/playlistItems?part=contentDetails&playlistId=${shortsPlaylistId}&maxResults=50&key=${apiKey}`;

      if (pageToken) {
        playlistUrl += `&pageToken=${pageToken}`;
      }

      const response = await fetch(playlistUrl);

      if (!response.ok) {
        log(`No shorts playlist found (this is normal if channel has no shorts)`);
        break;
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        data.items.forEach((item) => {
          shortsIds.add(item.contentDetails.videoId);
        });
        totalShorts += data.items.length;
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    if (totalShorts > 0) {
      log(`Found ${totalShorts} shorts to exclude`);
    }
  } catch (error) {
    log(`Could not fetch shorts playlist: ${error.message}`);
  }

  return shortsIds;
}

/**
 * Fetches videos from a YouTube playlist using YouTube Data API v3
 * @param {string} playlistId - YouTube playlist ID
 * @param {string} apiKey - YouTube API key
 * @param {number} maxResults - Maximum number of videos to fetch
 * @param {Function} log - Logging function
 * @returns {Promise<Object>} Object containing playlistId, playlistName, and videos array
 */
async function fetchYouTubePlaylistVideos(playlistId, apiKey, maxResults = 5000, log) {
  const baseUrl = "https://www.googleapis.com/youtube/v3";

  try {
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

    const allVideoItems = [];
    let pageToken = null;
    const perPage = 50;

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
        break;
      }
    }

    if (allVideoItems.length === 0) {
      return { playlistId, playlistName, videos: [] };
    }

    const limitedVideoItems = allVideoItems.slice(0, maxResults);

    const allVideosData = [];
    const batchSize = 50;

    for (let i = 0; i < limitedVideoItems.length; i += batchSize) {
      const batch = limitedVideoItems.slice(i, i + batchSize);
      const videoIds = batch
        .map((item) => item.contentDetails.videoId)
        .filter((id) => id)
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
    throw new Error(`Failed to fetch YouTube playlist videos: ${error.message}`);
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

    const shortsIds = await getShortsVideoIds(channelId, apiKey, log);

    const allVideoItems = [];
    let pageToken = null;
    const perPage = 50;

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
        break;
      }
    }

    if (allVideoItems.length === 0) {
      return { channelId, channelName, videos: [] };
    }

    const limitedVideoItems = allVideoItems.slice(0, maxResults);

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

    const videos = allVideosData
      .filter((video) => !shortsIds.has(video.id))
      .map((video) => ({
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

    const shortsFilteredCount = allVideosData.length - videos.length;
    if (shortsFilteredCount > 0) {
      log(`Filtered ${shortsFilteredCount} shorts from video list`);
    }

    return { channelId, channelName, videos };
  } catch (error) {
    throw new Error(`Failed to fetch YouTube videos: ${error.message}`);
  }
}

/**
 * Filters videos by a title regex filter (case-insensitive).
 * Returns only videos whose title matches the filter.
 * @param {Array} videos - Video objects
 * @param {string|null} titleFilter - Regex pattern to match against video titles
 * @param {Function} log - Logging function
 * @returns {Array} Filtered videos
 */
function filterVideosByTitle(videos, titleFilter, log) {
  if (!titleFilter) return videos;

  let regex;
  try {
    regex = new RegExp(titleFilter, "i");
  } catch (err) {
    log(`Invalid title filter regex "${titleFilter}": ${err.message} — skipping filter`);
    return videos;
  }

  const filtered = videos.filter((video) => regex.test(video.title || ""));
  const filteredCount = videos.length - filtered.length;
  if (filteredCount > 0) {
    log(`Title filter "${titleFilter}" excluded ${filteredCount} video(s)`);
  }
  return filtered;
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
 * @param {string} channelName - Channel/playlist name
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Created document
 */
async function insertVideo(databases, databaseId, collectionId, video, channelName, channelId) {
  try {
    const document = await databases.createDocument(databaseId, collectionId, ID.unique(), {
      title: video.title,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      uploadDate: video.uploadDate,
      channelName: channelName,
      channelId: channelId,
      youtubeId: video.youtubeId,
      views: video.views,
    });

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
async function updateVideoViews(databases, databaseId, collectionId, documentId, newViews) {
  try {
    const document = await databases.updateDocument(databaseId, collectionId, documentId, {
      views: newViews,
    });

    return document;
  } catch (error) {
    throw new Error(`Failed to update video views: ${error.message}`);
  }
}

/**
 * Processes a single source document (channel or playlist)
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @param {Map} existingVideosMap - Map of existing videos
 * @param {Object} source - Source document from channel collection
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
  const isOther = source.isOther ?? false;
  const sourceName = source.channelName || "(unnamed)";
  const sourceId = source.channelId || source.playlistId || source.$id;

  log(
    `Processing ${sourceType}: ${sourceName} (${isOfficial ? "Official" : "Non-official"}${isOther ? ", Other" : ""})`,
  );

  try {
    let fetchedData;

    if (sourceType === "playlist") {
      if (!source.playlistId) {
        throw new Error("Playlist ID is missing");
      }
      fetchedData = await fetchYouTubePlaylistVideos(source.playlistId, youtubeApiKey, 5000, log);
    } else {
      fetchedData = await fetchYouTubeVideos(sourceId, youtubeApiKey, 5000, log);
    }

    let { videos } = fetchedData;
    const displayName =
      fetchedData.channelName || fetchedData.playlistName || sourceName;

    const titleFilter = source.titleFilter || null;
    if (titleFilter) {
      videos = filterVideosByTitle(videos, titleFilter, log);
    }

    log(`Found ${videos.length} videos for ${sourceType}: ${displayName}`);

    const results = {
      sourceId,
      sourceName: displayName,
      sourceType,
      isOfficial,
      isOther,
      processed: videos.length,
      added: 0,
      updated: 0,
      unchanged: 0,
      filtered: 0,
      errors: [],
    };

    for (const video of videos) {
      try {
        if (video.duration < 60) {
          log(`Filtered: ${video.title} (duration ${video.duration}s < 60s, likely short)`);
          results.filtered++;
          continue;
        }

        if (video.duration > 3600) {
          log(`Filtered: ${video.title} (duration ${video.duration}s > 3600s)`);
          results.filtered++;
          continue;
        }

        if (isOther && video.duration > 1200) {
          log(
            `Filtered: ${video.title} (duration ${video.duration}s > 1200s for isOther channel)`,
          );
          results.filtered++;
          continue;
        }

        const existingVideo = existingVideosMap.get(video.youtubeId);

        if (existingVideo) {
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
      isOther,
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
 * Fetches channel/playlist source documents from the channel collection
 * filtered by the configured source types
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} channelsCollectionId - Channels collection ID
 * @param {string[]} sourceTypes - List of source types to ingest
 * @param {Function} log - Logging function
 * @returns {Promise<Array>} Array of source documents
 */
async function getSources(databases, databaseId, channelsCollectionId, sourceTypes, log) {
  try {
    const allSources = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const queries = [Query.limit(limit), Query.offset(offset)];

      if (sourceTypes.length === 1) {
        queries.push(Query.equal("type", sourceTypes));
      }

      const response = await databases.listDocuments(databaseId, channelsCollectionId, queries);

      allSources.push(...response.documents);

      if (response.documents.length < limit) {
        break;
      }

      offset += limit;
    }

    const sources = allSources.filter((source) => {
      const sourceType = source.type || "channel";

      if (!sourceTypes.includes(sourceType)) {
        return false;
      }

      // Only explicitly approved channels are ingested. Other channels such as
      // Tayyiba remain available for historical data and UI display, but are
      // not part of the scheduled ingestion set.
      return sourceType !== "channel" || source.isOther !== true;
    });

    log(`Fetched ${allSources.length} source(s) from database`);
    log(`Selected ${sources.length} source(s) for ingestion`);
    return sources;
  } catch (error) {
    throw new Error(`Failed to fetch sources: ${error.message}`);
  }
}

/**
 * Main function handler
 * @param {Object} context - Appwrite function context
 * @returns {Object} Response object
 */
export default async ({ req, res, log, error: logError }) => {
  try {
    log("Starting playlist/channel ingestion process...");

    const requiredEnvVars = [
      "APPWRITE_FUNCTION_PROJECT_ID",
      "APPWRITE_API_KEY",
      "APPWRITE_DATABASE_ID",
      "APPWRITE_NAATS_COLLECTION_ID",
      "APPWRITE_CHANNELS_COLLECTION_ID",
      "YOUTUBE_API_KEY",
    ];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

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

    const sourceTypesRaw = (process.env.INGEST_SOURCE_TYPES || "playlist")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s === "channel" || s === "playlist");

    if (sourceTypesRaw.length === 0) {
      sourceTypesRaw.push("playlist");
    }

    log(`Ingesting source types: ${sourceTypesRaw.join(", ")}`);

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1")
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_NAATS_COLLECTION_ID;
    const channelsCollectionId = process.env.APPWRITE_CHANNELS_COLLECTION_ID;
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;

    log("Fetching sources from database...");
    const sources = await getSources(
      databases,
      databaseId,
      channelsCollectionId,
      sourceTypesRaw,
      log,
    );

    if (sources.length === 0) {
      const errorMsg =
        `No source documents found for types: ${sourceTypesRaw.join(", ")}. ` +
        "Please add sources to the channels collection first.";
      logError(errorMsg);
      return res.json(
        {
          success: false,
          error: errorMsg,
        },
        500,
      );
    }

    log(`Found ${sources.length} source(s) to process`);

    log("Fetching existing videos from database...");
    const existingVideosMap = await getAllExistingVideos(databases, databaseId, collectionId);
    log(`Found ${existingVideosMap.size} existing videos in database`);

    const sourceResults = [];
    for (const source of sources) {
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

    const overallResults = {
      sourcesProcessed: sourceResults.length,
      totalProcessed: sourceResults.reduce((sum, r) => sum + r.processed, 0),
      totalAdded: sourceResults.reduce((sum, r) => sum + r.added, 0),
      totalUpdated: sourceResults.reduce((sum, r) => sum + r.updated, 0),
      totalUnchanged: sourceResults.reduce((sum, r) => sum + r.unchanged, 0),
      totalFiltered: sourceResults.reduce((sum, r) => sum + (r.filtered || 0), 0),
      totalErrors: sourceResults.reduce((sum, r) => sum + r.errors.length, 0),
    };

    log("Playlist/channel ingestion completed");
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
