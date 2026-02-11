/**
 * Cut Audio by Timestamps Script
 *
 * This script:
 * 1. Reads cuts.json with YouTube ID and timestamp ranges
 * 2. Downloads audio from Appwrite storage using YouTube ID
 * 3. Cuts out the specified timestamp segments (explanations to remove)
 * 4. Uploads the processed audio back to Appwrite storage
 * 5. Updates the database with cutAudio attribute
 *
 * Usage:
 *   node scripts/audio-processing/cut-audio-by-timestamps.js
 */

const {
  Client,
  Databases,
  Storage,
  ID,
  Query,
} = require("node-appwrite");
const { InputFile } = require("node-appwrite/file")
const dotenv = require("dotenv");
const {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
} = require("fs");
const { join } = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Load environment variables
dotenv.config({ path: join(__dirname, "../../.env.appwrite") });

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID;
const AUDIO_BUCKET_ID = "audio-files";

// Directories
const TEMP_DIR = join(process.cwd(), "temp-audio-cuts");
const CUTS_FILE = join(process.cwd(), "cuts.json");

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

/**
 * Ensure directories exist
 */
function ensureDirectories() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`✓ Created directory: ${TEMP_DIR}`);
  }
}

/**
 * Load cuts configuration from JSON file
 */
function loadCutsConfig() {
  if (!existsSync(CUTS_FILE)) {
    throw new Error(`cuts.json not found at: ${CUTS_FILE}`);
  }

  const content = readFileSync(CUTS_FILE, "utf-8");
  return JSON.parse(content);
}

/**
 * Convert timestamp to seconds
 */
function timestampToSeconds(min, sec) {
  return min * 60 + sec;
}

/**
 * Find naat document by YouTube ID
 */
async function findNaatByYoutubeId(youtubeId) {
  console.log(`  Searching for naat with YouTube ID: ${youtubeId}`);

  const response = await databases.listDocuments(
    DATABASE_ID,
    NAATS_COLLECTION_ID,
    [Query.equal("youtubeId", youtubeId)],
  );

  if (response.documents.length === 0) {
    throw new Error(`Naat not found with YouTube ID: ${youtubeId}`);
  }

  const naat = response.documents[0];
  console.log(`  ✓ Found naat: ${naat.title || naat.$id}`);
  return naat;
}

/**
 * Download audio from Appwrite storage
 */
