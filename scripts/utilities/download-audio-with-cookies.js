/**
 * Audio Download and Upload Script with YouTube cookies
 *
 * This variant mirrors the newer cookie-based yt-dlp flow used by the
 * Appwrite extract-audio function.
 *
 * Usage:
 *   node scripts/utilities/download-audio-with-cookies.js [--limit=10] [--gap=15] [--test] [--no-log]
 */

const { spawn } = require("child_process");
const dotenv = require("dotenv");
const {
  existsSync,
  mkdirSync,
  unlinkSync,
  statSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  appendFileSync,
} = require("fs");
const { Client, Databases, Query, Storage, ID } = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");
const { join, dirname } = require("path");

dotenv.config({ path: "apps/mobile/.env.local" });
dotenv.config({ path: "apps/mobile/.env" });

const LOG_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOG_DIR, "download-audio-with-cookies.log");

function log(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(line);
  if (process.env.AUDIO_DOWNLOAD_LOG !== "false") {
    try {
      mkdirSync(LOG_DIR, { recursive: true });
      appendFileSync(LOG_FILE, `${line}\n`, "utf8");
    } catch (error) {
      console.error(`  Log write warning: ${error.message}`);
    }
  }
}

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ||
  process.env.ENDPOINT;
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ||
  process.env.PROJECTID;
const APPWRITE_API_KEY =
  process.env.APPWRITE_API_KEY ||
  process.env.APPWRITE_SECRET_KEY ||
  process.env.API_KEY;
const DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID || process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const NAATS_COLLECTION_ID =
  process.env.APPWRITE_NAATS_COLLECTION_ID ||
  process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID;
const AUDIO_BUCKET_ID = process.env.APPWRITE_AUDIO_BUCKET_ID || "audio-files";

const args = process.argv.slice(2);
const limit =
  parseInt(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1], 10) ||
  null;
const gapSeconds =
  parseInt(args.find((arg) => arg.startsWith("--gap="))?.split("=")[1], 10) ||
  15;
const testMode = args.includes("--test");

const TEMP_DIR = join(process.cwd(), "temp-audio");
const TEMP_COOKIES_PATH = join(TEMP_DIR, "youtube-cookies.txt");

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`Created temp directory: ${TEMP_DIR}`);
  }
}

function sanitizeTitle(title) {
  return (title || "audio").replace(/[^a-z0-9]+/gi, "_").slice(0, 50);
}

function getCookiesPath() {
  ensureTempDir();

  const candidates = [
    process.env.YTDLP_COOKIES_PATH,
    join(process.cwd(), "cookies.txt"),
    join(process.cwd(), "youtube-cookies.txt"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      writeFileSync(TEMP_COOKIES_PATH, readFileSync(candidate, "utf8"), "utf8");
      console.log(`Using yt-dlp cookies from ${candidate}`);
      return TEMP_COOKIES_PATH;
    }
  }

  throw new Error(
    "No cookies file found. Expected cookies.txt in repo root or YTDLP_COOKIES_PATH."
  );
}

