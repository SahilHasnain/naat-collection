#!/usr/bin/env node

const { Client, Databases, ID } = require("node-appwrite");
require("dotenv").config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.EXPO_PUBLIC_DATABASE_ID;
const COLLECTION_ID = process.env.EXPO_PUBLIC_COLLECTION_ID;

function validateEnv() {
  const required = [
    "YOUTUBE_API_KEY",
    "YOUTUBE_CHANNEL_ID",
    "EXPO_PUBLIC_APPWRITE_ENDPOINT",
    "EXPO_PUBLIC_APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "EXPO_PUBLIC_DATABASE_ID",
    "EXPO_PUBLIC_COLLECTION_ID",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }
}

function initAppwrite() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  return new Databases(client);
}

function toDocumentId(youtubeId) {
  // Appwrite allows a-z, A-Z, 0-9 and underscore; max 36 chars
  const sanitized = youtubeId.replace(/[^A-Za-z0-9_]/g, "_");
  return sanitized.slice(0, 36) || ID.unique();
}

async function fetchYouTubeVideos(maxResults = 1000) {
  const baseUrl = "https://www.googleapis.com/youtube/v3";

  try {
    // First, get the uploads playlist ID for the channel
    const channelResponse = await fetch(
      `${baseUrl}/channels?part=contentDetails&id=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`
    );

    if (!channelResponse.ok) {
      throw new Error(
        `YouTube API error: ${channelResponse.status} ${channelResponse.statusText}`
      );
    }

    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      throw new Error(`Channel not found: ${YOUTUBE_CHANNEL_ID}`);
    }

    const uploadsPlaylistId =
      channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Fetch videos from the uploads playlist with pagination
    const allVideoItems = [];
    let pageToken = null;
    const perPage = 50; // YouTube API max per request

    while (allVideoItems.length < maxResults) {
      let playlistUrl = `${baseUrl}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${perPage}&key=${YOUTUBE_API_KEY}`;

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
      console.log(`   Fetched ${allVideoItems.length} videos so far...`);

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
        `${baseUrl}/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      );

      if (!videosResponse.ok) {
        throw new Error(
          `YouTube API error: ${videosResponse.status} ${videosResponse.statusText}`
        );
      }

      const videosData = await videosResponse.json();
      allVideosData.push(...videosData.items);

      console.log(`   Processed details for ${allVideosData.length} videos...`);
    }

    return allVideosData.map((video) => ({
      id: { videoId: video.id },
      snippet: video.snippet,
      contentDetails: video.contentDetails,
      statistics: video.statistics,
    }));
  } catch (error) {
    throw new Error(`Failed to fetch YouTube videos: ${error.message}`);
  }
}

async function fetchVideoDetails(videoIds) {
  // This function is no longer needed as we fetch details in fetchYouTubeVideos
  // Keeping it for backwards compatibility but making it a no-op
  return {};
}

function parseDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

async function videoExists(databases, videoId) {
  try {
    const documentId = toDocumentId(videoId);
    await databases.getDocument(DATABASE_ID, COLLECTION_ID, documentId);
    return true;
  } catch (error) {
    if (error.code === 404) {
      return false;
    }
    throw error;
  }
}

async function createVideoDocument(databases, video, videoDetails) {
  const videoId = video.id.videoId;
  const documentId = toDocumentId(videoId);
  const snippet = video.snippet;
  const contentDetails = video.contentDetails;
  const statistics = video.statistics;

  const document = {
    title: snippet.title,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl:
      snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
    duration: parseDuration(contentDetails.duration),
    uploadDate: snippet.publishedAt,
    channelName: snippet.channelTitle,
    channelId: YOUTUBE_CHANNEL_ID,
    youtubeId: videoId,
    views: parseInt(statistics?.viewCount || "0", 10),
  };

  await databases.createDocument(
    DATABASE_ID,
    COLLECTION_ID,
    documentId,
    document
  );
  return document;
}

async function ingestVideos() {
  console.log("🚀 Starting video ingestion...\n");

  try {
    validateEnv();
    console.log("✅ Environment variables validated");

    const databases = initAppwrite();
    console.log("✅ Appwrite client initialized");

    console.log("📺 Fetching videos from YouTube...");
    const videos = await fetchYouTubeVideos();
    console.log(`✅ Found ${videos.length} videos`);

    let newCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const video of videos) {
      const videoId = video.id.videoId;
      const title = video.snippet.title;

      try {
        const exists = await videoExists(databases, videoId);

        if (exists) {
          console.log(`⏭️  Skipped: ${title} (already exists)`);
          skippedCount++;
        } else {
          try {
            await createVideoDocument(databases, video, null);
            console.log(`✅ Added: ${title}`);
            newCount++;
          } catch (createError) {
            // Handle duplicate ID error (race condition or concurrent ingestion)
            if (
              createError.code === 409 ||
              createError.message.includes("already exists")
            ) {
              console.log(`⏭️  Skipped: ${title} (already exists)`);
              skippedCount++;
            } else {
              throw createError;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${title}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n📊 Ingestion Summary:");
    console.log(`   ✅ New videos added: ${newCount}`);
    console.log(`   ⏭️  Videos skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log("\n✨ Ingestion complete!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

ingestVideos();
