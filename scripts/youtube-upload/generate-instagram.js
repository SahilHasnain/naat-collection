#!/usr/bin/env node

/**
 * Instagram video generator for Owais Raza Qadri.
 *
 * Creates 4:5 portrait videos with app branding overlay,
 * ready to upload to Instagram Feed.
 *
 * Usage:
 *   node scripts/youtube-upload/generate-instagram.js                  # next 5 unprocessed naats
 *   node scripts/youtube-upload/generate-instagram.js --youtubeId=R5_G2LH703w  # specific naat
 *   node scripts/youtube-upload/generate-instagram.js --count=2        # generate 2 videos
 */

const { Client, Storage } = require("node-appwrite");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
const https = require("https");
const url = require("url");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const CONFIG = {
  appName: process.env.APP_NAME || "Owais Raza Qadri",
  playStoreUrl: process.env.PLAY_STORE_URL || "https://play.google.com/store/apps/details?id=com.owaisrazaqadri",
  outputDir: path.join(__dirname, "../../instagram-uploads"),
  tempDir: path.join(__dirname, "temp-instagram"),
  progressFile: path.join(__dirname, "instagram-progress.json"),
  naatsFile: path.join(__dirname, "../../static-exports/naats-export.json"),
  radioOnly: process.env.FILTER_RADIO_ONLY === "true",
  width: 1080,
  height: 1350, // 4:5 portrait — best for Instagram Feed
  fontSize: 28,
  urlFontSize: 20,
  fontFile: "C:/Windows/Fonts/arial.ttf",
  barHeight: 90,
  // Font path without colons (copy from Windows Fonts to temp dir)
  localFont: null,
};

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
    return { done: [] };
  }
}

function saveProgress(p) {
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(p, null, 2));
}

function getAppwriteClient() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  return { storage: new Storage(client) };
}

async function downloadFromAppwrite(fileId) {
  const { storage } = getAppwriteClient();
  const tempPath = path.join(CONFIG.tempDir, `${fileId}.m4a`);
  const result = await storage.getFileDownload("audio-files", fileId);
  fs.writeFileSync(tempPath, Buffer.from(result));
  return tempPath;
}

