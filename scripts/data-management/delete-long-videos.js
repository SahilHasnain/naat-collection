#!/usr/bin/env node

/**
 * Script to delete all videos with duration greater than 1 hour (3600 seconds)
 * from the naatDB collection in Appwrite
 */

const { Client, Databases, Query } = require("node-appwrite");
require("dotenv").config();

const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID;

function validateEnv() {
  const required = [
    "EXPO_PUBLIC_APPWRITE_ENDPOINT",
    "EXPO_PUBLIC_APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "EXPO_PUBLIC_APPWRITE_DATABASE_ID",
    "EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }
}

function initAppwrite() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  return new Databases(client);
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

async function deleteLongVideos() {
  console.log(
    "🗑️  Starting deletion of videos with duration > 1 hour (3600 seconds)...\n",
  );

  try {
    validateEnv();
    console.log("✅ Environment variables validated");

    const databases = initAppwrite();
    console.log("✅ Appwrite client initialized\n");

    // Fetch all documents with duration > 3600
    console.log("📦 Fetching videos with duration > 1 hour...");

    const allLongVideos = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.greaterThan("duration", 3600),
          Query.limit(limit),
          Query.offset(offset),
        ],
      );

      allLongVideos.push(...response.documents);

      console.log(
        `   Fetched ${response.documents.length} videos (offset: ${offset})`,
      );

      if (response.documents.length < limit) {
        break;
      }

      offset += limit;
    }

    console.log(
      `\n📊 Found ${allLongVideos.length} videos with duration > 1 hour\n`,
    );

    if (allLongVideos.length === 0) {
      console.log("✅ No videos to delete. Database is clean!");
      return;
    }

    // Display videos to be deleted
    console.log("Videos to be deleted:");
    console.log("─".repeat(100));
    allLongVideos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`);
      console.log(
        `   Duration: ${formatDuration(video.duration)} (${video.duration}s) | YouTube ID: ${video.youtubeId}`,
      );
    });
    console.log("─".repeat(100));
    console.log();

    // Delete each video
    let deletedCount = 0;
    let errorCount = 0;

    for (const video of allLongVideos) {
      try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, video.$id);
        deletedCount++;
        console.log(
          `✅ Deleted: ${video.title} (${formatDuration(video.duration)})`,
        );
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to delete ${video.title}: ${error.message}`);
      }
    }

    console.log("\n" + "=".repeat(100));
    console.log("📊 Deletion Summary:");
    console.log(`   Total found: ${allLongVideos.length}`);
    console.log(`   Successfully deleted: ${deletedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log("=".repeat(100));

    if (deletedCount > 0) {
      console.log("\n✨ Deletion completed successfully!");
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Confirmation prompt
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log(
  "⚠️  WARNING: This will delete ALL videos with duration > 1 hour (3600 seconds)!",
);
console.log(`   Database ID: ${process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID}`);
console.log(
  `   Collection ID: ${process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID}\n`,
);

rl.question("Are you sure you want to continue? (yes/no): ", (answer) => {
  if (answer.toLowerCase() === "yes") {
    rl.close();
    deleteLongVideos();
  } else {
    console.log("\n❌ Deletion cancelled.");
    rl.close();
    process.exit(0);
  }
});
