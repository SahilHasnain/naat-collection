#!/usr/bin/env node

const sdk = require("node-appwrite");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const https = require("https");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const CONFIG = {
  databaseId: process.env.APPWRITE_DATABASE_ID || "695bba86001b50478ed4",
  naatsCollectionId: process.env.APPWRITE_NAATS_COLLECTION_ID || "695bc8e70038db72df5b",
  voiceVariantsTableId: process.env.APPWRITE_VOICE_VARIANTS_TABLE_ID || "voice_variants",
  audioBucketId: process.env.APPWRITE_AUDIO_BUCKET_ID || "audio-files",
  voicePreset: "high",
  semitones: 6,
  isShorts: process.argv.includes("--shorts"),
  prefix: process.env.TEENAGE_TITLE_PREFIX ?? "[Teenage Voice] ",
  playStoreUrl: process.env.PLAY_STORE_URL || "",
  appName: process.env.APP_NAME || "Owais Raza Qadri",
  maxPerDay: Number.parseInt(
    process.env[process.argv.includes("--shorts") ? "TEENAGE_SHORTS_MAX_UPLOADS_PER_DAY" : "TEENAGE_MAX_UPLOADS_PER_DAY"] ||
      (process.argv.includes("--shorts") ? "10" : "1"),
    10,
  ),
  delayMs: Number.parseInt(process.env.TEENAGE_UPLOAD_DELAY_MS || process.env.UPLOAD_DELAY_MS || "5000", 10),
  tempDir: path.join(__dirname, process.argv.includes("--shorts") ? "temp-teenage-shorts" : "temp-teenage"),
  progressFile: path.join(__dirname, process.argv.includes("--shorts") ? "progress-teenage-shorts.json" : "progress-teenage.json"),
  maxShortDuration: 60,
  categoryId: "22",
  language: "en",
  tags: ["naat", "islamic", "nasheed", "teenage voice", "teen voice", "six semitone"],
};
const DRY_RUN = process.argv.includes("--dry-run");

function validateEnv() {
  const required = [
    "APPWRITE_ENDPOINT",
    "APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ];
  if (!DRY_RUN) required.push("GOOGLE_REFRESH_TOKEN_TEENAGE");
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  if (!Number.isInteger(CONFIG.maxPerDay) || CONFIG.maxPerDay < 1) {
    throw new Error("TEENAGE_MAX_UPLOADS_PER_DAY must be a positive integer");
  }
}

function createAppwriteClient() {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  return {
    databases: new sdk.Databases(client),
    tablesDB: new sdk.TablesDB(client),
    storage: new sdk.Storage(client),
  };
}

async function listAllNaats(databases) {
  const all = [];
  let offset = 0;
  while (true) {
    const response = await databases.listDocuments(
      CONFIG.databaseId,
      CONFIG.naatsCollectionId,
      [sdk.Query.limit(500), sdk.Query.offset(offset), sdk.Query.orderDesc("uploadDate")],
    );
    all.push(...response.documents);
    offset += response.documents.length;
    if (response.documents.length < 500) break;
  }
  return all;
}

async function listAllVoiceVariants(tablesDB) {
  const all = [];
  let offset = 0;
  while (true) {
    const response = await tablesDB.listRows({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.voiceVariantsTableId,
      queries: [sdk.Query.limit(500), sdk.Query.offset(offset)],
    });
    all.push(...response.rows);
    offset += response.rows.length;
    if (response.rows.length < 500) break;
  }
  return all;
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG.progressFile, "utf8"));
  } catch {
    return { uploaded: [], failed: [], today: 0, lastDate: null };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
}

function getId(record) {
  return record.$id || record.$rowId || record.id;
}

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN_TEENAGE });
  return auth;
}

function safeTitle(raw, suffix = "") {
  if (raw.length + suffix.length <= 100) return `${raw}${suffix}`;
  const available = Math.max(1, 99 - suffix.length);
  return `${raw.slice(0, available).replace(/\s+\S*$/, "")}…${suffix}`;
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function downloadThumbnail(thumbnailUrl, destPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(thumbnailUrl, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        downloadThumbnail(new URL(response.headers.location, thumbnailUrl).toString(), destPath).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Thumbnail download failed: HTTP ${response.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(destPath);
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
      file.on("error", (err) => {
        file.close(() => reject(err));
      });
    });
    request.on("error", reject);
  });
}

async function downloadAudio(storage, fileId, destPath) {
  const bytes = await storage.getFileDownload(CONFIG.audioBucketId, fileId);
  fs.writeFileSync(destPath, Buffer.from(bytes));
}

