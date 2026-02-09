/**
 * Add Playlists Script
 *
 * This script adds playlists as "virtual channels" to the channels collection.
 * Playlists will appear in the "Other" tab.
 *
 * Usage: node scripts/data-management/add-playlists.js
 */

require("dotenv").config({ path: "apps/mobile/.env" });
const { Client, Databases, Query } = require("node-appwrite");

// Configuration from environment variables
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || "",
  projectId: process.env.APPWRITE_PROJECT_ID || "",
  apiKey: process.env.APPWRITE_API_KEY || "",
  databaseId: process.env.APPWRITE_DATABASE_ID || "",
  channelsCollectionId:
    process.env.APPWRITE_CHANNELS_COLLECTION_ID || "channels",
  youtubeApiKey: process.env.YOUTUBE_API_KEY || "",
};

// Playlists to add
// Add your playlists here in this format:
const PLAYLISTS = [
  {
    playlistId: "PLkW9N8lesk1ON-Z_qbhbA82FetR19g84K",
    isOfficial: false, // Filter for Owais only
    isOther: true, // Appears in "Other" tab
  },
];

/**
 * Fetch playlist information from YouTube API
 */
async function fetchPlaylistInfo(playlistId) {
  try {
    const https = require("https");
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${config.youtubeApiKey}`;

    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);

              if (parsed.items && parsed.items.length > 0) {
                const playlist = parsed.items[0];
                resolve({
                  playlistName: playlist.snippet.title,
                  description: playlist.snippet.description,
                  channelTitle: playlist.snippet.channelTitle,
                  itemCount: playlist.contentDetails.itemCount || 0,
                });
              } else {
                resolve(null);
              }
            } catch (error) {
              console.error(`Error parsing YouTube response:`, error.message);
              resolve(null);
            }
          });
        })
        .on("error", (error) => {
          console.error(
            `Error fetching playlist info for ${playlistId}:`,
            error.message,
          );
          resolve(null);
        });
    });
  } catch (error) {
    console.error(
      `Error fetching playlist info for ${playlistId}:`,
      error.message,
    );
    return null;
  }
}

/**
 * Check if playlist already exists
 */
async function playlistExists(databases, playlistId) {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.channelsCollectionId,
      [Query.equal("playlistId", playlistId), Query.limit(1)],
    );
    return response.documents.length > 0;
  } catch (error) {
    console.error(`Error checking playlist existence:`, error.message);
    return false;
  }
}

/**
 * Add a playlist document
 */
async function addPlaylist(databases, playlistData) {
  try {
    // Generate a unique channelId for the playlist (shorter format)
    // Use first 8 chars of playlist ID to keep it under 36 chars
    const shortId = playlistData.playlistId.substring(0, 8);
    const channelId = `pl_${shortId}`;

    await databases.createDocument(
      config.databaseId,
      config.channelsCollectionId,
      channelId, // Use shortened ID as document ID
      {
        channelId: channelId,
        channelName: playlistData.name,
        type: "playlist",
        playlistId: playlistData.playlistId,
        naatCount: 0,
        isOfficial: playlistData.isOfficial,
        isOther: playlistData.isOther,
        lastUpdated: new Date().toISOString(),
      },
    );
    console.log(`✅ Created playlist: ${playlistData.name}`);
    return { action: "created", ...playlistData };
  } catch (error) {
    console.error(
      `❌ Error adding playlist ${playlistData.playlistId}:`,
      error.message,
    );
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting playlist addition...\n");

  if (PLAYLISTS.length === 0) {
    console.log("⚠️  No playlists configured.");
    console.log(
      "\nTo add playlists, edit this file and add them to the PLAYLISTS array:",
    );
    console.log("Example:");
    console.log(`
const PLAYLISTS = [
  {
    playlistId: "PLxxxxxxxxxxx",
    name: "Best Owais Naats", // Optional
    isOfficial: false,
    isOther: true,
  },
];
    `);
    process.exit(0);
  }

  // Validate configuration
  if (
    !config.endpoint ||
    !config.projectId ||
    !config.apiKey ||
    !config.databaseId ||
    !config.youtubeApiKey
  ) {
    console.error("❌ Error: Missing required environment variables");
    console.error("Required variables:");
    console.error("  - APPWRITE_ENDPOINT");
    console.error("  - APPWRITE_PROJECT_ID");
    console.error("  - APPWRITE_API_KEY");
    console.error("  - APPWRITE_DATABASE_ID");
    console.error("  - YOUTUBE_API_KEY");
    process.exit(1);
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  const databases = new Databases(client);

  const results = [];

  for (const playlist of PLAYLISTS) {
    console.log(`\n📂 Processing playlist: ${playlist.playlistId}`);

    // Check if playlist already exists
    const exists = await playlistExists(databases, playlist.playlistId);
    if (exists) {
      console.log(`  ⚠️  Playlist already exists, skipping...`);
      results.push({ action: "skipped", ...playlist });
      continue;
    }

    // Fetch playlist info from YouTube if name not provided
    let playlistName = playlist.name;
    if (!playlistName) {
      console.log("  Fetching playlist info from YouTube...");
      const youtubeInfo = await fetchPlaylistInfo(playlist.playlistId);

      if (!youtubeInfo) {
        console.log(`  ⚠️  Could not fetch YouTube info, skipping...`);
        results.push({ action: "failed", ...playlist });
        continue;
      }

      playlistName = youtubeInfo.playlistName;
      console.log(`  ✅ Found: ${playlistName}`);
      console.log(`     Channel: ${youtubeInfo.channelTitle}`);
      console.log(`     Videos: ${youtubeInfo.itemCount}`);
    }

    // Prepare playlist data
    const playlistData = {
      playlistId: playlist.playlistId,
      name: playlistName,
      isOfficial: playlist.isOfficial ?? false,
      isOther: playlist.isOther ?? true,
    };

    // Add playlist to database
    console.log("  Adding to channels collection...");
    const result = await addPlaylist(databases, playlistData);
    results.push(result);
  }

  // Summary
  console.log("\n\n✨ Playlist addition complete!");
  console.log("\n📊 Summary:");
  const created = results.filter((r) => r.action === "created").length;
  const skipped = results.filter((r) => r.action === "skipped").length;
  const failed = results.filter((r) => r.action === "failed").length;
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${results.length}`);

  if (created > 0) {
    console.log("\n📋 Playlists:");
    results
      .filter((r) => r.action === "created")
      .forEach((r) => {
        console.log(`  ➕ ${r.name}`);
        console.log(`     Playlist ID: ${r.playlistId}`);
        console.log(`     isOfficial: ${r.isOfficial}`);
        console.log(`     isOther: ${r.isOther}`);
      });
  }

  console.log("\n📝 Next steps:");
  console.log("  1. Update the ingestion function to handle playlists");
  console.log("  2. Run the ingestion function to fetch videos from playlists");
  console.log("  3. Check the frontend - playlists will appear in 'Other' tab");
}

// Run the script
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