async function downloadAudioFromStorage(audioId, youtubeId) {
  const outputPath = join(TEMP_DIR, `${youtubeId}_original.m4a`);

  if (existsSync(outputPath)) {
    console.log(`  ✓ Audio already downloaded: ${outputPath}`);
    return outputPath;
  }

  console.log(`  Downloading audio from storage: ${audioId}`);

  try {
    const fileBuffer = await storage.getFileDownload(AUDIO_BUCKET_ID, audioId);
    writeFileSync(outputPath, Buffer.from(fileBuffer));
    console.log(`  ✓ Downloaded successfully`);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

/**
 * Build segments to keep (inverse of cuts)
 */
function buildKeepSegments(cuts, audioDuration) {
  // Convert cuts to seconds
  const cutSegments = cuts.map((cut) => ({
    start: timestampToSeconds(cut.start.min, cut.start.sec),
    end: timestampToSeconds(cut.end.min, cut.end.sec),
  }));

  // Sort by start time
  cutSegments.sort((a, b) => a.start - b.start);

  // Build segments to keep (everything except cuts)
  const keepSegments = [];
  let currentTime = 0;

  for (const cut of cutSegments) {
    // Add segment before this cut
    if (currentTime < cut.start) {
      keepSegments.push({
        start: currentTime,
        end: cut.start,
      });
    }
    currentTime = cut.end;
  }

  // Add final segment after last cut
  if (currentTime < audioDuration) {
    keepSegments.push({
      start: currentTime,
      end: audioDuration,
    });
  }

  console.log(`  ✓ Built ${keepSegments.length} segments to keep`);
  console.log(`  ✓ Removing ${cutSegments.length} explanation segments`);

  return keepSegments;
}

/**
 * Get audio duration
 */
async function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

/**
 * Cut audio and keep only specified segments
 */
async function cutAudio(inputPath, keepSegments, youtubeId) {
  console.log(`  Processing audio with ${keepSegments.length} segments...`);

  const outputPath = join(TEMP_DIR, `${youtubeId}_cut.m4a`);

  if (keepSegments.length === 0) {
    console.log(`  ⚠️  No segments to keep, skipping`);
    return null;
  }

  // If only one segment, simple cut
  if (keepSegments.length === 1) {
    const seg = keepSegments[0];
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(seg.start)
        .setDuration(seg.end - seg.start)
        .audioCodec("aac")
        .audioBitrate("256k")
        .audioFrequency(44100)
        .audioChannels(2)
        .outputOptions(["-q:a", "2"])
        .output(outputPath)
        .on("end", () => {
          console.log(`  ✓ Audio cut successfully (single segment)`);
          resolve(outputPath);
        })
        .on("error", (err) => {
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .run();
    });
  }

  // Multiple segments - concatenate
  return new Promise((resolve, reject) => {
    const filterComplex = [];

    // Extract each segment
    keepSegments.forEach((segment, index) => {
      filterComplex.push(
        `[0:a]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${index}]`,
      );
    });

    // Concatenate all segments
    const inputLabels = keepSegments.map((_, i) => `[a${i}]`).join("");
    filterComplex.push(
      `${inputLabels}concat=n=${keepSegments.length}:v=0:a=1[out]`,
    );

    ffmpeg(inputPath)
      .complexFilter(filterComplex)
      .outputOptions([
        "-map",
        "[out]",
        "-c:a",
        "aac",
        "-b:a",
        "256k",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-q:a",
        "2",
      ])
      .output(outputPath)
      .on("end", () => {
        console.log(
          `  ✓ Audio cut successfully - concatenated ${keepSegments.length} segments`,
        );
        resolve(outputPath);
      })
      .on("error", (err) => {
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .run();
  });
}

/**
 * Upload processed audio to Appwrite storage
 */
async function uploadAudioToStorage(audioPath, youtubeId) {
  console.log(`  Uploading processed audio to storage...`);

  try {
    const fileId = ID.unique();
    const fileName = `${youtubeId}_cut.m4a`;

    // Use InputFile.fromPath for Node.js file uploads
    const file = await storage.createFile(
      AUDIO_BUCKET_ID,
      fileId,
      InputFile.fromPath(audioPath, fileName),
    );

    console.log(`  ✓ Uploaded successfully: ${file.$id}`);
    return file.$id;
  } catch (error) {
    throw new Error(`Failed to upload audio: ${error.message}`);
  }
}

/**
 * Update naat document with cutAudio attribute
 */
async function updateNaatWithCutAudio(naatId, cutAudioId) {
  console.log(`  Updating naat document with cutAudio...`);

  try {
    await databases.updateDocument(DATABASE_ID, NAATS_COLLECTION_ID, naatId, {
      cutAudio: cutAudioId,
    });

    console.log(`  ✓ Updated naat document`);
  } catch (error) {
    throw new Error(`Failed to update document: ${error.message}`);
  }
}

/**
 * Process a single naat
 */
async function processNaat(config) {
  const { youtubeId, cuts } = config;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${youtubeId}`);
  console.log(`${"=".repeat(60)}`);

  try {
    // Step 1: Find naat in database
    console.log("\n📋 Step 1: Finding naat in database...");
    const naat = await findNaatByYoutubeId(youtubeId);

    if (!naat.audioId) {
      console.log(`  ⚠️  No audio file found for this naat, skipping`);
      return { success: false, reason: "No audio file" };
    }

    // Step 2: Download audio from storage
    console.log("\n📥 Step 2: Downloading audio from storage...");
    const audioPath = await downloadAudioFromStorage(naat.audioId, youtubeId);

    // Step 3: Get audio duration
    console.log("\n⏱️  Step 3: Getting audio duration...");
    const audioDuration = await getAudioDuration(audioPath);
    console.log(`  ✓ Duration: ${audioDuration.toFixed(2)}s`);

    // Step 4: Build segments to keep
    console.log("\n✂️  Step 4: Building segments...");
    const keepSegments = buildKeepSegments(cuts, audioDuration);

    if (keepSegments.length === 0) {
      console.log(`  ⚠️  No segments to keep, skipping`);
      return { success: false, reason: "No segments to keep" };
    }

    // Step 5: Cut audio
    console.log("\n🎵 Step 5: Cutting audio...");
    const cutAudioPath = await cutAudio(audioPath, keepSegments, youtubeId);

    if (!cutAudioPath) {
      return { success: false, reason: "Audio cutting failed" };
    }

    // Step 6: Upload to storage
    console.log("\n☁️  Step 6: Uploading to storage...");
    const cutAudioId = await uploadAudioToStorage(cutAudioPath, youtubeId);

    // Step 7: Update database
    console.log("\n💾 Step 7: Updating database...");
    await updateNaatWithCutAudio(naat.$id, cutAudioId);

    // Cleanup temp files
    console.log("\n🧹 Cleaning up temp files...");
    try {
      unlinkSync(audioPath);
      unlinkSync(cutAudioPath);
      console.log(`  ✓ Temp files deleted`);
    } catch (err) {
      console.log(`  ⚠️  Could not delete temp files: ${err.message}`);
    }

    console.log("\n✅ Processing complete!");
    return { success: true, cutAudioId };
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🎵 Cut Audio by Timestamps Script\n");
  console.log("📋 Reading cuts.json configuration...\n");

  ensureDirectories();

  try {
    const config = loadCutsConfig();

    console.log(`✓ Loaded configuration for YouTube ID: ${config.youtubeId}`);
    console.log(`✓ Found ${config.cuts.length} segments to remove\n`);

    // Display cuts
    console.log("Segments to remove:");
    config.cuts.forEach((cut, i) => {
      const startTime = timestampToSeconds(cut.start.min, cut.start.sec);
      const endTime = timestampToSeconds(cut.end.min, cut.end.sec);
      console.log(
        `  ${i + 1}. ${cut.start.min}:${cut.start.sec.toString().padStart(2, "0")} - ${cut.end.min}:${cut.end.sec.toString().padStart(2, "0")} (${startTime}s - ${endTime}s)`,
      );
    });

    // Process the naat
    const result = await processNaat(config);

    console.log(`\n${"=".repeat(60)}`);
    if (result.success) {
      console.log("✅ SUCCESS!");
      console.log(`Cut audio ID: ${result.cutAudioId}`);
    } else {
      console.log("⚠️  FAILED");
      console.log(`Reason: ${result.reason || result.error}`);
    }
    console.log(`${"=".repeat(60)}`);
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
