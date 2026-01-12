/**
 * Audio Download and Upload Script - TERMUX VERSION
 *
 * This script:
 * 1. Fetches naats from the database that don't have audioId
 * 2. Downloads audio using yt-dlp from Termux environment
 * 3. Uploads to Appwrite Storage
 * 4. Updates database with audioId
 *
 * Termux Setup:
 *   pkg install python ffmpeg
 *   pip install yt-dlp
 *
 * Usage:
 *   node scripts/utilities/download-audio-termux.js [--limit=10] [--test]
 *
 * Options:
 *   --limit=N    Process only N videos (default: all)
 *   --test       Test mode: download only, no upload
 */

const { exec } = require("child_process");
const dotenv = require("dotenv");
const { existsSync, mkdirSync, unlinkSync, statSync } = require("fs");
const { Client, Databases, Query, Storage, ID } = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");
const { join } = require("path");
const { promisify } = require("util");

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: ".env.appwrite" });

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID;
const AUDIO_BUCKET_ID = "audio-files";

// Parse command line arguments
const args = process.argv.slice(2);
const limit =
  parseInt(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1]) ||
  null;
const testMode = args.includes("--test");

// Temp directory for downloads
const TEMP_DIR = join(process.cwd(), "temp-audio");

// Initialize Appwrite
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

/**
 * Ensure temp directory exists
 */
function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`✓ Created temp directory: ${TEMP_DIR}`);
  }
}

/**
 * Find yt-dlp executable in Termux
 */
async function findYtDlp() {
  const possiblePaths = [
    "yt-dlp", // In PATH
    "$PREFIX/bin/yt-dlp",
    "$HOME/.local/bin/yt-dlp",
    "/data/data/com.termux/files/usr/bin/yt-dlp",
  ];

  for (const path of possiblePaths) {
    try {
      const { stdout } = await execAsync(
        `which ${path} 2>/dev/null || echo ""`
      );
      if (stdout.trim()) {
        console.log(`✓ Found yt-dlp at: ${stdout.trim()}`);
        return stdout.trim();
      }
    } catch (error) {
      // Continue to next path
    }
  }

  // Try direct execution
  try {
    await execAsync("yt-dlp --version");
    console.log("✓ yt-dlp is available in PATH");
    return "yt-dlp";
  } catch (error) {
    throw new Error("yt-dlp not found. Install it with: pip install yt-dlp");
  }
}

/**
 * Download audio using yt-dlp (Termux version using exec)
 */
async function downloadAudio(youtubeId, title, ytdlpPath) {
  const sanitizedTitle = title.replace(/[^a-z0-9]/gi, "_").substring(0, 50);
  const outputPath = join(TEMP_DIR, `${youtubeId}_${sanitizedTitle}.m4a`);

  console.log(`  Downloading: ${title}`);
  console.log(`  YouTube ID: ${youtubeId}`);

  const command = `${ytdlpPath} --extractor-args "youtube:player_client=android" -f "bestaudio[ext=m4a]/bestaudio" --extract-audio --audio-format m4a --audio-quality 128K -o "${outputPath}" --no-playlist "https://www.youtube.com/watch?v=${youtubeId}"`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stderr) {
      console.log(`  ℹ️  ${stderr.substring(0, 100)}...`);
    }

    if (existsSync(outputPath)) {
      console.log(`  ✓ Downloaded successfully`);
      return outputPath;
    } else {
      throw new Error("Download completed but file not found");
    }
  } catch (error) {
    throw new Error(`yt-dlp failed: ${error.message}`);
  }
}

/**
 * Upload audio file to Appwrite Storage
 */
async function uploadAudio(filePath, youtubeId) {
  console.log(`  Uploading to Appwrite Storage...`);

  try {
    const fileName = `${youtubeId}.m4a`;
    const fileSize = statSync(filePath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

    console.log(`  File size: ${fileSizeMB}MB`);

    const file = await storage.createFile({
      bucketId: AUDIO_BUCKET_ID,
      fileId: ID.unique(),
      file: InputFile.fromPath(filePath, fileName),
    });

    console.log(`  ✓ Uploaded: ${file.$id}`);
    return file.$id;
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Update naat document with audioId
 */
async function updateNaatWithAudioId(naatId, audioFileId) {
  await databases.updateDocument(DATABASE_ID, NAATS_COLLECTION_ID, naatId, {
    audioId: audioFileId,
  });
  console.log(`  ✓ Updated naat document with audioId`);
}

/**
 * Clean up temporary file
 */
function cleanupTempFile(filePath) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      console.log(`  ✓ Cleaned up temp file`);
    }
  } catch (error) {
    console.warn(`  ⚠ Failed to cleanup: ${error.message}`);
  }
}

