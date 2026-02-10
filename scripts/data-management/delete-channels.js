#!/usr/bin/env node

const { Client, Databases, Storage, Query } = require("node-appwrite");
require("dotenv").config();

const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.EXPO_PUBLIC_DATABASE_ID;
const NAATS_COLLECTION_ID = process.env.EXPO_PUBLIC_COLLECTION_ID;
const CHANNELS_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID;
const AUDIO_BUCKET_ID = "audio-files";

// Channels to delete
const CHANNELS_TO_DELETE = [
  "UCY_o15b4ZSt3e0gAXYTOSqQ",
  "UCF5QXTRLz-9nAz1kks9nfLw",
];

function validateEnv() {
  const required = [
    "EXPO_PUBLIC_APPWRITE_ENDPOINT",
    "EXPO_PUBLIC_APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "EXPO_PUBLIC_DATABASE_ID",
    "EXPO_PUBLIC_COLLECTION_ID",
    "EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID",
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

  return {
    databases: new Databases(client),
    storage: new Storage(client),
  };
}

async function deleteAudioFile(storage, audioFileId) {
  try {
    await storage.deleteFile(AUDIO_BUCKET_ID, audioFileId);
    return true;
  } catch (error) {
    if (error.code === 404) {
      console.log(`   ⚠️  Audio file not found: ${audioFileId}`);
      return true; // Consider it deleted if not found
    }
    console.error(
      `   ❌ Error deleting audio file ${audioFileId}:`,
      error.message,
    );
    return false;
  }
}

async function deleteChannelDocuments(databases, storage, channelId) {
  console.log(`\n🔍 Processing channel: ${channelId}`);

  let totalDeleted = 0;
  let totalAudioDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      // Fetch documents for this channel in batches
      const response = await databases.listDocuments(
        DATABASE_ID,
        NAATS_COLLECTION_ID,
        [Query.equal("channelId", channelId), Query.limit(100)],
      );

      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`   📦 Found ${response.documents.length} documents...`);

      // Delete each document and its audio file
      for (const doc of response.documents) {
        try {
          // Delete audio file if it exists
          if (doc.audioFileId) {
            const audioDeleted = await deleteAudioFile(
              storage,
              doc.audioFileId,
            );
            if (audioDeleted) {
              totalAudioDeleted++;
              console.log(`   🎵 Deleted audio: ${doc.audioFileId}`);
            }
          }

          // Delete the document
          await databases.deleteDocument(
            DATABASE_ID,
            NAATS_COLLECTION_ID,
            doc.$id,
          );
          totalDeleted++;
          console.log(`   ✅ Deleted document: ${doc.title || doc.$id}`);
        } catch (error) {
          console.error(
            `   ❌ Error deleting document ${doc.$id}:`,
            error.message,
          );
        }
      }

      console.log(
        `   Progress: ${totalDeleted} documents, ${totalAudioDeleted} audio files deleted...`,
      );
    } catch (error) {
      console.error(
        `   ❌ Error fetching documents for channel ${channelId}:`,
        error.message,
      );
      hasMore = false;
    }
  }

  return { documents: totalDeleted, audioFiles: totalAudioDeleted };
}

async function deleteChannelFromCollection(databases, channelId) {
  try {
    // Find the channel document
    const response = await databases.listDocuments(
      DATABASE_ID,
      CHANNELS_COLLECTION_ID,
      [Query.equal("channelId", channelId)],
    );

    if (response.documents.length === 0) {
      console.log(
        `   ⚠️  Channel not found in channels collection: ${channelId}`,
      );
      return false;
    }

    // Delete the channel document
    for (const doc of response.documents) {
      await databases.deleteDocument(
        DATABASE_ID,
        CHANNELS_COLLECTION_ID,
        doc.$id,
      );
      console.log(
        `   ✅ Deleted channel from collection: ${doc.name || channelId}`,
      );
    }

    return true;
  } catch (error) {
    console.error(
      `   ❌ Error deleting channel from collection:`,
      error.message,
    );
    return false;
  }
}

async function deleteChannels() {
  console.log("🗑️  Starting deletion of specified channels...\n");
  console.log("Channels to delete:");
  CHANNELS_TO_DELETE.forEach((id) => console.log(`   - ${id}`));
  console.log();

  try {
    validateEnv();
    console.log("✅ Environment variables validated");

    const { databases, storage } = initAppwrite();
    console.log("✅ Appwrite client initialized");

    let totalDocuments = 0;
    let totalAudioFiles = 0;
    let totalChannels = 0;

    // Process each channel
    for (const channelId of CHANNELS_TO_DELETE) {
      const stats = await deleteChannelDocuments(databases, storage, channelId);
      totalDocuments += stats.documents;
      totalAudioFiles += stats.audioFiles;

      // Delete from channels collection
      const channelDeleted = await deleteChannelFromCollection(
        databases,
        channelId,
      );
      if (channelDeleted) {
        totalChannels++;
      }
    }

    console.log("\n📊 Deletion Summary:");
    console.log(`   📄 Total documents deleted: ${totalDocuments}`);
    console.log(`   🎵 Total audio files deleted: ${totalAudioFiles}`);
    console.log(`   📺 Total channels deleted: ${totalChannels}`);
    console.log("\n✨ Deletion complete!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
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
  "⚠️  WARNING: This will delete all documents, audio files, and channel entries for:",
);
CHANNELS_TO_DELETE.forEach((id) => console.log(`   - ${id}`));
console.log();

rl.question("Are you sure you want to continue? (yes/no): ", (answer) => {
  if (answer.toLowerCase() === "yes") {
    rl.close();
    deleteChannels();
  } else {
    console.log("\n❌ Deletion cancelled.");
    rl.close();
    process.exit(0);
  }
});