function getAudioDuration(audioPath, fallbackSeconds) {
  try {
    const result = execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", audioPath,
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const duration = Number.parseFloat(result.trim());
    if (Number.isFinite(duration) && duration > 0) return duration;
  } catch {}
  return Number(fallbackSeconds) || CONFIG.maxShortDuration;
}

function getClipWindow(audioDuration, clip) {
  const totalDuration = Math.max(0, Number(audioDuration) || 0);
  const duration = Math.min(CONFIG.maxShortDuration, totalDuration / 2);
  const start = clip === "end" ? Math.max(0, totalDuration - duration) : 0;
  return { start, duration };
}

function createVideo(audioPath, thumbnailPath, outputPath, clip, audioDuration) {
  const args = ["-y", "-loop", "1", "-i", thumbnailPath];
  if (CONFIG.isShorts) {
    const clipWindow = getClipWindow(audioDuration, clip);
    args.push(
      "-ss", String(clipWindow.start), "-i", audioPath,
      "-t", String(clipWindow.duration),
      "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    );
  } else {
    args.push("-i", audioPath);
  }
  args.push(
    "-c:v", "libx264", "-preset", "ultrafast", "-tune", "stillimage",
    "-c:a", "aac", "-b:a", "192k", "-pix_fmt", "yuv420p",
    "-shortest", "-movflags", "+faststart", outputPath,
  );
  execFileSync("ffmpeg", args, { stdio: "pipe" });
}

async function uploadVideo(auth, videoPath, naat, clip, clipDuration) {
  const youtube = google.youtube({ version: "v3", auth });
  const duration = Number(naat.cutDuration || naat.duration) || 0;
  const publishedDuration = CONFIG.isShorts ? clipDuration : duration;
  const clipName = clip === "start" ? "Starting 60 seconds" : "Final 60 seconds";
  const titleSuffix = CONFIG.isShorts ? ` (${clip === "start" ? "Start" : "End"} Short) #Shorts` : "";
  const hashtags = CONFIG.isShorts
    ? "#naat #islamic #nasheed #teenagevoice #teenvoice #Shorts"
    : "#naat #islamic #nasheed #teenagevoice #teenvoice";
  const description = [
    CONFIG.isShorts
      ? `Teenage-voice ${clipName} Short (+${CONFIG.semitones} semitones), up to ${publishedDuration} seconds.`
      : `Teenage-voice version (+${CONFIG.semitones} semitones) of this naat.`,
    "",
    `🎵 ${naat.title}`,
    `🎤 ${naat.channelName || "Owais Raza Qadri"}`,
    `⏱ ${formatDuration(publishedDuration)}`,
    "",
    CONFIG.playStoreUrl ? `📥 ${CONFIG.appName} app: ${CONFIG.playStoreUrl}` : "",
    "",
    hashtags,
  ].filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join("\n");

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: safeTitle(`${CONFIG.prefix}${naat.title}`, titleSuffix),
        description,
        tags: CONFIG.tags,
        categoryId: CONFIG.categoryId,
        defaultLanguage: CONFIG.language,
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    },
    media: { body: fs.createReadStream(videoPath) },
  });
  return response.data.id;
}

async function addComment(auth, videoId) {
  if (!CONFIG.playStoreUrl) return;
  const youtube = google.youtube({ version: "v3", auth });
  await youtube.commentThreads.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        videoId,
        topLevelComment: {
          snippet: {
            textOriginal: `📲 Download the ${CONFIG.appName} app: ${CONFIG.playStoreUrl}`,
          },
        },
      },
    },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getUploadKey(variant, clip) {
  const variantId = getId(variant);
  return CONFIG.isShorts ? `${variantId}:${clip}` : variantId;
}