/**
 * Process a single naat
 */
async function processNaat(naat, index, total, ytdlpPath) {
  console.log(`\n[${index + 1}/${total}] Processing: ${naat.title}`);

  let tempFilePath = null;

  try {
    // Download audio
    tempFilePath = await downloadAudio(naat.youtubeId, naat.title, ytdlpPath);

    if (!testMode) {
      // Upload to Appwrite
      const audioFileId = await uploadAudio(tempFilePath, naat.youtubeId);

      // Update database
      await updateNaatWithAudioId(naat.$id, audioFileId);
    } else {
      console.log(`  ℹ️  Test mode: skipping upload`);
    }

    console.log(`  ✅ Success!`);
    return { success: true, naatId: naat.$id };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { success: false, naatId: naat.$id, error: error.message };
  } finally {
    // Cleanup temp file (unless test mode)
    if (tempFilePath && !testMode) {
      cleanupTempFile(tempFilePath);
    }
  }
}

/**
 * Fetch all naats without audioId using pagination
 */
async function fetchAllNaatsWithoutAudio(userLimit = null) {
  const BATCH_SIZE = 100;
  let allNaats = [];
  let offset = 0;
  let hasMore = true;

  console.log("📥 Fetching naats from database in batches...");

  while (hasMore) {
    const queries = [
      Query.isNull("audioId"),
      Query.limit(BATCH_SIZE),
      Query.offset(offset),
    ];

    const response = await databases.listDocuments(
      DATABASE_ID,
      NAATS_COLLECTION_ID,
      queries
    );

    const batch = response.documents;
    allNaats.push(...batch);

    console.log(
      `  Fetched batch: ${batch.length} naats (total: ${allNaats.length})`
    );

    // Check if we should continue
    hasMore = batch.length === BATCH_SIZE;
    offset += BATCH_SIZE;

    // If user specified a limit, stop when we reach it
    if (userLimit && allNaats.length >= userLimit) {
      allNaats = allNaats.slice(0, userLimit);
      hasMore = false;
    }
  }

  return allNaats;
}

/**
 * Main function
 */
async function main() {
  console.log("🎵 Audio Download and Upload Script (TERMUX)\n");
  console.log("Configuration:");
  console.log(`  Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`  Project: ${APPWRITE_PROJECT_ID}`);
  console.log(`  Database: ${DATABASE_ID}`);
  console.log(`  Collection: ${NAATS_COLLECTION_ID}`);
  console.log(`  Bucket: ${AUDIO_BUCKET_ID}`);
  console.log(`  Limit: ${limit || "All videos"}`);
  console.log(
    `  Mode: ${testMode ? "Test (no upload)" : "Full (download + upload)"}\n`
  );

  // Find yt-dlp executable
  console.log("🔍 Locating yt-dlp...");
  const ytdlpPath = await findYtDlp();

  // Ensure temp directory exists
  ensureTempDir();

  // Fetch all naats without audio using pagination
  const naats = await fetchAllNaatsWithoutAudio(limit);
  console.log(`✓ Found ${naats.length} naats without audio\n`);

  if (naats.length === 0) {
    console.log("No naats to process. All videos already have audio!");
    return;
  }

  // Process each naat
  const results = [];
  for (let i = 0; i < naats.length; i++) {
    const result = await processNaat(naats[i], i, naats.length, ytdlpPath);
    results.push(result);

    // Small delay between downloads
    if (i < naats.length - 1) {
      console.log("  ⏳ Waiting 2 seconds before next download...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Summary:");
  console.log(`  Total processed: ${results.length}`);
  console.log(`  Successful: ${results.filter((r) => r.success).length}`);
  console.log(`  Failed: ${results.filter((r) => !r.success).length}`);

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    console.log("\n❌ Failed naats:");
    failed.forEach((f) => {
      console.log(`  - ${f.naatId}: ${f.error}`);
    });
  }

  console.log("=".repeat(60));

  if (testMode) {
    console.log(`\n✅ Test completed! Audio files saved to: ${TEMP_DIR}`);
  } else {
    console.log("\n✅ Done! All audio files uploaded to Appwrite Storage");
  }
}

// Run the script
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
