/**
 * Add Channel Attributes Script
 *
 * This script adds the isOfficial and isOther boolean attributes
 * to an existing channels collection.
 *
 * Usage: node scripts/setup/add-channel-attributes.js
 */

require("dotenv").config({ path: "apps/mobile/.env" });
const { Client, Databases } = require("node-appwrite");

// Configuration from environment variables
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || "",
  projectId: process.env.APPWRITE_PROJECT_ID || "",
  apiKey: process.env.APPWRITE_API_KEY || "",
  databaseId: process.env.APPWRITE_DATABASE_ID || "",
  channelsCollectionId:
    process.env.APPWRITE_CHANNELS_COLLECTION_ID || "channels",
};

async function addChannelAttributes() {
  console.log("🚀 Starting channel attributes addition...\n");

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
    console.error("\nOptional:");
    console.error(
      "  - APPWRITE_CHANNELS_COLLECTION_ID (defaults to 'channels')",
    );
    process.exit(1);
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  const databases = new Databases(client);

  try {
    console.log("🔧 Adding new attributes to channels collection...\n");

    // Add isOfficial attribute (Boolean, Optional, Default: true)
    console.log("Adding isOfficial attribute...");
    await databases.createBooleanAttribute(
      config.databaseId,
      config.channelsCollectionId,
      "isOfficial",
      false, // required = false (optional)
      true, // default
    );
    console.log("  ✅ isOfficial (Boolean, Optional, Default: true)");

    // Add isOther attribute (Boolean, Optional, Default: false)
    console.log("Adding isOther attribute...");
    await databases.createBooleanAttribute(
      config.databaseId,
      config.channelsCollectionId,
      "isOther",
      false, // required = false (optional)
      false, // default
    );
    console.log("  ✅ isOther (Boolean, Optional, Default: false)");

    console.log("\n⏳ Waiting for attributes to be available (5 seconds)...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("\n✨ Attributes added successfully!");
    console.log("\n📝 Next steps:");
    console.log(
      "  1. Run the update script to set flags for existing channels:",
    );
    console.log("     node scripts/data-management/update-channel-flags.js");
    console.log(
      "  2. Update your ingestion function environment variables to include:",
    );
    console.log("     APPWRITE_CHANNELS_COLLECTION_ID");
  } catch (error) {
    console.error("\n❌ Error adding attributes:");

    if (error.code === 409) {
      console.error("Attribute already exists.");
      console.error(
        "If you want to recreate it, delete it first from the Appwrite console.",
      );
    } else {
      console.error(error.message || error);
    }

    process.exit(1);
  }
}

// Run the script
addChannelAttributes();
