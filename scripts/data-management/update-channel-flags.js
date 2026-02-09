/**
 * Update Channel Flags Script
 *
 * This script adds isOfficial and isOther flags to existing channel documents.
 * Run this after adding the new attributes to the channels collection.
 *
 * Usage: node scripts/data-management/update-channel-flags.js
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
};

/**
 * Channel configuration with flags
 * Update these based on your channels
 */
const CHANNEL_CONFIG = [
  {
    channelId: "UC-pKQ46ZSMkveYV7nKijWmQ", // Baghdadi Sound & Video
    isOfficial: false, // Not official, will filter for Owais only
    isOther: false, // Main channel, not in "Other" tab
  },
  {
    channelId: "UCyvdo5fpPSnidSsM-c7F9wg", // Another channel
    isOfficial: true, // Official, ingest all videos
    isOther: false, // Main channel, not in "Other" tab
  },
  // Add more channels as needed
  // Example of a channel that goes in "Other" tab:
  // {
  //   channelId: "UCXXXXXXXXXXXXXXXXXX",
  //   isOfficial: true,
  //   isOther: true, // Will appear in "Other" tab
  // },
];

async function updateChannelFlags() {
  console.log("🚀 Starting channel flags update...\n");

  // Validate configuration
  if (
    !config.endpoint ||
    !config.projectId ||
    !config.apiKey ||
    !config.databaseId
  ) {
    console.error("❌ Error: Missing required environment variables");
    console.error("Required variables:");
    console.error("  - APPWRITE_ENDPOINT");
    console.error("  - APPWRITE_PROJECT_ID");
    console.error("  - APPWRITE_API_KEY");
    console.error("  - APPWRITE_DATABASE_ID");
    process.exit(1);
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  const databases = new Databases(client);

  try {
    // Fetch all existing channels
    console.log("📋 Fetching existing channels...");
    const response = await databases.listDocuments(
      config.databaseId,
      config.channelsCollectionId,
      [Query.limit(100)],
    );

    console.log(`Found ${response.documents.length} channels\n`);

    const results = {
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Update each channel
    for (const channel of response.documents) {
      const channelId = channel.channelId;
      const channelName = channel.channelName;

      console.log(`Processing: ${channelName} (${channelId})`);

      // Find configuration for this channel
      const channelConfig = CHANNEL_CONFIG.find(
        (c) => c.channelId === channelId,
      );

      if (!channelConfig) {
        console.log(
          `  ⚠️  No configuration found, using defaults (isOfficial: true, isOther: false)`,
        );
        // Use defaults if not in config
        try {
          await databases.updateDocument(
            config.databaseId,
            config.channelsCollectionId,
            channel.$id,
            {
              isOfficial: true,
              isOther: false,
            },
          );
          console.log(`  ✅ Updated with defaults\n`);
          results.updated++;
        } catch (error) {
          const errorMsg = `Error updating ${channelName}: ${error.message}`;
          console.error(`  ❌ ${errorMsg}\n`);
          results.errors.push(errorMsg);
        }
        continue;
      }

      // Update with configured values
      try {
        await databases.updateDocument(
          config.databaseId,
          config.channelsCollectionId,
          channel.$id,
          {
            isOfficial: channelConfig.isOfficial,
            isOther: channelConfig.isOther,
          },
        );
        console.log(
          `  ✅ Updated: isOfficial=${channelConfig.isOfficial}, isOther=${channelConfig.isOther}\n`,
        );
        results.updated++;
      } catch (error) {
        const errorMsg = `Error updating ${channelName}: ${error.message}`;
        console.error(`  ❌ ${errorMsg}\n`);
        results.errors.push(errorMsg);
      }
    }

    // Summary
    console.log("\n✨ Channel flags update complete!");
    console.log("\n📊 Summary:");
    console.log(`  Updated: ${results.updated}`);
    console.log(`  Skipped: ${results.skipped}`);
    console.log(`  Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log("\n❌ Errors:");
      results.errors.forEach((err) => console.log(`  - ${err}`));
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run the script
updateChannelFlags();
