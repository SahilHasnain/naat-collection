/**
 * Add Other Channels Script
 *
 * This script adds new channels to the channels collection with isOther=true flag.
 *
 * Usage: node scripts/data-management/add-other-channels.js
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

// Channels to add
const NEW_CHANNELS = [
  {
    channelId: "UCHV-bsO-jhfj_WN_3xoicrw",
    isOfficial: true,
    isOther: true,
  },
  {
    channelId: "UCY_o15b4ZSt3e0gAXYTOSqQ",
    isOfficial: true,
    isOther: true,
  },
  {
    channelId: "UCF5QXTRLz-9nAz1kks9nfLw",
    isOfficial: true,
    isOther: true,
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
            error.message,
          );
          resolve(null);
        });
    });
  } catch (error) {
    console.error(
      `Error fetching channel info for ${channelId}:`,
      error.message,
    );
    return null;
  }
}

/**
 * Check if channel already exists
 */
async function channelExists(databases, channelId) {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.channelsCollectionId,
      [Query.equal("channelId", channelId), Query.limit(1)],
    );
    return response.documents.length > 0;
  } catch (error) {
    console.error(`Error checking channel existence:`, error.message);
    return false;
  }
}

/**
 * Add a channel document
 */
async function addChannel(databases, channelData) {
  try {
    await databases.createDocument(
      config.databaseId,
      config.channelsCollectionId,
      channelData.channelId, // Use channelId as document ID
      {
        channelId: channelData.channelId,
        channelName: channelData.channelName,
        naatCount: 0,
        isOfficial: channelData.isOfficial,
        isOther: channelData.isOther,
        lastUpdated: new Date().toISOString(),
      },
    );
    console.log(`✅ Created channel: ${channelData.channelName}`);
    return { action: "created", ...channelData };
  } catch (error) {
    console.error(
      `❌ Error adding channel ${channelData.channelId}:`,
      error.message,
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

  for (const channel of NEW_CHANNELS) {
    console.log(`\n📺 Processing channel: ${channel.channelId}`);

    // Check if channel already exists
    const exists = await channelExists(databases, channel.channelId);
    if (exists) {
      console.log(`  ⚠️  Channel already exists, skipping...`);
      results.push({ action: "skipped", ...channel });
      continue;
    }

    // Fetch channel info from YouTube
    console.log("  Fetching channel info from YouTube...");
    const youtubeInfo = await fetchChannelInfo(channel.channelId);

    if (!youtubeInfo) {
      console.log(`  ⚠️  Could not fetch YouTube info, skipping...`);
      results.push({ action: "failed", ...channel });
      continue;
    }

    console.log(`  ✅ Found: ${youtubeInfo.channelName}`);
    console.log(
      `     Subscribers: ${youtubeInfo.subscriberCount.toLocaleString()}`,
    );
    console.log(`     Videos: ${youtubeInfo.videoCount.toLocaleString()}`);

    // Prepare channel data
    const channelData = {
      channelId: channel.channelId,
      channelName: youtubeInfo.channelName,
      isOfficial: channel.isOfficial,
      isOther: channel.isOther,
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
  const skipped = results.filter((r) => r.action === "skipped").length;
  const failed = results.filter((r) => r.action === "failed").length;
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${results.length}`);

  console.log("\n📋 Channels:");
  results.forEach((r) => {
    const icon =
      r.action === "created" ? "➕" : r.action === "skipped" ? "⏭️" : "❌";
    console.log(`  ${icon} ${r.channelName || r.channelId}`);
    console.log(`     ID: ${r.channelId}`);
    console.log(`     isOfficial: ${r.isOfficial}`);
    console.log(`     isOther: ${r.isOther}`);
  });

  console.log("\n📝 Next steps:");
  console.log(
    "  1. Run the ingestion function to fetch videos from these channels",
  );
  console.log("  2. Check the frontend to see the 'Other' tab appear");
}

// Run the script
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
