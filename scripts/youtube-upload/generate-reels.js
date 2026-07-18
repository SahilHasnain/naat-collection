#!/usr/bin/env node

/**
 * Instagram Reel Generator for Owais Raza Qadri.
 *
 * Creates 9:16 short-form Reels (30-45s clips) optimized for
 * Instagram's algorithm — new accounts with 0 followers.
 *
 * Strategy:
 *   - 9:16 vertical (1080×1920) — Reels format
 *   - 30-45 second clip from middle of naat
 *   - Blurred thumbnail background + centered image
 *   - App branding overlay with CTA
 *   - Caption with Play Store link
 *   - 1-2 posts/day to build algorithm momentum
 *
 * Usage:
 *   node scripts/youtube-upload/generate-reels.js              # next 2 unprocessed
 *   node scripts/youtube-upload/generate-reels.js --youtubeId=xxx  # specific naat
 *   node scripts/youtube-upload/generate-reels.js --count=5
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
  playStoreUrl: process.env.PLAY_STORE_URL
    || "https://play.google.com/store/apps/details?id=com.owaisrazaqadri",
  outputDir: path.join(__dirname, "../../reels-uploads"),
  tempDir: path.join(__dirname, "temp-reels"),
  progressFile: path.join(__dirname, "reels-progress.json"),
  naatsFile: path.join(__dirname, "../../static-exports/naats-export.json"),
  radioOnly: process.env.FILTER_RADIO_ONLY === "true",

  // Reel format: 9:16 vertical
  width: 1080,
  height: 1920,

  // Clip: 30-45s from the middle 60% of the audio
  clipMinDuration: 30,
  clipMaxDuration: 45,

  // Font (use font name, not fontfile, to avoid Windows drive colon issues)
  fontName: "Arial",
};

// ── Data ─────────────────────────────────────────────────

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

// ── Download ──────────────────────────────────────────────

function getAppwrite() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  return { storage: new Storage(client) };
}

async function downloadAudio(fileId, dest) {
  const { storage } = getAppwrite();
  const buf = await storage.getFileDownload("audio-files", fileId);
  fs.writeFileSync(dest, Buffer.from(buf));
}

function downloadFile(urlStr, dest) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(urlStr);
    const file = fs.createWriteStream(dest);
    https
      .get({ ...parsed, rejectUnauthorized: false }, (res) => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

// ── FFmpeg Reel Generation ───────────────────────────────

function getClipRange(totalDurationSec) {
  // Take from the middle 60% of the audio
  const start = Math.floor(totalDurationSec * 0.15);
  const maxEnd = Math.floor(totalDurationSec * 0.85);
  const available = maxEnd - start;
  const duration = Math.min(CONFIG.clipMaxDuration, available);
  if (duration < CONFIG.clipMinDuration) {
    // If too short, just take what's available
    return { start: 0, duration: Math.min(CONFIG.clipMaxDuration, totalDurationSec) };
  }
  return { start, duration };
}

function generateReel(audioPath, thumbPath, outputPath, naat, clipStart, clipDuration) {
  // Normalize paths to forward slashes for ffmpeg
  audioPath = audioPath.replace(/\\/g, "/");
  thumbPath = thumbPath.replace(/\\/g, "/");
  outputPath = outputPath.replace(/\\/g, "/");
  const { width, height } = CONFIG;


  // Filter chain:
  // 1. Scale thumbnail to fill canvas, split into 2 streams
  // 2. Stream 1: blur heavily → background
  // 3. Stream 2: center-crop to fit → foreground
  // 4. Overlay foreground centered on blurred background
  // 5. Draw text overlays

  // Escape single quotes for ffmpeg filter text
  const esc = (s) => `'${s.replace(/'/g, "'\\\\''").replace(/:/g, "\\:")}'`;

  const filter = `
    [0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},split=2[bg][fg];
    [bg]scale=${width*2}:${height*2}:force_original_aspect_ratio=increase,
         crop=${width}:${height},
         boxblur=40:5[bgblur];
    [bgblur][fg]overlay=(W-w)/2:(H-h)/2,
    drawtext=
      text=${esc("Listen to full naat without explanation in the app")}:
      x=(w-text_w)/2:
      y=h*0.85:
      font=${CONFIG.fontName}:
      fontsize=28:
      fontcolor=white:
      box=1:
      boxcolor=black@0.65:
      boxborderw=16:
      borderw=0[out]
  `.replace(/\n\s+/g, " ");

  const cmd =
    `ffmpeg -y -loop 1 -i "${thumbPath}" ` +
    `-ss ${clipStart} -t ${clipDuration} -i "${audioPath}" ` +
    `-filter_complex "${filter}" ` +
    `-map "[out]" -map 1:a ` +
    `-c:v libx264 -preset ultrafast -tune stillimage ` +
    `-c:a aac -b:a 192k -pix_fmt yuv420p -shortest -movflags +faststart ` +
    `"${outputPath}"`;

  execSync(cmd, { stdio: "pipe" });
}

// ── Caption ──────────────────────────────────────────────

function generateCaption(naat) {
  return [
    `${naat.title}`,
    ``,
    `🎧 Listen to this naat and 2700+ others WITHOUT explanations in the app 👇`,
    CONFIG.playStoreUrl,
    ``,
    `#naat #islamic #nasheed #noexplanation #owaisrazaqadri`,
  ].join("\n");
}

// ── Audio Duration ───────────────────────────────────────

function getAudioDuration(audioPath) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`,
    { stdio: "pipe" },
  );
  return parseFloat(out.toString().trim());
}

// ── Main ─────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processNaat(naat) {
  const audioPath = path.join(CONFIG.tempDir, `${naat.cutAudio}.m4a`);
  const thumbPath = path.join(CONFIG.tempDir, `${naat.youtubeId}.jpg`);
  const videoName = `${naat.youtubeId}_reel.mp4`;
  const videoPath = path.join(CONFIG.outputDir, videoName);
  const captionPath = path.join(CONFIG.outputDir, `${naat.youtubeId}_caption.txt`);

  console.log(`\n[${naat.youtubeId}] ${naat.title}`);

  if (!fs.existsSync(audioPath)) {
    console.log("  ⬇ Audio...");
    await downloadAudio(naat.cutAudio, audioPath);
  }

  if (!fs.existsSync(thumbPath)) {
    console.log("  🖼 Thumbnail...");
    await downloadFile(naat.thumbnailUrl, thumbPath);
  }

  console.log("  ⏱ Analyzing audio...");
  const totalSec = getAudioDuration(audioPath);
  const { start, duration } = getClipRange(totalSec);
  console.log(`     ${Math.floor(totalSec / 60)}:${String(Math.floor(totalSec % 60)).padStart(2, "0")} total → clip ${start}s for ${duration}s`);

  if (!fs.existsSync(videoPath)) {
    console.log("  🎬 Generating Reel...");
    generateReel(audioPath, thumbPath, videoPath, naat, start, duration);
  }

  const caption = generateCaption(naat);
  fs.writeFileSync(captionPath, caption);

  try { fs.unlinkSync(audioPath); } catch {}
  try { fs.unlinkSync(thumbPath); } catch {}

  const mb = (fs.statSync(videoPath).size / 1024 / 1024).toFixed(1);
  console.log(`  ✅ ${videoName} (${mb} MB)`);
  console.log(`  💬 ${path.basename(captionPath)}`);
  console.log(`  📋 ${caption.split("\n")[0]}...`);
  return true;
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     Instagram Reel Generator             ║");
  console.log("║     Owais Raza Qadri                     ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const args = process.argv.slice(2);
  const specific = args.find((a) => a.startsWith("--youtubeId="))?.split("=")[1];
  const count = parseInt(
    args.find((a) => a.startsWith("--count="))?.split("=")[1] || "2", 10,
  );

  fs.mkdirSync(CONFIG.tempDir, { recursive: true });
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  const naats = loadNaats();
  console.log(`Loaded ${naats.length} naats\n`);

  let toProcess;
  if (specific) {
    const match = naats.find((n) => n.youtubeId === specific);
    if (!match) { console.error("Not found"); process.exit(1); }
    toProcess = [match];
  } else {
    const prog = loadProgress();
    const done = new Set(prog.done);
    toProcess = naats.filter((n) => !done.has(n.youtubeId)).slice(0, count);
  }

  if (!toProcess.length) { console.log("All done."); return; }

  console.log(`Generating ${toProcess.length} Reel(s)...\n`);

  for (let i = 0; i < toProcess.length; i++) {
    const naat = toProcess[i];
    await processNaat(naat);

    const prog = loadProgress();
    if (!prog.done.includes(naat.youtubeId)) prog.done.push(naat.youtubeId);
    saveProgress(prog);

    if (i < toProcess.length - 1) await sleep(2000);
  }

  console.log(`\n✅ Done! ${toProcess.length} Reel(s) in: ${CONFIG.outputDir}`);
  console.log("📱 Open Instagram → Reel → Upload from gallery → Paste caption.");
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
