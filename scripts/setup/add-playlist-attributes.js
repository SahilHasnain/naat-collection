/**
 * Add Playlist Attributes Script
 *
 * This script adds the type and playlistId attributes to the channels collection
 * to support ingesting videos from playlists.
 *
 * Usage: node scripts/setup/add-playlist-attributes.js
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

async function addPlaylistAttributes() {
  console.log("🚀 Starting playlist attributes addition...\n");

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
    console.log("🔧 Adding new attributes to channels collection...\n");

    // Add type attribute (String, Optional, Default: "channel")
    console.log("Adding type attribute...");
    await databases.createStringAttribute(
      config.databaseId,
      config.channelsCollectionId,
      "type",
      20, // max length
      false, // required = false (optional)
      "channel", // default
      false, // array
    );
    console.log("  ✅ type (String, Optional, Default: 'channel')");

    // Add playlistId attribute (String, Optional)
    console.log("Adding playlistId attribute...");
    await databases.createStringAttribute(
      config.databaseId,
      config.channelsCollectionId,
      "playlistId",
      255, // max length
      false, // required = false (optional)
      undefined, // no default
      false, // array
    );
    console.log("  ✅ playlistId (String, Optional)");

    console.log("\n⏳ Waiting for attributes to be available (5 seconds)...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("\n✨ Attributes added successfully!");
    console.log("\n📝 Next steps:");
    console.log("  1. Run the script to add playlist 'channels':");
    console.log("     node scripts/data-management/add-playlists.js");
    console.log("  2. Update the ingestion function to handle playlists");
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
addPlaylistAttributes();
