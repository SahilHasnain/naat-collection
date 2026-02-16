/**
 * Get Thumbnail Links from NaatDB
 *
 * This script fetches all naats from the database and displays their thumbnail URLs
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

async function getAllNaats() {
  const allNaats = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  console.log("📥 Fetching all naats from database...\n");

  while (hasMore) {
    const response = await databases.listDocuments(
      databaseId,
      naatsCollectionId,
      [Query.limit(limit), Query.offset(offset)],
    );

    allNaats.push(...response.documents);
    offset += limit;
    hasMore = response.documents.length === limit;

    process.stdout.write(`\r   Fetched: ${allNaats.length} naats...`);
  }

  console.log(`\n✅ Total naats in database: ${allNaats.length}\n`);
  return allNaats;
}

async function getThumbnails() {
  try {
    console.log("🖼️  Fetching Thumbnail Links from NaatDB\n");
    console.log("================================\n");

    const allNaats = await getAllNaats();

    if (allNaats.length === 0) {
      console.log("❌ No naats found in database");
      return;
    }

    console.log("📋 Thumbnail Links:\n");

    allNaats.forEach((naat, index) => {
      console.log(`${index + 1}. ${naat.title}`);
      console.log(`   YouTube ID: ${naat.youtubeId}`);
      console.log(`   Thumbnail: ${naat.thumbnailUrl}`);
      console.log(`   Channel: ${naat.channelName || "Unknown"}`);
      console.log("");
    });

    console.log("================================");
    console.log(`✅ Total thumbnails: ${allNaats.length}`);
  } catch (error) {
    console.error("\n❌ Failed to fetch thumbnails:", error);
    process.exit(1);
  }
}

// Run the script
getThumbnails();
