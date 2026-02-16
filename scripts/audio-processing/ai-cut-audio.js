/**
 * AI-Powered Audio Explanation Removal - All-in-One Script
 *
 * Uses OpenAI Whisper for transcription and GPT-4 for intelligent
 * explanation detection to automatically remove non-naat segments.
 *
 * Commands:
 *   test                    - Verify setup and dependencies
 *   find                    - Find unprocessed naats
 *   preview <youtubeId>     - Preview cuts without processing
 *   process <youtubeId>     - Process single naat
 *   batch                   - Process multiple naats from batch-cuts.json
 *
 * Usage:
 *   node scripts/audio-processing/ai-cut-audio.js test
 *   node scripts/audio-processing/ai-cut-audio.js find
 *   node scripts/audio-processing/ai-cut-audio.js preview mgONEN7IqE8
 *   node scripts/audio-processing/ai-cut-audio.js process mgONEN7IqE8
 *   node scripts/audio-processing/ai-cut-audio.js batch
 */

const {
  Client,
  Databases,
  Storage,
  ID,
  Query,
  Permission,
  Role,
} = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");
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
const OpenAI = require("openai");

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Load environment variables
dotenv.config({ path: join(__dirname, "../../.env") });

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID;
const AUDIO_BUCKET_ID = "audio-files";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Directories
const TEMP_DIR = join(process.cwd(), "temp-ai-audio-cuts");
const TRANSCRIPTS_DIR = join(TEMP_DIR, "transcripts");
const BATCH_FILE = join(process.cwd(), "batch-cuts.json");
const RESULTS_FILE = join(process.cwd(), "batch-results.json");

// Initialize clients
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Ensure directories exist
 */
function ensureDirectories() {
  [TEMP_DIR, TRANSCRIPTS_DIR].forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Find naat by YouTube ID
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
  console.log(`  ✓ Found: ${naat.title}`);
  return naat;
}

/**
 * Download audio from Appwrite storage
 */
