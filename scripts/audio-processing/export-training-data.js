/**
 * Export Training Data for Naat vs Explanation Classifier
 *
 * Pulls labeled naats from Appwrite (those with cutSegments),
 * downloads original audio, and splits into labeled 5-second chunks:
 *   - "naat" chunks (singing/recitation portions)
 *   - "explanation" chunks (speech/commentary portions)
 *
 * Output structure:
 *   training-data/
 *   ├── naat/          # 5-sec .wav chunks of naat singing
 *   ├── explanation/   # 5-sec .wav chunks of explanation speech
 *   └── manifest.json  # metadata about all chunks
 *
 * Usage:
 *   node scripts/audio-processing/export-training-data.js
 *
 * Prerequisites:
 *   - .env with Appwrite credentials at repo root
 *   - ffmpeg installed (via @ffmpeg-installer/ffmpeg)
 *   - Naats with cutSegments attribute populated via admin panel
 */

const { Client, Databases, Storage, Query } = require("node-appwrite");
const dotenv = require("dotenv");
const {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
} = require("fs");
const { join } = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

ffmpeg.setFfmpegPath(ffmpegPath);

dotenv.config({ path: join(__dirname, "../../.env") });

// ── Config ────────────────────────────────────────────────────
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID;
const AUDIO_BUCKET_ID = "audio-files";

const CHUNK_DURATION = 5; // seconds per training chunk
const SAMPLE_RATE = 16000; // 16kHz for Wav2Vec2
const OUTPUT_DIR = join(process.cwd(), "training-data");
const TEMP_DIR = join(OUTPUT_DIR, "temp");
const NAAT_DIR = join(OUTPUT_DIR, "naat");
const EXPLANATION_DIR = join(OUTPUT_DIR, "explanation");

// ── Appwrite Client ───────────────────────────────────────────
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

// ── Helpers ───────────────────────────────────────────────────

function ensureDirs() {
  [OUTPUT_DIR, TEMP_DIR, NAAT_DIR, EXPLANATION_DIR].forEach((dir) => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });
}

async function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Extract a single chunk from audio as 16kHz mono WAV
 */
