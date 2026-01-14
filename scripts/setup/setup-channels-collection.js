/**
 * Setup Channels Collection Script
 *
 * This script creates the channels collection with all required attributes and indexes.
 * Run this once to set up the collection in your Appwrite database.
 *
 * Usage: node scripts/setup-channels-collection.js
 */

require("dotenv").config({ path: ".env.appwrite" });
const { Client, Databases, ID, IndexType } = require("node-appwrite");

// Configuration from environment variables
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || "",
  projectId: process.env.APPWRITE_PROJECT_ID || "",
  apiKey: process.env.APPWRITE_API_KEY || "",
  databaseId: process.env.APPWRITE_DATABASE_ID || "",
  channelsCollectionId:
    process.env.APPWRITE_CHANNELS_COLLECTION_ID || "channels",
};

async function setupChannelsCollection() {
  console.log("🚀 Starting channels collection setup...\n");

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
      "  - APPWRITE_CHANNELS_COLLECTION_ID (defaults to 'channels')"
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
    // Step 1: Create the collection
    console.log("📦 Creating channels collection...");
    const collection = await databases.createCollection(
      config.databaseId,
      config.channelsCollectionId,
      "Channels",
      [
        'read("any")', // Allow anyone to read channels
      ],
      false // documentSecurity
    );
    console.log(`✅ Collection created: ${collection.$id}\n`);

    // Step 2: Create attributes
    console.log("🔧 Creating attributes...");

    // channelId (String, Required, Unique)
    await databases.createStringAttribute(
      config.databaseId,
      config.channelsCollectionId,
      "channelId",
      255,
      true // required
    );
    console.log("  ✅ channelId (String, 255, Required)");

    // channelName (String, Required)
    await databases.createStringAttribute(
      config.databaseId,
      config.channelsCollectionId,
      "channelName",
      255,
      true // required
    );
    console.log("  ✅ channelName (String, 255, Required)");

    // naatCount (Integer, Optional)
    await databases.createIntegerAttribute(
      config.databaseId,
      config.channelsCollectionId,
      "naatCount",
      false, // required
      0, // min
      undefined, // max
      0 // default
    );
    console.log("  ✅ naatCount (Integer, Optional, Default: 0)");

    // lastUpdated (DateTime, Optional)
    await databases.createDatetimeAttribute(
      config.databaseId,
      config.channelsCollectionId,
      "lastUpdated",
      false // required
    );
    console.log("  ✅ lastUpdated (DateTime, Optional)\n");

    // Wait for attributes to be available
    console.log("⏳ Waiting for attributes to be available (5 seconds)...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 3: Create indexes
    console.log("\n🔍 Creating indexes...");

    // Unique index on channelId
    await databases.createIndex(
      config.databaseId,
      config.channelsCollectionId,
      "channelId_unique",
      IndexType.Unique,
      ["channelId"]
    );
    console.log("  ✅ Unique index on channelId");

    // Index on channelName for sorting
    await databases.createIndex(
      config.databaseId,
      config.channelsCollectionId,
      "channelName_index",
      IndexType.Key,
      ["channelName"],
      ["ASC"]
    );
    console.log("  ✅ Index on channelName (ASC)");

    console.log("\n✨ Channels collection setup complete!");
    console.log("\n📝 Next steps:");
    console.log(
      "  1. Add EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID to your .env file"
    );
    console.log(
      `     EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID=${config.channelsCollectionId}`
    );
    console.log("  2. Run the migration script to populate existing channels:");
    console.log("     node scripts/migrate-channels.js");
    console.log(
      "  3. Update your ingestion function to maintain the channels collection"
    );
  } catch (error) {
    console.error("\n❌ Error setting up collection:");

    if (error.code === 409) {
      console.error(
        `Collection '${config.channelsCollectionId}' already exists.`
      );
      console.error(
        "If you want to recreate it, delete it first from the Appwrite console."
      );
    } else {
      console.error(error.message || error);
    }

    process.exit(1);
  }
}

// Run the setup
setupChannelsCollection();
