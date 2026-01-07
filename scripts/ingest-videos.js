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

async function fetchYouTubeVideos(maxResults = 5000) {
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

function parseDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

async function getAllExistingVideos(databases) {
  try {
    const allDocuments = [];
    let offset = 0;
    const limit = 5000; // Max per request

    while (true) {
      const { Query } = require("node-appwrite");
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.limit(limit), Query.offset(offset)]
      );

      allDocuments.push(...response.documents);

      if (response.documents.length < limit) {
        break; // No more documents
      }

      offset += limit;
    }

    // Create a Map: youtubeId -> {documentId, views}
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

async function createVideoDocument(databases, video) {
  const videoId = video.id.videoId;
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
    ID.unique(),
    document
  );
  return document;
}

async function updateVideoViews(databases, documentId, newViews) {
  try {
    await databases.updateDocument(DATABASE_ID, COLLECTION_ID, documentId, {
      views: newViews,
    });
  } catch (error) {
    throw new Error(`Failed to update video views: ${error.message}`);
  }
}

async function ingestVideos() {
  console.log("🚀 Starting video ingestion...\n");

  try {
    validateEnv();
    console.log("✅ Environment variables validated");

    const databases = initAppwrite();
    console.log("✅ Appwrite client initialized");

    console.log("📦 Fetching existing videos from database...");
    const existingVideosMap = await getAllExistingVideos(databases);
    console.log(
      `✅ Found ${existingVideosMap.size} existing videos in database`
    );

    console.log("📺 Fetching videos from YouTube...");
    const videos = await fetchYouTubeVideos();
    console.log(`✅ Found ${videos.length} videos on YouTube`);

    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    for (const video of videos) {
      const videoId = video.id.videoId;
      const title = video.snippet.title;
      const newViews = parseInt(video.statistics?.viewCount || "0", 10);

      try {
        const existingVideo = existingVideosMap.get(videoId);

        if (existingVideo) {
          // Video exists - check if views need updating
          if (existingVideo.views !== newViews) {
            await updateVideoViews(
              databases,
              existingVideo.documentId,
              newViews
            );
            console.log(
              `🔄 Updated: ${title} (${existingVideo.views} → ${newViews} views)`
            );
            updatedCount++;
          } else {
            console.log(`⏭️  Unchanged: ${title}`);
            unchangedCount++;
          }
        } else {
          // New video - insert it
          try {
            await createVideoDocument(databases, video);
            console.log(`✅ Added: ${title} (${newViews} views)`);
            newCount++;
          } catch (createError) {
            // Handle duplicate ID error (race condition)
            if (
              createError.code === 409 ||
              createError.message.includes("already exists")
            ) {
              console.log(`⏭️  Skipped: ${title} (already exists)`);
              unchangedCount++;
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
    console.log(`   🔄 Videos updated: ${updatedCount}`);
    console.log(`   ⏭️  Videos unchanged: ${unchangedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log("\n✨ Ingestion complete!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

ingestVideos();
