#!/usr/bin/env node

const { Client, Storage } = require("node-appwrite");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const CONFIG = {
  prefix: process.env.TITLE_PREFIX || "[No Explanation] ",
  playStoreUrl: process.env.PLAY_STORE_URL || "",
  appName: process.env.APP_NAME || "Owais Raza Qadri",
  radioOnly: process.env.FILTER_RADIO_ONLY === "true",
  maxPerDay: parseInt(process.env.MAX_UPLOADS_PER_DAY || "10", 10),
  tempDir: path.join(__dirname, "temp"),
  progressFile: path.join(__dirname, "progress-shorts.json"),
  delayMs: parseInt(process.env.UPLOAD_DELAY_MS || "5000", 10),
  naatsFile: path.join(__dirname, "../../static-exports/naats-export.json"),
  maxDuration: 60,
  categoryId: "22",
  language: "en",
  tags: ["naat", "islamic", "nasheed", "no explanation", "shorts", "short naat"],
};

function checkEnv() {
  const required = [
    "APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY",
    "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Missing required env vars:", missing.join(", "));
    process.exit(1);
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

function saveProgress(p) {
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(p, null, 2));
}

function getAppwriteClient() {
  const c = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  return { client: c, storage: new Storage(c) };
}

async function downloadFromAppwrite(fileId) {
  const { storage } = getAppwriteClient();
  const p = path.join(CONFIG.tempDir, `${fileId}.m4a`);
  const r = await storage.getFileDownload("audio-files", fileId);
  fs.writeFileSync(p, Buffer.from(r));
  return p;
}

async function downloadThumbnail(url, dest) {
  return new Promise((resolve, reject) => {
    const https = require("https");
    const u = require("url");
    const parsed = u.parse(url);
    const file = fs.createWriteStream(dest);
    https.get({ ...parsed, rejectUnauthorized: false }, (r) => {
      if (r.statusCode !== 200) { reject(new Error("HTTP " + r.statusCode)); return; }
      r.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

function createShortVideo(thumbPath, audioPath, outputPath, duration) {
  const trimSec = Math.min(duration, CONFIG.maxDuration);

  const cmd = [
    `ffmpeg -y -i "${thumbPath}" -i "${audioPath}"`,
    `-vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"`,
    `-c:v libx264 -preset medium -c:a aac -b:a 192k`,
    `-t ${trimSec} -pix_fmt yuv420p -movflags +faststart`,
    `"${outputPath}"`,
  ].join(" ");

  execSync(cmd, { stdio: "pipe" });
}

function getAuth() {
  const a = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob",
  );
  a.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return a;
}

async function uploadShort(auth, videoPath, naat) {
  const youtube = google.youtube({ version: "v3", auth });

  const title = safeTitle(`${CONFIG.prefix}${naat.title} #Shorts`);
  const durationStr = formatDuration(Math.min(naat.duration, CONFIG.maxDuration));
  const desc = [
    `This naat has NO explanation or commentary — pure naat audio only.`,
    ``,
    `🎵 ${naat.title}`,
    `🎤 ${naat.channelName}`,
    `⏱ ${durationStr}`,
    ``,
    `📥 Download the ${CONFIG.appName} app from Google Play Store:`,
    CONFIG.playStoreUrl,
    ``,
    `#Shorts #naat #islamic #nasheed #noexplanation`,
  ].join("\n");

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description: desc,
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

  return res.data.id;
}

async function addComment(auth, videoId) {
  if (!CONFIG.playStoreUrl) return;
  const youtube = google.youtube({ version: "v3", auth });
  const comment = `📲 Download the ${CONFIG.appName} app: ${CONFIG.playStoreUrl}\n\nExperience pure naats without explanations, offline playback, and more!`;
  const res = await youtube.commentThreads.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        videoId,
        topLevelComment: { snippet: { textOriginal: comment } },
      },
    },
  });
  return res.data.id;
}

