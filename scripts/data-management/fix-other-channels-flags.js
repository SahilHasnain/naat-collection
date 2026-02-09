/**
 * Fix Other Channels Flags Script
 *
 * This script updates the isOfficial flag to false for the "other" channels.
 *
 * Usage: node scripts/data-management/fix-other-channels-flags.js
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

// Channels to update
const CHANNELS_TO_UPDATE = [
  "UCHV-bsO-jhfj_WN_3xoicrw", // Tayyiba Production
  "UCY_o15b4ZSt3e0gAXYTOSqQ", // Qadri Ziai Sound
  "UCF5QXTRLz-9nAz1kks9nfLw", // Al Noor Media Production
];

async function main() {
  console.log("🚀 Fixing channel flags...\n");

  // Validate configuration
  if (
    !config.endpoint ||
    !config.projectId ||
    !config.apiKey ||
    !config.databaseId
  ) {
    console.error("❌ Error: Missing required environment variables");
    process.exit(1);
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  const databases = new Databases(client);

  const results = {
    updated: 0,
    notFound: 0,
    errors: [],
  };

  for (const channelId of CHANNELS_TO_UPDATE) {
    console.log(`📺 Processing: ${channelId}`);

    try {
      // Find the channel document
      const response = await databases.listDocuments(
        config.databaseId,
        config.channelsCollectionId,
        [Query.equal("channelId", channelId), Query.limit(1)],
      );

      if (response.documents.length === 0) {
        console.log(`  ⚠️  Channel not found\n`);
        results.notFound++;
        continue;
      }

      const channel = response.documents[0];
      console.log(`  Found: ${channel.channelName}`);

      // Update the channel
      await databases.updateDocument(
        config.databaseId,
        config.channelsCollectionId,
        channel.$id,
        {
          isOfficial: false,
        },
      );

      console.log(`  ✅ Updated: isOfficial=false\n`);
      results.updated++;
    } catch (error) {
      const errorMsg = `Error updating ${channelId}: ${error.message}`;
      console.error(`  ❌ ${errorMsg}\n`);
      results.errors.push(errorMsg);
    }
  }

  // Summary
  console.log("\n✨ Update complete!");
  console.log("\n📊 Summary:");
  console.log(`  Updated: ${results.updated}`);
  console.log(`  Not Found: ${results.notFound}`);
  console.log(`  Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log("\n❌ Errors:");
    results.errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log("\n📝 All 'other' channels now have:");
  console.log("  - isOfficial: false (will filter for Owais Raza Qadri only)");
  console.log("  - isOther: true (will appear in 'Other' tab)");
}

// Run the script
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