function downloadFile(srcUrl, destPath) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(srcUrl);
    const file = fs.createWriteStream(destPath);
    https
      .get({ ...parsed, rejectUnauthorized: false }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

function generateVideo(audioPath, thumbPath, outputPath, naat) {
  // Scale thumbnail to fill 1080x1350 (center-cropped), add bottom bar with text
  const { width, height, fontFile, fontSize, urlFontSize, barHeight } = CONFIG;
  const appText = `${CONFIG.appName}`;
  const urlText = `Download on Google Play`;

  // Copy font to temp dir on first call to avoid colon path issues
  if (!CONFIG.localFont) {
    CONFIG.localFont = path.join(CONFIG.tempDir, "font.ttf");
    if (!fs.existsSync(CONFIG.localFont)) {
      fs.copyFileSync(fontFile, CONFIG.localFont);
    }
  }

  // Scale thumbnail to fill frame, add bottom overlay with app promotion
  const filter = `
    scale=${width}:${height}:force_original_aspect_ratio=increase,
    crop=${width}:${height},
    drawtext=
      text=${escapeFfmpegText(appText)}:
      x=(w-text_w)/2:
      y=h-${barHeight}-20:
      fontfile=${CONFIG.localFont}:
      fontsize=${fontSize}:
      fontcolor=white:
      box=1:
      boxcolor=black@0.65:
      boxborderw=12:
      borderw=0,
    drawtext=
      text=${escapeFfmpegText(urlText)}:
      x=(w-text_w)/2:
      y=h-${barHeight}+${fontSize + 5}:
      fontfile=${CONFIG.localFont}:
      fontsize=${urlFontSize}:
      fontcolor=#AAAAAA:
      box=1:
      boxcolor=black@0.65:
      boxborderw=8:
      borderw=0
  `.replace(/\n\s*/g, "");

  const cmd =
    `ffmpeg -y -loop 1 -i "${thumbPath}" -i "${audioPath}" ` +
    `-vf "${filter}" ` +
    `-c:v libx264 -preset ultrafast -tune stillimage -c:a aac -b:a 192k ` +
    `-pix_fmt yuv420p -shortest -movflags +faststart "${outputPath}"`;

  execSync(cmd, { stdio: "pipe" });
}

function escapeFfmpegText(t) {
  // Escape characters special to ffmpeg filter syntax
  return "'" + t.replace(/'/g, "'\\\\''").replace(/:/g, "\\:") + "'";
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

function generateCaption(naat) {
  const lines = [
    `${naat.title}`,
    ``,
    `🎤 ${naat.channelName}`,
    `⏱ ${formatDuration(naat.duration)}`,
    ``,
    `This naat has NO explanation — pure audio only ✨`,
    ``,
    `📲 Download the ${CONFIG.appName} App 👇`,
    CONFIG.playStoreUrl,
    ``,
    `#naat #islamic #nasheed #owaisrazzqadri`,
  ];
  return lines.join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processNaat(naat) {
  const audioPath = path.join(CONFIG.tempDir, `${naat.cutAudio}.m4a`);
  const thumbPath = path.join(CONFIG.tempDir, `${naat.youtubeId}.jpg`);
  const videoName = `${naat.youtubeId}_instagram.mp4`;
  const videoPath = path.join(CONFIG.outputDir, videoName);
  const captionPath = path.join(CONFIG.outputDir, `${naat.youtubeId}_caption.txt`);

  console.log(`\n[${naat.youtubeId}] ${naat.title}`);

  // Download audio
  if (!fs.existsSync(audioPath)) {
    console.log("  ⬇ Downloading audio...");
    await downloadFromAppwrite(naat.cutAudio);
  }

  // Download thumbnail
  if (!fs.existsSync(thumbPath)) {
    console.log("  🖼 Downloading thumbnail...");
    await downloadFile(naat.thumbnailUrl, thumbPath);
  }

  // Generate video
  if (!fs.existsSync(videoPath)) {
    console.log("  🎬 Generating video...");
    generateVideo(audioPath, thumbPath, videoPath, naat);
  }

  // Write caption
  const caption = generateCaption(naat);
  fs.writeFileSync(captionPath, caption);

  // Cleanup temp
  try {
    fs.unlinkSync(audioPath);
    fs.unlinkSync(thumbPath);
  } catch {}

  const sizeMb = (fs.statSync(videoPath).size / 1024 / 1024).toFixed(1);
  console.log(`  ✅ ${videoName} (${sizeMb} MB)`);
  console.log(`  💬 Caption saved: ${path.basename(captionPath)}`);
  console.log(`  📋 Caption preview:\n${caption.split("\n").slice(0, 4).join("\n")}...`);

  return true;
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Instagram Video Generator              ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // Parse args
  const args = process.argv.slice(2);
  const specificYtId = args.find((a) => a.startsWith("--youtubeId="))?.split("=")[1];
  const countArg = parseInt(args.find((a) => a.startsWith("--count="))?.split("=")[1] || "5", 10);

  fs.mkdirSync(CONFIG.tempDir, { recursive: true });
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  const naats = loadNaats();
  console.log(`Loaded ${naats.length} naats\n`);

  let toProcess;

  if (specificYtId) {
    const match = naats.find((n) => n.youtubeId === specificYtId);
    if (!match) {
      console.error(`Naat with youtubeId "${specificYtId}" not found`);
      process.exit(1);
    }
    toProcess = [match];
  } else {
    const progress = loadProgress();
    const doneSet = new Set(progress.done);
    const remaining = naats.filter((n) => !doneSet.has(n.youtubeId));
    toProcess = remaining.slice(0, countArg);
  }

  if (!toProcess.length) {
    console.log("No naats to process.");
    return;
  }

  console.log(`Generating ${toProcess.length} video(s)...`);

  for (let i = 0; i < toProcess.length; i++) {
    const naat = toProcess[i];
    await processNaat(naat);

    // Track progress
    const progress = loadProgress();
    if (!progress.done.includes(naat.youtubeId)) {
      progress.done.push(naat.youtubeId);
    }
    saveProgress(progress);

    if (i < toProcess.length - 1) {
      await sleep(2000);
    }
  }

  console.log(`\n✅ Done! Videos saved to: ${CONFIG.outputDir}`);
  console.log("📱 Open Instagram app → Upload from gallery → Paste caption.");
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