function safeTitle(raw) {
  const max = 100;
  if (raw.length <= max) return raw;
  const truncated = raw.slice(0, max - 1).replace(/\s+\S*$/, "");
  return truncated + "…";
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processNaat(naat, auth, progress) {
  const base = naat.youtubeId;
  const audioPath = path.join(CONFIG.tempDir, `${naat.cutAudio}.m4a`);
  const thumbPath = path.join(CONFIG.tempDir, `${base}.jpg`);
  const videoPath = path.join(CONFIG.tempDir, `${base}_short.mp4`);

  try {
    console.log(`  ⬇ Downloading audio...`);
    await downloadFromAppwrite(naat.cutAudio);

    console.log(`  🖼 Downloading thumbnail...`);
    await downloadThumbnail(naat.thumbnailUrl, thumbPath);

    console.log(`  🎬 Creating Short (${Math.min(naat.duration, CONFIG.maxDuration)}s)...`);
    createShortVideo(thumbPath, audioPath, videoPath, naat.duration);

    console.log(`  ⬆ Uploading...`);
    const videoId = await uploadShort(auth, videoPath, naat);
    console.log(`  ✅ https://youtu.be/${videoId}`);

    try {
      const cid = await addComment(auth, videoId);
      if (cid) console.log(`  💬 Comment added`);
    } catch {}

    progress.failed = (progress.failed || []).filter((f) => f.youtubeId !== naat.youtubeId);
    progress.uploaded.push(naat.youtubeId);
    progress.today = (progress.today || 0) + 1;
    progress.lastDate = new Date().toISOString().split("T")[0];
    saveProgress(progress);

    try {
      fs.unlinkSync(audioPath);
      fs.unlinkSync(thumbPath);
      fs.unlinkSync(videoPath);
    } catch {}
  } catch (err) {
    console.error(`  ❌ ${err.message}`);
    progress.failed = (progress.failed || []).filter((f) => f.youtubeId !== naat.youtubeId);
    progress.failed.push({ youtubeId: naat.youtubeId, error: err.message, time: new Date().toISOString() });
    saveProgress(progress);
    throw err;
  }
}

async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   Naat Collection → YouTube Shorts    ║");
  console.log("╚════════════════════════════════════════╝\n");

  checkEnv();
  fs.mkdirSync(CONFIG.tempDir, { recursive: true });

  const naats = loadNaats();
  console.log(`Loaded ${naats.length} naats${CONFIG.radioOnly ? " (radio only)" : ""}\n`);

  const progress = loadProgress();
  const uploadedSet = new Set(progress.uploaded || []);
  const today = new Date().toISOString().split("T")[0];

  if (progress.lastDate !== today) {
    progress.today = 0;
    progress.lastDate = today;
    saveProgress(progress);
  }

  const remaining = naats.filter((n) => !uploadedSet.has(n.youtubeId));
  const dailyRemaining = Math.max(0, CONFIG.maxPerDay - (progress.today || 0));

  console.log(`Uploaded: ${progress.uploaded.length}`);
  console.log(`Failed:   ${progress.failed.length}`);
  console.log(`Remaining: ${remaining.length}`);
  console.log(`Daily:    ${dailyRemaining}\n`);

  if (!remaining.length || dailyRemaining <= 0) {
    if (!remaining.length) console.log("All done!");
    if (dailyRemaining <= 0) console.log("Daily limit reached. Come back tomorrow.");
    return;
  }

  const toProcess = remaining.slice(0, dailyRemaining);
  console.log(`Processing ${toProcess.length} shorts today...\n`);

  const auth = getAuth();
  let ok = 0, fail = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const naat = toProcess[i];
    console.log(`[${i + 1}/${toProcess.length}] ${naat.title}`);
    try {
      await processNaat(naat, auth, progress);
      ok++;
    } catch {
      fail++;
    }
    if (i < toProcess.length - 1) {
      console.log(`  Waiting ${CONFIG.delayMs / 1000}s...\n`);
      await sleep(CONFIG.delayMs);
    }
  }

  console.log(`\nDone! ${ok} uploaded, ${fail} failed.`);
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
