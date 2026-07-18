#!/usr/bin/env node

const { Client, Storage } = require("node-appwrite");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
const https = require("https");
const url = require("url");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const CONFIG = {
  prefix: process.env.TITLE_PREFIX || "[No Explanation] ",
  playStoreUrl: process.env.PLAY_STORE_URL || "",
  appName: process.env.APP_NAME || "Owais Raza Qadri",
  radioOnly: process.env.FILTER_RADIO_ONLY === "true",
  maxPerDay: parseInt(process.env.MAX_UPLOADS_PER_DAY || "10", 10),
  tempDir: path.join(__dirname, "temp"),
  progressFile: path.join(__dirname, "progress.json"),
  delayMs: parseInt(process.env.UPLOAD_DELAY_MS || "5000", 10),
  naatsFile: path.join(__dirname, "../../static-exports/naats-export.json"),
  categoryId: "22",
  language: "en",
  tags: ["naat", "islamic", "nasheed", "no explanation", "pure naat", "islamic naat"],
};

function checkEnv() {
  const required = [
    "APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY",
    "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error("Missing required env vars:", missing.join(", "));
    process.exit(1);
  }
  if (!CONFIG.playStoreUrl) {
    console.warn("⚠ PLAY_STORE_URL is not set. Links will be omitted.");
  }
}

function loadNaats() {
  const raw = JSON.parse(fs.readFileSync(CONFIG.naatsFile, "utf-8"));
  const naats = raw.data || raw.naats || raw;
  return naats.filter((n) => {
    if (!n.cutAudio) return false;
    if (CONFIG.radioOnly && !n.radio) return false;
    return true;
  });
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG.progressFile, "utf-8"));
  } catch {
    return { uploaded: [], failed: [], today: 0, lastDate: null };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
}

function getAppwriteClient() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  return { client, storage: new Storage(client) };
}

async function downloadFromAppwrite(fileId) {
  const { storage } = getAppwriteClient();
  const tempPath = path.join(CONFIG.tempDir, `${fileId}.m4a`);
  const result = await storage.getFileDownload("audio-files", fileId);
  const buffer = Buffer.from(result);
  fs.writeFileSync(tempPath, buffer);
  return tempPath;
}

function createVideo(audioPath, thumbPath, outputPath) {
  const cmd = `ffmpeg -y -loop 1 -i "${thumbPath}" -i "${audioPath}" -c:v libx264 -preset ultrafast -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -movflags +faststart "${outputPath}"`;
  execSync(cmd, { stdio: "pipe" });
}

async function downloadThumbnail(thumbnailUrl, destPath) {
  const parsed = url.parse(thumbnailUrl);
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get({ ...parsed, rejectUnauthorized: false }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Thumbnail download failed: HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob",
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

async function uploadVideo(auth, videoPath, naat) {
  const youtube = google.youtube({ version: "v3", auth });

  const title = safeTitle(`${CONFIG.prefix}${naat.title}`);
  const durationStr = formatDuration(naat.duration);
  const descParts = [
    `This naat has NO explanation or commentary — pure naat audio only.`,
    ``,
    `🎵 ${naat.title}`,
    `🎤 ${naat.channelName}`,
    `⏱ ${durationStr}`,
    ``,
    `📥 Download the ${CONFIG.appName} app from Google Play Store:`,
    CONFIG.playStoreUrl,
    ``,
    `#naat #islamic #nasheed #noexplanation #${CONFIG.appName.toLowerCase().replace(/\s+/g, "")}`,
  ];

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description: descParts.join("\n"),
        tags: CONFIG.tags,
        categoryId: CONFIG.categoryId,
        defaultLanguage: CONFIG.language,
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    media: { body: fs.createReadStream(videoPath) },
  });

  return response.data.id;
}

async function addComment(auth, videoId) {
  if (!CONFIG.playStoreUrl) return;

  const youtube = google.youtube({ version: "v3", auth });
  const comment = `📲 Download the ${CONFIG.appName} app: ${CONFIG.playStoreUrl}\n\nExperience pure naats without explanations, offline playback, and more!`;

  const response = await youtube.commentThreads.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        videoId,
        topLevelComment: {
          snippet: { textOriginal: comment },
        },
      },
    },
  });

  return response.data.id;
}