async function processVariant(variant, naat, clip, auth, storage, progress) {
  const variantId = getId(variant);
  const uploadKey = getUploadKey(variant, clip);
  const suffix = CONFIG.isShorts ? `-${clip}-short` : "";
  const audioPath = path.join(CONFIG.tempDir, `${variantId}.m4a`);
  const thumbnailPath = path.join(CONFIG.tempDir, `${variantId}${suffix}.jpg`);
  const videoPath = path.join(CONFIG.tempDir, `${variantId}${suffix}.mp4`);

  try {
    console.log("  Downloading teenage-voice audio...");
    await downloadAudio(storage, variant.outputAudioId, audioPath);
    console.log("  Downloading source naat thumbnail...");
    await downloadThumbnail(naat.thumbnailUrl, thumbnailPath);
    const audioDuration = getAudioDuration(audioPath, naat.cutDuration || naat.duration);
    const clipWindow = CONFIG.isShorts ? getClipWindow(audioDuration, clip) : null;
    console.log("  Creating video...");
    createVideo(audioPath, thumbnailPath, videoPath, clip, audioDuration);
    console.log("  Uploading to teenage-voice channel...");
    const videoId = await uploadVideo(auth, videoPath, naat, clip, clipWindow?.duration);
    console.log(`  Uploaded: https://youtu.be/${videoId}`);

    try {
      await addComment(auth, videoId);
      if (CONFIG.playStoreUrl) console.log("  Play Store comment added (pin it manually in YouTube Studio if desired)");
    } catch (err) {
      console.warn(`  Comment failed: ${err.message}`);
    }

    progress.failed = (progress.failed || []).filter((item) => item.uploadKey !== uploadKey);
    progress.uploaded.push(uploadKey);
    progress.today = (progress.today || 0) + 1;
    progress.lastDate = new Date().toISOString().slice(0, 10);
    saveProgress(progress);
  } catch (err) {
    progress.failed = (progress.failed || []).filter((item) => item.uploadKey !== uploadKey);
    progress.failed.push({ uploadKey, variantId, clip, sourceAudioId: variant.sourceAudioId, error: err.message, time: new Date().toISOString() });
    saveProgress(progress);
    throw err;
  } finally {
    for (const file of [audioPath, thumbnailPath, videoPath]) {
      try { fs.unlinkSync(file); } catch {}
    }
  }
}

async function main() {
  console.log(`Teenage Voice YouTube ${CONFIG.isShorts ? "Shorts" : "Uploader"} (+6 semitones)\n`);
  validateEnv();
  fs.mkdirSync(CONFIG.tempDir, { recursive: true });

  const { databases, tablesDB, storage } = createAppwriteClient();
  const [naats, variants] = await Promise.all([
    listAllNaats(databases),
    listAllVoiceVariants(tablesDB),
  ]);

  const naatByCutAudio = new Map();
  for (const naat of naats) {
    if (naat.exclude === true || !naat.cutAudio) continue;
    if (!naatByCutAudio.has(naat.cutAudio)) naatByCutAudio.set(naat.cutAudio, naat);
  }

  const ready = variants.filter((variant) =>
    variant.voicePreset === CONFIG.voicePreset &&
    variant.status === "done" &&
    Boolean(variant.outputAudioId) &&
    Boolean(variant.sourceAudioId) &&
    naatByCutAudio.has(variant.sourceAudioId),
  );

  const progress = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  if (progress.lastDate !== today) {
    progress.today = 0;
    progress.lastDate = today;
    if (!DRY_RUN) saveProgress(progress);
  }

  const uploaded = new Set(progress.uploaded || []);
  const clips = CONFIG.isShorts ? ["start", "end"] : ["full"];
  const remaining = ready.flatMap((variant) => {
    const naat = naatByCutAudio.get(variant.sourceAudioId);
    return clips
      .filter((clip) => !uploaded.has(getUploadKey(variant, clip)))
      .map((clip) => ({ variant, naat, clip }));
  });
  const dailyRemaining = Math.max(0, CONFIG.maxPerDay - (progress.today || 0));
  console.log(`Naats with cutAudio in source collection: ${naatByCutAudio.size}`);
  console.log(`Completed +6 variants with matching source cutAudio: ${ready.length}`);
  if (CONFIG.isShorts) console.log(`Remaining start/end Shorts: ${remaining.length}`);
  console.log(`Progress file: ${CONFIG.progressFile}`);
  console.log(`Already uploaded: ${uploaded.size}`);
  console.log(`Eligible remaining: ${remaining.length}`);
  console.log(`Uploads allowed today: ${dailyRemaining}\n`);

  if (DRY_RUN) {
    console.log("Dry run complete; no uploads were attempted.");
    return;
  }

  if (!remaining.length || !dailyRemaining) {
    console.log(!remaining.length ? "No eligible teenage-voice variants remain." : "Daily upload limit reached.");
    return;
  }

  const auth = getAuth();
  const batch = remaining.slice(0, dailyRemaining);
  let success = 0;
  let failed = 0;
  for (let index = 0; index < batch.length; index += 1) {
    const { variant, naat, clip } = batch[index];
    console.log(`[${index + 1}/${batch.length}] ${naat.title}${CONFIG.isShorts ? ` — ${clip} clip` : ""}`);
    try {
      await processVariant(variant, naat, clip, auth, storage, progress);
      success += 1;
    } catch (err) {
      failed += 1;
      console.error(`  Failed: ${err.message}`);
    }
    if (index < batch.length - 1) await sleep(CONFIG.delayMs);
  }
  console.log(`\nFinished: ${success} uploaded, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Teenage uploader failed:", err.message);
  process.exit(1);
});