function extractChunk(inputPath, start, duration, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(duration)
      .audioFrequency(SAMPLE_RATE)
      .audioChannels(1)
      .audioCodec("pcm_s16le")
      .format("wav")
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

/**
 * Fetch all naats that have cutSegments populated
 */
async function fetchLabeledNaats() {
  const allNaats = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await databases.listDocuments(
      DATABASE_ID,
      NAATS_COLLECTION_ID,
      [
        Query.isNotNull("cutSegments"),
        Query.isNotNull("audioId"),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );

    allNaats.push(...response.documents);
    if (response.documents.length < limit) break;
    offset += limit;
  }

  return allNaats;
}

/**
 * Build labeled time ranges from cutSegments and total duration.
 * cutSegments = explanation parts (removed during cutting).
 * Everything else = naat.
 */
function buildLabeledRanges(cutSegmentsJson, totalDuration) {
  let explanationRanges;
  try {
    explanationRanges = JSON.parse(cutSegmentsJson);
  } catch {
    return { naat: [], explanation: [] };
  }

  if (!Array.isArray(explanationRanges)) {
    return { naat: [], explanation: [] };
  }

  // Sort explanation segments by start time
  const sorted = [...explanationRanges].sort((a, b) => a.start - b.start);

  // Build naat ranges (inverse of explanation)
  const naatRanges = [];
  let cursor = 0;

  for (const seg of sorted) {
    if (cursor < seg.start) {
      naatRanges.push({ start: cursor, end: seg.start });
    }
    cursor = Math.max(cursor, seg.end);
  }

  if (cursor < totalDuration) {
    naatRanges.push({ start: cursor, end: totalDuration });
  }

  return {
    naat: naatRanges,
    explanation: sorted.map((s) => ({ start: s.start, end: s.end })),
  };
}

/**
 * Split a time range into fixed-size chunks.
 * Drops the last chunk if it's less than half the chunk duration.
 */
function splitIntoChunks(ranges, chunkDuration) {
  const chunks = [];
  for (const range of ranges) {
    let t = range.start;
    while (t + chunkDuration <= range.end) {
      chunks.push({ start: t, end: t + chunkDuration });
      t += chunkDuration;
    }
    // Keep partial chunk only if >= half the chunk duration
    const remaining = range.end - t;
    if (remaining >= chunkDuration / 2) {
      chunks.push({ start: t, end: range.end });
    }
  }
  return chunks;
}

/**
 * Process a single naat: download, split into labeled chunks
 */
async function processNaat(naat, manifest) {
  const naatId = naat.$id;
  const youtubeId = naat.youtubeId || naatId;
  const audioPath = join(TEMP_DIR, `${naatId}_original.mp4`);

  console.log(`\n  Downloading audio for: ${naat.title || youtubeId}`);

  // Download original audio
  const audioBuffer = await storage.getFileDownload(
    AUDIO_BUCKET_ID,
    naat.audioId,
  );
  writeFileSync(audioPath, Buffer.from(audioBuffer));

  const totalDuration = await getAudioDuration(audioPath);
  console.log(`  Duration: ${totalDuration.toFixed(1)}s`);

  const { naat: naatRanges, explanation: explanationRanges } =
    buildLabeledRanges(naat.cutSegments, totalDuration);

  console.log(
    `  Naat ranges: ${naatRanges.length}, Explanation ranges: ${explanationRanges.length}`,
  );

  // Split ranges into fixed-size chunks
  const naatChunks = splitIntoChunks(naatRanges, CHUNK_DURATION);
  const explanationChunks = splitIntoChunks(explanationRanges, CHUNK_DURATION);

  console.log(
    `  Chunks: ${naatChunks.length} naat, ${explanationChunks.length} explanation`,
  );

  // Extract naat chunks
  for (let i = 0; i < naatChunks.length; i++) {
    const chunk = naatChunks[i];
    const filename = `${youtubeId}_naat_${String(i).padStart(3, "0")}.wav`;
    const outPath = join(NAAT_DIR, filename);
    await extractChunk(audioPath, chunk.start, chunk.end - chunk.start, outPath);
    manifest.push({
      file: `naat/${filename}`,
      label: "naat",
      source: youtubeId,
      start: chunk.start,
      end: chunk.end,
    });
  }

  // Extract explanation chunks
  for (let i = 0; i < explanationChunks.length; i++) {
    const chunk = explanationChunks[i];
    const filename = `${youtubeId}_expl_${String(i).padStart(3, "0")}.wav`;
    const outPath = join(EXPLANATION_DIR, filename);
    await extractChunk(audioPath, chunk.start, chunk.end - chunk.start, outPath);
    manifest.push({
      file: `explanation/${filename}`,
      label: "explanation",
      source: youtubeId,
      start: chunk.start,
      end: chunk.end,
    });
  }

  // Cleanup temp file
  try { unlinkSync(audioPath); } catch { /* ignore */ }

  return { naatChunks: naatChunks.length, explanationChunks: explanationChunks.length };
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("🎵 Naat Training Data Exporter\n");

  // Validate env
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    console.error("❌ Missing Appwrite env vars. Check your .env file.");
    process.exit(1);
  }

  ensureDirs();

  // Fetch labeled naats
  console.log("📋 Fetching labeled naats from Appwrite...");
  const naats = await fetchLabeledNaats();
  console.log(`   Found ${naats.length} naats with cutSegments\n`);

  if (naats.length === 0) {
    console.log("❌ No labeled naats found. Use the admin panel to cut some naats first.");
    process.exit(1);
  }

  // Filter out naats with empty/invalid cutSegments
  const validNaats = naats.filter((n) => {
    try {
      const segs = JSON.parse(n.cutSegments);
      return Array.isArray(segs);
    } catch {
      return false;
    }
  });

  console.log(`   ${validNaats.length} naats have valid cutSegments`);
  console.log(`   (${naats.length - validNaats.length} skipped due to invalid data)\n`);

  const manifest = [];
  let totalNaat = 0;
  let totalExplanation = 0;

  for (let i = 0; i < validNaats.length; i++) {
    const naat = validNaats[i];
    console.log(`[${i + 1}/${validNaats.length}] ${naat.title || naat.youtubeId}`);

    try {
      const counts = await processNaat(naat, manifest);
      totalNaat += counts.naatChunks;
      totalExplanation += counts.explanationChunks;
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
    }
  }

  // ── Save manifest ─────────────────────────────────────────
  const manifestPath = join(OUTPUT_DIR, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📦 Manifest saved to ${manifestPath}`);

  // ── Cleanup temp dir ──────────────────────────────────────
  try {
    const tempFiles = readdirSync(TEMP_DIR);
    for (const f of tempFiles) {
      try { unlinkSync(join(TEMP_DIR, f)); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  // ── Summary ───────────────────────────────────────────────
  const total = totalNaat + totalExplanation;
  console.log("\n════════════════════════════════════════");
  console.log("  📊 Export Summary");
  console.log("════════════════════════════════════════");
  console.log(`  Total chunks:       ${total}`);
  console.log(`  Naat chunks:        ${totalNaat}`);
  console.log(`  Explanation chunks: ${totalExplanation}`);
  console.log(`  Class balance:      ${total > 0 ? ((totalNaat / total) * 100).toFixed(1) : 0}% naat / ${total > 0 ? ((totalExplanation / total) * 100).toFixed(1) : 0}% explanation`);
  console.log(`  Output dir:         ${OUTPUT_DIR}`);
  console.log("════════════════════════════════════════\n");

  if (total === 0) {
    console.log("⚠️  No chunks exported. Make sure your naats have valid cutSegments with actual time ranges.");
  } else if (Math.abs(totalNaat - totalExplanation) / total > 0.5) {
    console.log("⚠️  Class imbalance detected. Consider labeling more naats to balance the dataset.");
  } else {
    console.log("✅ Dataset looks good! Ready for Step 2: upload to HuggingFace.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