async function downloadAudio(youtubeId, title) {
  const baseName = `${youtubeId}_${sanitizeTitle(title)}`;
  const outputTemplate = join(TEMP_DIR, `${baseName}.%(ext)s`);
  const cookiesPath = getCookiesPath();

  console.log(`  Downloading: ${title}`);
  console.log(`  YouTube ID: ${youtubeId}`);

  return new Promise((resolve, reject) => {
    const ytdlp = spawn("yt-dlp", [
      `https://www.youtube.com/watch?v=${youtubeId}`,
      "--format",
      "bestaudio[ext=m4a]/bestaudio",
      "--extract-audio",
      "--audio-format",
      "m4a",
      "--audio-quality",
      "128",
      "--max-filesize",
      "200M",
      "--output",
      outputTemplate,
      "--no-playlist",
      "--no-warnings",
      "--no-prefer-free-formats",
      "--cookies",
      cookiesPath,
    ]);

    let errorOutput = "";

    ytdlp.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ytdlp.stdout.on("data", () => {
      process.stdout.write(".");
    });

    ytdlp.on("close", (code) => {
      console.log("");

      if (code !== 0) {
        reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
        return;
      }

      const prefix = `${baseName}.`;
      const downloadedFile = readdirSync(TEMP_DIR)
        .filter((entry) => entry.startsWith(prefix))
        .map((entry) => join(TEMP_DIR, entry))
        .find((entry) => statSync(entry).isFile());

      if (!downloadedFile) {
        reject(new Error("yt-dlp completed but no audio file was produced"));
        return;
      }

      console.log("  Downloaded successfully");
      resolve(downloadedFile);
    });

    ytdlp.on("error", (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
}

async function uploadAudio(filePath, youtubeId) {
  console.log("  Uploading to Appwrite Storage...");
  const fileSizeMB = (statSync(filePath).size / 1024 / 1024).toFixed(2);
  console.log(`  File size: ${fileSizeMB}MB`);

  const file = await storage.createFile({
    bucketId: AUDIO_BUCKET_ID,
    fileId: ID.unique(),
    file: InputFile.fromPath(filePath, `${youtubeId}.m4a`),
  });

  console.log(`  Uploaded: ${file.$id}`);
  return file.$id;
}

async function updateNaatWithAudioId(naatId, audioFileId) {
  await databases.updateDocument(DATABASE_ID, NAATS_COLLECTION_ID, naatId, {
    audioId: audioFileId,
  });
  console.log("  Updated naat document with audioId");
}

function cleanupTempFile(filePath) {
  for (const target of [filePath, TEMP_COOKIES_PATH]) {
    try {
      if (target && existsSync(target)) {
        unlinkSync(target);
      }
    } catch (error) {
      console.warn(`  Cleanup warning: ${error.message}`);
    }
  }
}

async function processNaat(naat, index, total) {
  log("INFO", `\n[${index + 1}/${total}] Processing: ${naat.title}`);

  let tempFilePath = null;

  try {
    tempFilePath = await downloadAudio(naat.youtubeId, naat.title);

    if (!testMode) {
      const audioFileId = await uploadAudio(tempFilePath, naat.youtubeId);
      await updateNaatWithAudioId(naat.$id, audioFileId);
    } else {
      log("INFO", "  Test mode: skipping upload");
    }

    log("INFO", "  Success");
    return { success: true, naatId: naat.$id };
  } catch (error) {
    log("ERROR", `  Error: ${error.message}`);
    return { success: false, naatId: naat.$id, error: error.message };
  } finally {
    if (tempFilePath && !testMode) {
      cleanupTempFile(tempFilePath);
    } else {
      cleanupTempFile(null);
    }
  }
}

async function fetchAllNaatsWithoutAudio(userLimit = null) {
  const batchSize = 100;
  let allNaats = [];
  let offset = 0;
  let hasMore = true;

  log("INFO", "Fetching naats from database in batches...");

  while (hasMore) {
    const response = await databases.listDocuments(DATABASE_ID, NAATS_COLLECTION_ID, [
      Query.isNull("audioId"),
      Query.limit(batchSize),
      Query.offset(offset),
    ]);

    const batch = response.documents;
    allNaats.push(...batch);
    log("INFO", `  Fetched batch: ${batch.length} naats (total: ${allNaats.length})`);

    hasMore = batch.length === batchSize;
    offset += batchSize;

    if (userLimit && allNaats.length >= userLimit) {
      allNaats = allNaats.slice(0, userLimit);
      hasMore = false;
    }
  }

  return allNaats;
}

async function main() {
  log("INFO", "Audio Download and Upload Script with Cookies\n");
  log("INFO", `Endpoint: ${APPWRITE_ENDPOINT}`);
  log("INFO", `Project: ${APPWRITE_PROJECT_ID}`);
  log("INFO", `Database: ${DATABASE_ID}`);
  log("INFO", `Collection: ${NAATS_COLLECTION_ID}`);
  log("INFO", `Bucket: ${AUDIO_BUCKET_ID}`);
  log("INFO", `Limit: ${limit || "All videos"}`);
  log("INFO", `Gap: ${gapSeconds}s between downloads`);
  log("INFO", `Mode: ${testMode ? "Test" : "Full"}\n`);

  ensureTempDir();

  const naats = await fetchAllNaatsWithoutAudio(limit);
  log("INFO", `Found ${naats.length} naats without audio\n`);

  if (naats.length === 0) {
    log("INFO", "No naats to process.");
    return;
  }

  const results = [];
  for (let i = 0; i < naats.length; i += 1) {
    const result = await processNaat(naats[i], i, naats.length);
    results.push(result);

    if (i < naats.length - 1) {
      log("INFO", `  Waiting ${gapSeconds}s before next download...`);
      await new Promise((resolve) => setTimeout(resolve, gapSeconds * 1000));
    }
  }

  const failed = results.filter((result) => !result.success);
  log("INFO", "\nSummary:");
  log("INFO", `  Total processed: ${results.length}`);
  log("INFO", `  Successful: ${results.length - failed.length}`);
  log("INFO", `  Failed: ${failed.length}`);

  if (failed.length > 0) {
    log("WARN", "\nFailed naats:");
    failed.forEach((item) => {
      log("WARN", `  - ${item.naatId}: ${item.error}`);
    });
  }
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  process.exit(1);
});