async function downloadAudio(audioId, youtubeId) {
  const outputPath = join(TEMP_DIR, `${youtubeId}_original.m4a`);

  if (existsSync(outputPath)) {
    console.log(`  ✓ Audio already downloaded`);
    return outputPath;
  }

  console.log(`  Downloading audio...`);
  const fileBuffer = await storage.getFileDownload(AUDIO_BUCKET_ID, audioId);
  writeFileSync(outputPath, Buffer.from(fileBuffer));
  console.log(`  ✓ Downloaded successfully`);
  return outputPath;
}

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeAudio(audioPath, youtubeId) {
  console.log(`  Transcribing with Whisper...`);

  const transcriptPath = join(TRANSCRIPTS_DIR, `${youtubeId}_transcript.json`);

  // Check if transcript already exists
  if (existsSync(transcriptPath)) {
    console.log(`  ✓ Using cached transcript`);
    return JSON.parse(readFileSync(transcriptPath, "utf-8"));
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: require("fs").createReadStream(audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    // Save transcript for future use
    writeFileSync(transcriptPath, JSON.stringify(transcription, null, 2));
    console.log(`  ✓ Transcription complete`);
    console.log(`  ✓ Detected language: ${transcription.language}`);

    return transcription;
  } catch (error) {
    throw new Error(`Whisper transcription failed: ${error.message}`);
  }
}

/**
 * Analyze transcript with GPT-4 to identify explanation segments
 */
async function identifyExplanations(transcription, naatTitle) {
  console.log(`  Analyzing transcript with GPT-4...`);

  const fullText = transcription.text;
  const words = transcription.words || [];

  const prompt = `You are analyzing a naat (Islamic devotional song) audio recording titled "${naatTitle}".

The audio contains:
- The actual naat (singing/recitation)
- Explanations/commentary by the speaker (which should be removed)

Your task: Identify ALL segments that are explanations/commentary (not the naat itself).

Full transcript:
${fullText}

Instructions:
1. Identify segments where the speaker is explaining, introducing, or commenting
2. Do NOT mark the actual naat singing/recitation for removal
3. Return ONLY explanation segments with their approximate start/end phrases
4. Be precise - we want to keep the naat, remove only explanations

Respond in JSON format:
{
  "explanationSegments": [
    {
      "startPhrase": "first few words of explanation",
      "endPhrase": "last few words of explanation",
      "reason": "brief reason why this is an explanation"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at analyzing Islamic naat recordings and identifying explanation segments that should be removed.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    console.log(
      `  ✓ Identified ${analysis.explanationSegments.length} explanation segments`,
    );

    return analysis.explanationSegments;
  } catch (error) {
    throw new Error(`GPT-4 analysis failed: ${error.message}`);
  }
}

/**
 * Convert phrase-based segments to timestamps
 */
function convertPhrasesToTimestamps(segments, words) {
  console.log(`  Converting phrases to timestamps...`);

  const timestampSegments = [];

  for (const segment of segments) {
    const { startPhrase, endPhrase, reason } = segment;

    // Find start timestamp
    const startWords = startPhrase.toLowerCase().split(" ").slice(0, 5);
    let startTime = null;

    for (let i = 0; i < words.length - startWords.length; i++) {
      const windowText = words
        .slice(i, i + startWords.length)
        .map((w) => w.word.toLowerCase())
        .join(" ");

      if (windowText.includes(startWords.join(" "))) {
        startTime = words[i].start;
        break;
      }
    }

    // Find end timestamp
    const endWords = endPhrase.toLowerCase().split(" ").slice(-5);
    let endTime = null;

    for (let i = words.length - 1; i >= endWords.length; i--) {
      const windowText = words
        .slice(i - endWords.length + 1, i + 1)
        .map((w) => w.word.toLowerCase())
        .join(" ");

      if (windowText.includes(endWords.join(" "))) {
        endTime = words[i].end;
        break;
      }
    }

    if (startTime !== null && endTime !== null) {
      timestampSegments.push({
        start: startTime,
        end: endTime,
        reason,
      });
      console.log(
        `    ✓ ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s: ${reason}`,
      );
    } else {
      console.log(`    ⚠️  Could not find timestamps for: ${reason}`);
    }
  }

  return timestampSegments;
}

/**
 * Build segments to keep (inverse of cuts)
 */
function buildKeepSegments(cutSegments, audioDuration) {
  // Sort by start time
  cutSegments.sort((a, b) => a.start - b.start);

  const keepSegments = [];
  let currentTime = 0;

  for (const cut of cutSegments) {
    if (currentTime < cut.start) {
      keepSegments.push({
        start: currentTime,
        end: cut.start,
      });
    }
    currentTime = cut.end;
  }

  if (currentTime < audioDuration) {
    keepSegments.push({
      start: currentTime,
      end: audioDuration,
    });
  }

  console.log(`  ✓ Built ${keepSegments.length} segments to keep`);
  return keepSegments;
}

/**
 * Get audio duration
 */
async function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration);
    });
  });
}

/**
 * Cut audio using FFmpeg
 */
async function cutAudio(inputPath, keepSegments, youtubeId) {
  console.log(`  Processing audio with ${keepSegments.length} segments...`);

  const outputPath = join(TEMP_DIR, `${youtubeId}_cut.m4a`);

  if (keepSegments.length === 0) {
    console.log(`  ⚠️  No segments to keep`);
    return null;
  }

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
          console.log(`  ✓ Audio cut successfully`);
          resolve(outputPath);
        })
        .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .run();
    });
  }

  // Multiple segments - concatenate
  return new Promise((resolve, reject) => {
    const filterComplex = [];

    keepSegments.forEach((segment, index) => {
      filterComplex.push(
        `[0:a]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${index}]`,
      );
    });

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
        console.log(`  ✓ Audio cut successfully`);
        resolve(outputPath);
      })
      .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
      .run();
  });
}

/**
 * Upload processed audio to storage
 */
async function uploadAudio(audioPath, youtubeId) {
  console.log(`  Uploading processed audio...`);

  const fileId = ID.unique();
  const fileName = `${youtubeId}_ai_cut.mp4`; // Use .mp4 for better browser compatibility

  const file = await storage.createFile(
    AUDIO_BUCKET_ID,
    fileId,
    InputFile.fromPath(audioPath, fileName),
    [Permission.read(Role.any())], // Allow public read access
  );

  console.log(`  ✓ Uploaded: ${file.$id}`);
  return file.$id;
}

/**
 * Update naat document
 */
async function updateNaat(naatId, cutAudioId) {
  console.log(`  Updating database...`);

  await databases.updateDocument(DATABASE_ID, NAATS_COLLECTION_ID, naatId, {
    cutAudio: cutAudioId,
  });

  console.log(`  ✓ Database updated`);
}

// ============================================================================
// COMMAND FUNCTIONS
// ============================================================================

/**
 * Test setup and configuration
 */
async function testSetup() {
  console.log("🔍 Testing AI Audio Processing Setup\n");

  let allGood = true;

  // Check dependencies
  console.log("📦 Checking dependencies...");
  const deps = [
    "openai",
    "fluent-ffmpeg",
    "@ffmpeg-installer/ffmpeg",
    "node-appwrite",
  ];

  for (const dep of deps) {
    try {
      require(dep);
      console.log(`  ✅ ${dep}`);
    } catch (e) {
      console.log(`  ❌ ${dep} - Run: npm install`);
      allGood = false;
    }
  }

  // Check environment variables
  console.log("\n🔑 Checking environment variables...");
  const requiredVars = [
    "OPENAI_API_KEY",
    "APPWRITE_ENDPOINT",
    "APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "APPWRITE_DATABASE_ID",
    "APPWRITE_NAATS_COLLECTION_ID",
  ];

  requiredVars.forEach((varName) => {
    if (process.env[varName]) {
      const value = process.env[varName];
      const masked =
        value.substring(0, 8) + "..." + value.substring(value.length - 4);
      console.log(`  ✅ ${varName}: ${masked}`);
    } else {
      console.log(`  ❌ ${varName}: Not set`);
      allGood = false;
    }
  });

  // Test OpenAI connection
  console.log("\n🌐 Testing OpenAI connection...");
  if (process.env.OPENAI_API_KEY) {
    try {
      await openai.models.list();
      console.log("  ✅ OpenAI API key is valid");
      console.log("  ✅ Can access Whisper and GPT-4");
    } catch (error) {
      console.log("  ❌ OpenAI API error:", error.message);
      allGood = false;
    }
  } else {
    console.log("  ⚠️  Skipping (no API key)");
  }

  console.log("\n" + "=".repeat(60));
  if (allGood) {
    console.log("✅ All checks passed! You're ready to process audio.");
    console.log("\nNext steps:");
    console.log("  1. Run: node ai-cut-audio.js find");
    console.log("  2. Run: node ai-cut-audio.js preview <youtubeId>");
    console.log("  3. Run: node ai-cut-audio.js process <youtubeId>");
  } else {
    console.log("❌ Some checks failed. Please fix the issues above.");
  }
  console.log("=".repeat(60));
}

/**
 * Find unprocessed naats
 */
async function findUnprocessed() {
  console.log("🔍 Finding unprocessed naats...\n");

  const allNaats = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await databases.listDocuments(
      DATABASE_ID,
      NAATS_COLLECTION_ID,
      [Query.limit(limit), Query.offset(offset)],
    );

    allNaats.push(...response.documents);

    if (response.documents.length < limit) break;
    offset += limit;
  }

  console.log(`✓ Found ${allNaats.length} total naats\n`);

  const unprocessed = allNaats.filter((naat) => naat.audioId && !naat.cutAudio);

  console.log(`📊 Analysis:`);
  console.log(`   Total naats: ${allNaats.length}`);
  console.log(`   With audio: ${allNaats.filter((n) => n.audioId).length}`);
  console.log(`   With cutAudio: ${allNaats.filter((n) => n.cutAudio).length}`);
  console.log(`   Need processing: ${unprocessed.length}\n`);

  if (unprocessed.length === 0) {
    console.log("✅ All naats are processed!\n");
    return;
  }

  const byChannel = {};
  unprocessed.forEach((naat) => {
    const channel = naat.channelName || "Unknown";
    if (!byChannel[channel]) byChannel[channel] = [];
    byChannel[channel].push(naat);
  });

  console.log("📋 Unprocessed naats by channel:\n");
  Object.entries(byChannel)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([channel, naats]) => {
      console.log(`   ${channel}: ${naats.length} naats`);
    });

  const batchConfig = { youtubeIds: unprocessed.map((n) => n.youtubeId) };
  writeFileSync(BATCH_FILE, JSON.stringify(batchConfig, null, 2));

  console.log(`\n✅ Created batch-cuts.json with ${unprocessed.length} naats`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review batch-cuts.json`);
  console.log(`   2. Run: node ai-cut-audio.js batch`);
  console.log(
    `\n💰 Estimated cost: $${(unprocessed.length * 0.15).toFixed(2)}\n`,
  );
}

