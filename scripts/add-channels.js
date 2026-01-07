/**
 * Add Channels Script
 *
 * This script adds channel documents to the channels collection.
 * It fetches channel information from YouTube and creates the documents.
 *
 * Usage: node scripts/add-channels.js
 */

require("dotenv").config({ path: ".env.appwrite" });
const { Client, Databases, Query } = require("node-appwrite");

// Configuration from environment variables
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || "",
  projectId: process.env.APPWRITE_PROJECT_ID || "",
  apiKey: process.env.APPWRITE_API_KEY || "",
  databaseId: process.env.APPWRITE_DATABASE_ID || "",
  channelsCollectionId:
    process.env.APPWRITE_CHANNELS_COLLECTION_ID || "channels",
  naatsCollectionId: process.env.APPWRITE_NAATS_COLLECTION_ID || "",
  youtubeApiKey: process.env.YOUTUBE_API_KEY || "",
};

// Channels to add
const CHANNELS = [
  {
    channelId: "UC-pKQ46ZSMkveYV7nKijWmQ",
    channelName: "Naat Sharif", // Will be fetched from YouTube
  },
  {
    channelId: "UCyvdo5fpPSnidSsM-c7F9wg",
    channelName: "Islamic Channel", // Will be fetched from YouTube
  },
];

/**
 * Fetch channel information from YouTube API
 */
async function fetchChannelInfo(channelId) {
  try {
    const https = require("https");
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${config.youtubeApiKey}`;

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
                const channel = parsed.items[0];
                resolve({
                  channelName: channel.snippet.title,
                  description: channel.snippet.description,
                  subscriberCount:
                    parseInt(channel.statistics.subscriberCount) || 0,
                  videoCount: parseInt(channel.statistics.videoCount) || 0,
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
            `Error fetching channel info for ${channelId}:`,
            error.message
          );
          resolve(null);
        });
    });
  } catch (error) {
    console.error(
      `Error fetching channel info for ${channelId}:`,
      error.message
    );
    return null;
  }
}

/**
 * Count naats for a channel
 */
async function countNaatsForChannel(databases, channelId) {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.naatsCollectionId,
      [Query.equal("channelId", channelId), Query.limit(1)]
    );
    return response.total || 0;
  } catch (error) {
    console.error(`Error counting naats for ${channelId}:`, error.message);
    return 0;
  }
}

/**
 * Add or update a channel document
 */
async function addChannel(databases, channelData) {
  try {
    // Check if channel already exists
    const existing = await databases.listDocuments(
      config.databaseId,
      config.channelsCollectionId,
      [Query.equal("channelId", channelData.channelId)]
    );

    if (existing.documents.length > 0) {
      // Update existing channel
      const doc = existing.documents[0];
      await databases.updateDocument(
        config.databaseId,
        config.channelsCollectionId,
        doc.$id,
        {
          channelName: channelData.channelName,
          naatCount: channelData.naatCount,
          lastUpdated: new Date().toISOString(),
        }
      );
      console.log(`✅ Updated channel: ${channelData.channelName}`);
      return { action: "updated", ...channelData };
    } else {
      // Create new channel
      await databases.createDocument(
        config.databaseId,
        config.channelsCollectionId,
        channelData.channelId, // Use channelId as document ID
        {
          channelId: channelData.channelId,
          channelName: channelData.channelName,
          naatCount: channelData.naatCount,
          lastUpdated: new Date().toISOString(),
        }
      );
      console.log(`✅ Created channel: ${channelData.channelName}`);
      return { action: "created", ...channelData };
    }
  } catch (error) {
    console.error(
      `❌ Error adding channel ${channelData.channelId}:`,
      error.message
    );
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting channel addition...\n");

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

  for (const channel of CHANNELS) {
    console.log(`\n📺 Processing channel: ${channel.channelId}`);

    // Fetch channel info from YouTube
    console.log("  Fetching channel info from YouTube...");
    const youtubeInfo = await fetchChannelInfo(channel.channelId);

    if (!youtubeInfo) {
      console.log(`  ⚠️  Could not fetch YouTube info, using default name`);
    } else {
      console.log(`  ✅ Found: ${youtubeInfo.channelName}`);
      console.log(
        `     Subscribers: ${youtubeInfo.subscriberCount.toLocaleString()}`
      );
      console.log(`     Videos: ${youtubeInfo.videoCount.toLocaleString()}`);
    }

    // Count naats for this channel
    console.log("  Counting naats in database...");
    const naatCount = await countNaatsForChannel(databases, channel.channelId);
    console.log(`  ✅ Found ${naatCount} naats`);

    // Prepare channel data
    const channelData = {
      channelId: channel.channelId,
      channelName: youtubeInfo ? youtubeInfo.channelName : channel.channelName,
      naatCount: naatCount,
    };

    // Add channel to database
    console.log("  Adding to channels collection...");
    const result = await addChannel(databases, channelData);
    results.push(result);
  }

  // Summary
  console.log("\n\n✨ Channel addition complete!");
  console.log("\n📊 Summary:");
  const created = results.filter((r) => r.action === "created").length;
  const updated = results.filter((r) => r.action === "updated").length;
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Total: ${results.length}`);

  console.log("\n📋 Channels:");
  results.forEach((r) => {
    console.log(`  ${r.action === "created" ? "➕" : "🔄"} ${r.channelName}`);
    console.log(`     ID: ${r.channelId}`);
    console.log(`     Naats: ${r.naatCount}`);
  });
}

// Run the script
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
