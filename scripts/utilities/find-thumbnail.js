/**
 * Find Thumbnail by YouTube ID
 */

const { Client, Databases, Query } = require("node-appwrite");
require("dotenv").config({ path: "apps/mobile/.env" });

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const naatsCollectionId = process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID;

async function findThumbnail(youtubeId) {
  try {
    console.log(`🔍 Searching for YouTube ID: ${youtubeId}\n`);

    const response = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [Query.equal("youtubeId", youtubeId)]
    );

    if (response.documents.length === 0) {
      console.log("❌ No naat found with that YouTube ID");
      return;
    }

    const naat = response.documents[0];
    console.log("✅ Found!\n");
    console.log(`Title: ${naat.title}`);
    console.log(`YouTube ID: ${naat.youtubeId}`);
    console.log(`Thumbnail URL: ${naat.thumbnailUrl}`);
    console.log(`Video URL: ${naat.videoUrl}`);
    console.log(`Channel: ${naat.channelName || "Unknown"}`);
  } catch (error) {
    console.error("\n❌ Failed to find thumbnail:", error);
    process.exit(1);
  }
}

// Get YouTube ID from command line argument or use default
const youtubeId = process.argv[2] || "-B8mXQVb7x8";
findThumbnail(youtubeId);