/**
 * Preview cuts without processing
 */
async function previewCuts(youtubeId) {
  console.log("🔍 AI Audio Cuts Preview\n");
  console.log(`📋 Finding naat: ${youtubeId}`);

  const naat = await findNaatByYoutubeId(youtubeId);
  console.log(`  ✓ ${naat.title}\n`);

  if (!naat.audioId) throw new Error("No audio file found");

  console.log("📥 Downloading audio...");
  const audioPath = await downloadAudio(naat.audioId, youtubeId);
  console.log("  ✓ Downloaded\n");

  console.log("🎤 Transcribing...");
  const transcription = await transcribeAudio(audioPath, youtubeId);
  console.log(`  ✓ Language: ${transcription.language}`);
  console.log(`  ✓ Duration: ${transcription.duration.toFixed(1)}s\n`);

  console.log("🤖 Analyzing with AI...");
  const analysis = await identifyExplanations(transcription, naat.title);
  const segments = analysis.explanationSegments;

  if (segments.length === 0) {
    console.log("\n✅ No explanations detected - audio is clean!\n");
    return;
  }

  console.log(`  ✓ Found ${segments.length} explanation segments\n`);
  console.log("✂️  Segments to Remove:\n");
  console.log("=".repeat(70));

  const timestampSegments = convertPhrasesToTimestamps(
    segments,
    transcription.words,
  );
  let totalRemoved = 0;

  timestampSegments.forEach((seg, i) => {
    totalRemoved += seg.duration;
    const formatTime = (s) => {
      const mins = Math.floor(s / 60);
      const secs = Math.floor(s % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };
    console.log(
      `\n${i + 1}. ${formatTime(seg.start)} - ${formatTime(seg.end)} (${seg.duration.toFixed(1)}s)`,
    );
    console.log(`   Reason: ${seg.reason}`);
    console.log(`   Starts: "${seg.startPhrase.substring(0, 50)}..."`);
    console.log(
      `   Ends: "...${seg.endPhrase.substring(seg.endPhrase.length - 50)}"`,
    );
  });

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  console.log("\n" + "=".repeat(70));
  console.log("\n📊 Summary:");
  console.log(`   Original duration: ${formatTime(transcription.duration)}`);
  console.log(`   Total removed: ${formatTime(totalRemoved)}`);
  console.log(
    `   Final duration: ${formatTime(transcription.duration - totalRemoved)}`,
  );
  console.log(
    `   Removed: ${((totalRemoved / transcription.duration) * 100).toFixed(1)}%`,
  );
  console.log("\n💡 Next Steps:");
  console.log(`   To process: node ai-cut-audio.js process ${youtubeId}\n`);
}

/**
 * Process batch of naats
 */
async function processBatch() {
  console.log("🤖 Batch AI Audio Processing\n");

  if (!existsSync(BATCH_FILE)) {
    console.error(`❌ batch-cuts.json not found`);
    console.log("\nRun: node ai-cut-audio.js find");
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(BATCH_FILE, "utf-8"));
  const youtubeIds = config.youtubeIds;

  console.log(`📋 Found ${youtubeIds.length} naats to process\n`);

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < youtubeIds.length; i++) {
    const youtubeId = youtubeIds[i];
    console.log(`\n[${i + 1}/${youtubeIds.length}] Processing: ${youtubeId}`);
    console.log("=".repeat(70));

    try {
      const result = await processNaat(youtubeId);
      results.push({ youtubeId, success: result.success });
      if (result.success) successCount++;
      else failCount++;
    } catch (error) {
      console.error(`\n❌ Failed: ${error.message}`);
      results.push({ youtubeId, success: false, error: error.message });
      failCount++;
    }

    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("📊 BATCH PROCESSING COMPLETE");
  console.log(`${"=".repeat(70)}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Total: ${youtubeIds.length}`);
  console.log(`${"=".repeat(70)}\n`);
}

/**
 * Main processing function
 */
async function processNaat(youtubeId) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${youtubeId}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // Step 1: Find naat
    console.log("📋 Step 1: Finding naat...");
    const naat = await findNaatByYoutubeId(youtubeId);

    if (!naat.audioId) {
      throw new Error("No audio file found");
    }

    // Step 2: Download audio
    console.log("\n📥 Step 2: Downloading audio...");
    const audioPath = await downloadAudio(naat.audioId, youtubeId);

    // Step 3: Get duration
    console.log("\n⏱️  Step 3: Getting audio duration...");
    const duration = await getAudioDuration(audioPath);
    console.log(`  ✓ Duration: ${duration.toFixed(2)}s`);

    // Step 4: Transcribe with Whisper
    console.log("\n🎤 Step 4: Transcribing audio...");
    const transcription = await transcribeAudio(audioPath, youtubeId);

    // Step 5: Identify explanations with GPT-4
    console.log("\n🤖 Step 5: Analyzing with AI...");
    const explanationSegments = await identifyExplanations(
      transcription,
      naat.title,
    );

    if (explanationSegments.length === 0) {
      console.log("\n✅ No explanations detected - audio is clean!");
      return { success: true, noChangesNeeded: true };
    }

    // Step 6: Convert to timestamps
    console.log("\n⏰ Step 6: Converting to timestamps...");
    const cutSegments = convertPhrasesToTimestamps(
      explanationSegments,
      transcription.words,
    );

    if (cutSegments.length === 0) {
      console.log("\n⚠️  Could not map explanations to timestamps");
      return { success: false, reason: "Timestamp mapping failed" };
    }

    // Step 7: Build keep segments
    console.log("\n✂️  Step 7: Building segments...");
    const keepSegments = buildKeepSegments(cutSegments, duration);

    // Step 8: Cut audio
    console.log("\n🎵 Step 8: Cutting audio...");
    const cutAudioPath = await cutAudio(audioPath, keepSegments, youtubeId);

    if (!cutAudioPath) {
      throw new Error("Audio cutting failed");
    }

    // Step 9: Upload
    console.log("\n☁️  Step 9: Uploading...");
    const cutAudioId = await uploadAudio(cutAudioPath, youtubeId);

    // Step 10: Update database
    console.log("\n💾 Step 10: Updating database...");
    await updateNaat(naat.$id, cutAudioId);

    // Cleanup
    console.log("\n🧹 Cleaning up...");
    [audioPath, cutAudioPath].forEach((path) => {
      try {
        unlinkSync(path);
      } catch (err) {
        console.log(`  ⚠️  Could not delete: ${path}`);
      }
    });

    console.log("\n✅ Processing complete!");
    return { success: true, cutAudioId };
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main
 */
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  if (!command) {
    console.log("🤖 AI-Powered Audio Explanation Removal\n");
    console.log("Commands:");
    console.log("  test                    - Verify setup and dependencies");
    console.log("  find                    - Find unprocessed naats");
    console.log("  preview <youtubeId>     - Preview cuts without processing");
    console.log("  process <youtubeId>     - Process single naat");
    console.log("  batch                   - Process multiple naats\n");
    console.log("Examples:");
    console.log("  node ai-cut-audio.js test");
    console.log("  node ai-cut-audio.js find");
    console.log("  node ai-cut-audio.js preview mgONEN7IqE8");
    console.log("  node ai-cut-audio.js process mgONEN7IqE8");
    console.log("  node ai-cut-audio.js batch\n");
    process.exit(0);
  }

  ensureDirectories();

  try {
    switch (command) {
      case "test":
        await testSetup();
        break;

      case "find":
        await findUnprocessed();
        break;

      case "preview":
        if (!arg) {
          console.error("❌ Usage: node ai-cut-audio.js preview <youtubeId>");
          process.exit(1);
        }
        await previewCuts(arg);
        break;

      case "process":
        if (!arg) {
          console.error("❌ Usage: node ai-cut-audio.js process <youtubeId>");
          process.exit(1);
        }
        if (!OPENAI_API_KEY) {
          console.error("❌ OPENAI_API_KEY not found in environment");
          process.exit(1);
        }
        const result = await processNaat(arg);
        console.log(`\n${"=".repeat(60)}`);
        if (result.success) {
          console.log("✅ SUCCESS!");
          if (result.noChangesNeeded) {
            console.log("No explanations found - audio is already clean");
          } else {
            console.log(`Cut audio ID: ${result.cutAudioId}`);
          }
        } else {
          console.log("⚠️  FAILED");
          console.log(`Reason: ${result.reason || result.error}`);
        }
        console.log(`${"=".repeat(60)}`);
        break;

      case "batch":
        if (!OPENAI_API_KEY) {
          console.error("❌ OPENAI_API_KEY not found in environment");
          process.exit(1);
        }
        await processBatch();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log("\nRun without arguments to see available commands");
        process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

main();
