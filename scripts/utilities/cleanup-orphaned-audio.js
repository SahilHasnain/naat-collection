#!/usr/bin/env node

/**
 * Cleanup Orphaned Audio Files
 *
 * This script finds and deletes audio files in storage that don't have
 * corresponding documents in the database (orphaned files).
 */

const { Client, Databases, Storage, Query } = require("node-appwrite");
require("dotenv").config();

const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID;
const AUDIO_BUCKET_ID = "audio-files";

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

  return {
    databases: new Databases(client),
    storage: new Storage(client),
  };
}

/**
 * Get all audioIds from the database
 */
async function getAllAudioIdsFromDatabase(databases) {
  console.log("📦 Fetching all audioIds from database...");

  const audioIds = new Set();
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.limit(limit),
      Query.offset(offset),
      Query.isNotNull("audioId"),
    ]);

    response.documents.forEach((doc) => {
      if (doc.audioId) {
        audioIds.add(doc.audioId);
      }
    });

    console.log(`   Fetched ${audioIds.size} audioIds so far...`);

    if (response.documents.length < limit) {
      break;
    }

    offset += limit;
  }

  console.log(`✅ Found ${audioIds.size} audioIds in database\n`);
  return audioIds;
}

/**
 * Get all file IDs from storage bucket
 */
async function getAllFilesFromStorage(storage) {
  console.log("📦 Fetching all files from storage bucket...");

  const fileIds = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    try {
      const response = await storage.listFiles(AUDIO_BUCKET_ID, [
        Query.limit(limit),
        Query.offset(offset),
      ]);

      response.files.forEach((file) => {
        fileIds.push({
          id: file.$id,
          name: file.name,
          size: file.sizeOriginal,
        });
      });

      console.log(`   Fetched ${fileIds.length} files so far...`);

      if (response.files.length < limit) {
        break;
      }

      offset += limit;
    } catch (error) {
      if (error.code === 404) {
        console.log("   Bucket not found or empty");
        break;
      }
      throw error;
    }
  }

  console.log(`✅ Found ${fileIds.length} files in storage\n`);
  return fileIds;
}

/**
 * Delete a file from storage
 */
async function deleteFile(storage, fileId) {
  try {
    await storage.deleteFile(AUDIO_BUCKET_ID, fileId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

async function cleanupOrphanedAudio() {
  console.log("🗑️  Starting cleanup of orphaned audio files...\n");

  try {
    validateEnv();
    console.log("✅ Environment variables validated\n");

    const { databases, storage } = initAppwrite();

    // Get all audioIds from database
    const databaseAudioIds = await getAllAudioIdsFromDatabase(databases);

    // Get all files from storage
    const storageFiles = await getAllFilesFromStorage(storage);

    if (storageFiles.length === 0) {
      console.log("✅ No files in storage. Nothing to clean up!");
      return;
    }

    // Find orphaned files (in storage but not in database)
    const orphanedFiles = storageFiles.filter(
      (file) => !databaseAudioIds.has(file.id),
    );

    console.log("📊 Analysis:");
    console.log(`   Files in storage: ${storageFiles.length}`);
    console.log(`   AudioIds in database: ${databaseAudioIds.size}`);
    console.log(`   Orphaned files: ${orphanedFiles.length}\n`);

    if (orphanedFiles.length === 0) {
      console.log("✅ No orphaned files found. Storage is clean!");
      return;
    }

    // Calculate total size of orphaned files
    const totalSize = orphanedFiles.reduce((sum, file) => sum + file.size, 0);

    console.log("🗑️  Orphaned files to delete:");
    console.log("─".repeat(80));
    orphanedFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   ID: ${file.id} | Size: ${formatBytes(file.size)}`);
    });
    console.log("─".repeat(80));
    console.log(`\nTotal size to free: ${formatBytes(totalSize)}\n`);

    // Ask for confirmation
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      `⚠️  Delete ${orphanedFiles.length} orphaned files? (yes/no): `,
      async (answer) => {
        rl.close();

        if (answer.toLowerCase() !== "yes") {
          console.log("\n❌ Cleanup cancelled.");
          process.exit(0);
        }

        console.log("\n🗑️  Deleting orphaned files...\n");

        let deletedCount = 0;
        let errorCount = 0;
        let freedSpace = 0;

        for (let i = 0; i < orphanedFiles.length; i++) {
          const file = orphanedFiles[i];
          console.log(
            `[${i + 1}/${orphanedFiles.length}] Deleting: ${file.name}`,
          );

          const result = await deleteFile(storage, file.id);

          if (result.success) {
            console.log(`   ✅ Deleted (freed ${formatBytes(file.size)})`);
            deletedCount++;
            freedSpace += file.size;
          } else {
            console.log(`   ❌ Error: ${result.error}`);
            errorCount++;
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log("\n" + "=".repeat(80));
        console.log("📊 Cleanup Summary:");
        console.log(`   Total orphaned files: ${orphanedFiles.length}`);
        console.log(`   Successfully deleted: ${deletedCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log(`   Space freed: ${formatBytes(freedSpace)}`);
        console.log("=".repeat(80));

        if (deletedCount > 0) {
          console.log("\n✨ Cleanup completed successfully!");
        }
      },
    );
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run cleanup
cleanupOrphanedAudio();