function safeTitle(raw) {
  const max = 100;
  if (raw.length <= max) return raw;
  const truncated = raw.slice(0, max - 1).replace(/\s+\S*$/, "");
  return truncated + "…";
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processNaat(naat, auth, progress) {
  const audioPath = path.join(CONFIG.tempDir, `${naat.cutAudio}.m4a`);
  const thumbPath = path.join(CONFIG.tempDir, `${naat.youtubeId}.jpg`);
  const videoPath = path.join(CONFIG.tempDir, `${naat.youtubeId}.mp4`);

  try {
    // Step 1: Download audio from Appwrite
    console.log(`  ⬇ Downloading audio...`);
    await downloadFromAppwrite(naat.cutAudio);

    // Step 2: Download thumbnail
    console.log(`  🖼 Downloading thumbnail...`);
    await downloadThumbnail(naat.thumbnailUrl, thumbPath);

    // Step 3: Create video with ffmpeg
    console.log(`  🎬 Creating video...`);
    createVideo(audioPath, thumbPath, videoPath);

    // Step 4: Upload to YouTube
    console.log(`  ⬆ Uploading to YouTube...`);
    const videoId = await uploadVideo(auth, videoPath, naat);
    console.log(`  ✅ Uploaded: https://youtu.be/${videoId}`);

    // Step 5: Add pinned comment
    try {
      const commentId = await addComment(auth, videoId);
      if (commentId) {
        console.log(`  💬 Comment added (ID: ${commentId})`);
        console.log(`  ⚠ Pin the comment manually in YouTube Studio`);
      }
    } catch (commentErr) {
      console.warn(`  ⚠ Comment failed: ${commentErr.message}`);
    }

    // Remove from failed list if it was previously there
    progress.failed = (progress.failed || []).filter(
      (f) => f.youtubeId !== naat.youtubeId,
    );
    // Mark as uploaded
    progress.uploaded.push(naat.youtubeId);
    progress.today = (progress.today || 0) + 1;
    progress.lastDate = new Date().toISOString().split("T")[0];
    saveProgress(progress);

    // Cleanup temp files
    try {
      fs.unlinkSync(audioPath);
      fs.unlinkSync(thumbPath);
      fs.unlinkSync(videoPath);
    } catch {}
  } catch (err) {
    console.error(`  ❌ Failed: ${err.message}`);
    progress.failed = (progress.failed || []).filter(
      (f) => f.youtubeId !== naat.youtubeId,
    );
    progress.failed.push({ youtubeId: naat.youtubeId, error: err.message, time: new Date().toISOString() });
    saveProgress(progress);
    throw err;
  }
}

async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   Naat Collection → YouTube Uploader  ║");
  console.log("╚════════════════════════════════════════╝\n");

  checkEnv();

  // Ensure temp dir
  fs.mkdirSync(CONFIG.tempDir, { recursive: true });

  // Load data
  const naats = loadNaats();
  console.log(`Loaded ${naats.length} naats${CONFIG.radioOnly ? " (radio only)" : ""}\n`);

  // Load progress
  const progress = loadProgress();
  const uploadedSet = new Set(progress.uploaded || []);
  const today = new Date().toISOString().split("T")[0];

  // Reset daily counter if it's a new day
  if (progress.lastDate !== today) {
    progress.today = 0;
    progress.lastDate = today;
    saveProgress(progress);
  }

  const remaining = naats.filter((n) => !uploadedSet.has(n.youtubeId));
  const dailyRemaining = Math.max(0, CONFIG.maxPerDay - (progress.today || 0));

  console.log(`Previously uploaded: ${progress.uploaded.length}`);
  console.log(`Previously failed:   ${progress.failed.length}`);
  console.log(`Remaining:           ${remaining.length}`);
  console.log(`Daily quota left:    ${dailyRemaining}`);
  console.log(`Title prefix:        "${CONFIG.prefix}"`);
  console.log(`Play Store URL:      ${CONFIG.playStoreUrl || "(not set)"}\n`);

  if (!remaining.length) {
    console.log("All naats have been uploaded!");
    return;
  }

  if (dailyRemaining <= 0) {
    console.log("Daily upload limit reached. Come back tomorrow!");
    return;
  }

  const toProcess = remaining.slice(0, dailyRemaining);
  console.log(`Processing ${toProcess.length} naats today...\n`);

  // Authenticate once
  const auth = getAuth();

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const naat = toProcess[i];
    console.log(`[${i + 1}/${toProcess.length}] ${naat.title}`);

    try {
      await processNaat(naat, auth, progress);
      successCount++;
    } catch (err) {
      failCount++;
      console.error(`  Skipping after error. Continuing with next...`);
    }

    if (i < toProcess.length - 1) {
      console.log(`  Waiting ${CONFIG.delayMs / 1000}s...\n`);
      await sleep(CONFIG.delayMs);
    }
  }

  console.log(`\nDone! ${successCount} uploaded, ${failCount} failed.`);
  console.log(`Total uploaded this session: ${successCount}`);
  if (progress.uploaded.length > 0) {
    console.log(`\nCheck progress: ${CONFIG.progressFile}`);
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
