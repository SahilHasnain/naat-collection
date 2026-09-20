/**
 * Regenerate cut audio for naats processed by an older model
 *
 * Targets naats previously cut by the AI pipeline (isAiCut == true) whose
 * cutModelVersion differs from the currently pinned model revision. For each:
 *
 *   1. Ensure an original audio file is available:
 *        - reuse audioId when still present (the "no cuts needed" linked case),
 *        - otherwise re-download from YouTube (yt-dlp + cookies) and upload.
 *   2. Delete stale manual-cut-detect jobs for the naat (clean re-ranchise).
 *   3. Best-effort delete the old cutAudio file (only when it is a distinct
 *      file, i.e. a real cut, not the linked original).
 *   4. Reset AI-cut flags so auto-queue-ai-jobs-cron re-queues it, and the
 *      existing pipeline (worker -> cut-audio-cron -> delete-original-audio-cron)
 *      re-processes it with the current model, which stamps cutModelVersion.
 *
 * Skips excluded naats (same policy as auto-queue) and stops early in --test.
 *
 * Usage:
 *   node scripts/regenerate-cut-audio.js [--limit=10] [--gap=15] [--test]
 *       [--model-version=<rev>] [--no-log]
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
const { join, dirname, resolve } = require("path");

dotenv.config({ path: "apps/mobile/.env.local" });
dotenv.config({ path: "apps/mobile/.env" });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: "apps/ai-service/.env" });

const LOG_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOG_DIR, "regenerate-cut-audio.log");

function log(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(line);
  if (process.env.REGEN_AUDIO_LOG !== "false") {
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
const AI_JOBS_COLLECTION_ID =
  process.env.APPWRITE_AI_JOBS_COLLECTION_ID ||
  process.env.EXPO_PUBLIC_APPWRITE_AI_JOBS_COLLECTION_ID;
const AUDIO_BUCKET_ID = process.env.APPWRITE_AUDIO_BUCKET_ID || "audio-files";

const args = process.argv.slice(2);
const limit =
  parseInt(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1], 10) ||
  null;
const gapSeconds =
  parseInt(args.find((arg) => arg.startsWith("--gap="))?.split("=")[1], 10) ||
  15;
const testMode = args.includes("--test");
const loopMode = args.includes("--loop");
const pollIntervalSeconds =
  parseInt(args.find((arg) => arg.startsWith("--poll-interval="))?.split("=")[1], 10) ||
  300;
const MODEL_VERSION =
  args.find((arg) => arg.startsWith("--model-version="))?.split("=")[1] ||
  process.env.MODEL_REVISION ||
  "main";

const TEMP_DIR = join(process.cwd(), "temp-audio");
const TEMP_COOKIES_PATH = join(TEMP_DIR, "youtube-cookies.txt");
const LOCK_FILE = join(LOG_DIR, "regenerate-cut-audio.lock");

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

function sleepInterruptible(ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    process.once("SIGINT", () => {
      clearTimeout(timer);
      reject(new Error("Interrupted"));
    });
    process.once("SIGTERM", () => {
      clearTimeout(timer);
      reject(new Error("Interrupted"));
    });
  });
}

function sanitizeTitle(title) {
  return (title || "audio").replace(/[^a-z0-9]+/gi, "_").slice(0, 50);
}

function getCookiesPath() {
  ensureTempDir();

  const REPO_ROOT = resolve(__dirname, "..");

  const candidates = [
    process.env.YTDLP_COOKIES_PATH,
    join(REPO_ROOT, "cookies.txt"),
    join(REPO_ROOT, "youtube-cookies.txt"),
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

async function deleteStaleJobs(naatId) {
  const jobs = await databases.listDocuments(
    DATABASE_ID,
    AI_JOBS_COLLECTION_ID,
    [
      Query.equal("type", ["manual-cut-detect"]),
      Query.equal("naatId", [naatId]),
      Query.limit(100),
    ],
  );

  for (const job of jobs.documents) {
    await databases.deleteDocument(DATABASE_ID, AI_JOBS_COLLECTION_ID, job.$id);
    console.log(`    Deleted stale job ${job.$id} (status: ${job.status || "?"})`);
  }

  return jobs.documents.length;
}

async function deleteOldCutFile(fileId, naatId) {
  if (!fileId) return;
  try {
    await storage.deleteFile(AUDIO_BUCKET_ID, fileId);
    console.log(`    Deleted old cut audio file ${fileId}`);
  } catch (error) {
    if (error?.code === 404) {
      console.log(`    Old cut audio ${fileId} already missing`);
    } else {
      console.warn(
        `    Cleanup warning: failed to delete old cut audio ${fileId}: ${error.message}`
      );
    }
  }
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
  log(
    "INFO",
    `\n[${index + 1}/${total}] Processing: ${naat.title || naat.$id}`
  );
  console.log(`  cutModelVersion: ${naat.cutModelVersion || "(absent)"} -> ${MODEL_VERSION}`);

  if (testMode) {
    const action = naat.audioId
      ? `reuse existing audioId ${naat.audioId}, delete stale jobs, reset flags`
      : `download ${naat.youtubeId} from YouTube, upload, delete stale jobs, reset flags`;
    log("INFO", `  Test mode: would ${action}`);
    return { success: true, naatId: naat.$id, test: true };
  }

  if (naat.audioId) {
    console.log(`  Reusing existing audioId: ${naat.audioId}`);

    try {
      const deletedJobs = await deleteStaleJobs(naat.$id);
      console.log(`    Removed ${deletedJobs} stale job(s)`);

      await deleteOldCutFile(
        naat.cutAudio && naat.cutAudio !== naat.audioId ? naat.cutAudio : null,
        naat.$id
      );

      await databases.updateDocument(DATABASE_ID, NAATS_COLLECTION_ID, naat.$id, {
        audioId: naat.audioId,
        isAiCut: false,
        cutSegments: null,
        cutStatus: null,
        cutAudio: null,
        cutDuration: null,
        cutModelVersion: null,
      });
      console.log("  Reset AI-cut flags; naat will be re-queued by cron");
    } catch (error) {
      log("ERROR", `  Error: ${error.message}`);
      return { success: false, naatId: naat.$id, error: error.message };
    }

    return { success: true, naatId: naat.$id, reused: true };
  }

  if (!naat.youtubeId) {
    log("ERROR", `  No audioId and no youtubeId — cannot regenerate: ${naat.$id}`);
    return { success: false, naatId: naat.$id, error: "No audioId and no youtubeId" };
  }

  let tempFilePath = null;

  try {
    tempFilePath = await downloadAudio(naat.youtubeId, naat.title);

    const audioFileId = await uploadAudio(tempFilePath, naat.youtubeId);
    console.log(`  New audioId: ${audioFileId}`);

    const deletedJobs = await deleteStaleJobs(naat.$id);
    console.log(`  Removed ${deletedJobs} stale job(s)`);

    await deleteOldCutFile(naat.cutAudio, naat.$id);

    await databases.updateDocument(DATABASE_ID, NAATS_COLLECTION_ID, naat.$id, {
      audioId: audioFileId,
      isAiCut: false,
      cutSegments: null,
      cutStatus: null,
      cutAudio: null,
      cutDuration: null,
      cutModelVersion: null,
    });
    console.log("  Reset AI-cut flags; naat will be re-queued by cron");

    log("INFO", "  Success");
    return { success: true, naatId: naat.$id, newAudio: true };
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

async function fetchOldModelAiCutNaats(userLimit = null) {
  const batchSize = 100;
  let allNaats = [];
  let offset = 0;
  let hasMore = true;

  log("INFO", "Fetching AI-cut naats cut by an older model...");

  while (hasMore) {
    const response = await databases.listDocuments(DATABASE_ID, NAATS_COLLECTION_ID, [
      Query.equal("isAiCut", true),
      Query.or([Query.isNull("exclude"), Query.equal("exclude", false)]),
      Query.limit(batchSize),
      Query.offset(offset),
    ]);

    const batch = response.documents
      .filter((naat) => (naat.cutModelVersion || null) !== MODEL_VERSION)
      .filter((naat) => !naat.exclude);

    allNaats.push(...batch);
    log("INFO", `  Fetched batch: ${response.documents.length} (${batch.length} to regenerate; total: ${allNaats.length})`);

    hasMore = response.documents.length === batchSize;
    offset += batchSize;

    if (userLimit && allNaats.length >= userLimit) {
      allNaats = allNaats.slice(0, userLimit);
      hasMore = false;
    }
  }

  return allNaats;
}

function acquireLock() {
  try {
    mkdirSync(dirname(LOCK_FILE), { recursive: true });
    if (existsSync(LOCK_FILE)) {
      const pid = parseInt(readFileSync(LOCK_FILE, "utf8"), 10);
      try {
        process.kill(pid, 0);
        log("INFO", `Another instance (PID ${pid}) is already running — exiting.`);
        return false;
      } catch (error) {
        log("WARN", `Stale lock from PID ${pid} — removing and taking over.`);
        unlinkSync(LOCK_FILE);
      }
    }
    writeFileSync(LOCK_FILE, String(process.pid), "utf8");
    return true;
  } catch (error) {
    log("WARN", `Lock acquire failed (${error.message}) — continuing without lock.`);
    return true;
  }
}

function releaseLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      const pid = parseInt(readFileSync(LOCK_FILE, "utf8"), 10);
      if (pid === process.pid) {
        unlinkSync(LOCK_FILE);
      }
    }
  } catch (error) {
    log("WARN", `Lock release failed: ${error.message}`);
  }
}

async function runOnce(scanIndex) {
  if (scanIndex > 0) {
    log("INFO", `\n=== Scan #${scanIndex + 1} ===`);
  }

  const naats = await fetchOldModelAiCutNaats(limit);
  log("INFO", `Found ${naats.length} naats to regenerate\n`);

  if (naats.length === 0) {
    log("INFO", "No naats to process. All AI-cut naats already use the current model.");
    return;
  }

  const results = [];
  for (let i = 0; i < naats.length; i += 1) {
    const result = await processNaat(naats[i], i, naats.length);
    results.push(result);

    const needsGap =
      !result.reused && !testMode && i < naats.length - 1;
    if (needsGap) {
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

async function main() {
  log("INFO", "Regenerate Cut Audio Script (for older-model naats)\n");
  log("INFO", `Endpoint: ${APPWRITE_ENDPOINT}`);
  log("INFO", `Project: ${APPWRITE_PROJECT_ID}`);
  log("INFO", `Database: ${DATABASE_ID}`);
  log("INFO", `Naats collection: ${NAATS_COLLECTION_ID}`);
  log("INFO", `AI jobs collection: ${AI_JOBS_COLLECTION_ID}`);
  log("INFO", `Bucket: ${AUDIO_BUCKET_ID}`);
  log("INFO", `Target model version: ${MODEL_VERSION}`);
  log("INFO", `Limit: ${limit || "All candidates"}`);
  log("INFO", `Gap: ${gapSeconds}s between downloads`);
  log("INFO", `Loop mode: ${loopMode ? `ON (poll interval: ${pollIntervalSeconds}s)` : "OFF"}`);
  log("INFO", `Mode: ${testMode ? "Test (no changes)" : "Full"}\n`);

  if (!AI_JOBS_COLLECTION_ID) {
    log("ERROR", "Missing APPWRITE_AI_JOBS_COLLECTION_ID — stale jobs will not be cleaned");
  }

  if (!acquireLock()) {
    process.exit(0);
  }

  let shuttingDown = false;
  const shutdown = () => {
    shuttingDown = true;
    log("INFO", "Shutting down...");
    releaseLock();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  ensureTempDir();

  try {
    let scanIndex = 0;
    while (!shuttingDown) {
      await runOnce(scanIndex);
      scanIndex += 1;

      if (loopMode) {
        log("INFO", `  Sleeping ${pollIntervalSeconds}s before next scan...`);
        try {
          await sleepInterruptible(pollIntervalSeconds * 1000);
        } catch (error) {
          if (!shuttingDown) throw error;
        }
      } else {
        break;
      }
    }
  } finally {
    releaseLock();
  }
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  releaseLock();
  process.exit(1);
});