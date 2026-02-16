/**
 * Export Thumbnail Links from NaatDB
 *
 * This script fetches all naats from the database and exports thumbnail data
 * to a JSON file for easy access and processing
 */

const { Client, Databases, Query } = require("node-appwrite");
const fs = require("fs");
const path = require("path");
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

async function exportThumbnails() {
  try {
    console.log("🖼️  Exporting Thumbnail Links from NaatDB\n");
    console.log("================================\n");

    const allNaats = await getAllNaats();

    if (allNaats.length === 0) {
      console.log("❌ No naats found in database");
      return;
    }

    // Extract thumbnail data
    const thumbnailData = allNaats.map((naat) => ({
      id: naat.$id,
      title: naat.title,
      youtubeId: naat.youtubeId,
      thumbnailUrl: naat.thumbnailUrl,
      channelName: naat.channelName || "Unknown",
      videoUrl: naat.videoUrl,
      duration: naat.duration,
      uploadDate: naat.uploadDate,
    }));

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to JSON file
    const outputPath = path.join(outputDir, "thumbnails.json");
    fs.writeFileSync(outputPath, JSON.stringify(thumbnailData, null, 2));

    console.log(
      `✅ Exported ${thumbnailData.length} thumbnails to: ${outputPath}\n`,
    );

    // Also create a simple text file with just URLs
    const urlsPath = path.join(outputDir, "thumbnail-urls.txt");
    const urls = thumbnailData.map((item) => item.thumbnailUrl).join("\n");
    fs.writeFileSync(urlsPath, urls);

    console.log(`✅ Exported thumbnail URLs to: ${urlsPath}\n`);

    // Display sample
    console.log("📋 Sample (first 5):\n");
    thumbnailData.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Thumbnail: ${item.thumbnailUrl}`);
      console.log("");
    });

    console.log("================================");
    console.log(
      `✅ Export complete! Total: ${thumbnailData.length} thumbnails`,
    );
  } catch (error) {
    console.error("\n❌ Failed to export thumbnails:", error);
    process.exit(1);
  }
}

// Run the script
exportThumbnails();
