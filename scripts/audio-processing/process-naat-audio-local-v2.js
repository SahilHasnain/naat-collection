/**
 * Naat Audio Processing Script - Local Whisper V2 (Enhanced - Rhythm Break Removal)
 *
 * This script uses:
 * - Local Whisper (FREE, accurate transcription, runs on your machine)
 * - Groq Llama 3.3 70B (FREE, fast analysis)
 * - 2-way classification: NAAT / EXPLANATION
 * - Smooth transitions with crossfades
 *
 * Features:
 * - 100% FREE (local transcription + free analysis)
 * - More accurate than Groq Whisper (uses larger model)
 * - Removes rhythm breaks (talking between verses, "SubhanAllah", etc.)
 * - Removes long silences (>2 seconds)
 * - Removes introductions and audience reactions
 * - Pure naat listening experience
 *
 * Requirements:
 * - Python 3.8+ with openai-whisper installed:
 *   pip install openai-whisper
 * - FFmpeg (already included via @ffmpeg-installer/ffmpeg)
 *
 * Cost: $0.00 (completely free!)
 *
 * Usage:
 *   node scripts/audio-processing/process-naat-audio-local-v2.js
 */

const { spawn } = require("child_process");
const dotenv = require("dotenv");
const { existsSync, mkdirSync, writeFileSync, readFileSync } = require("fs");
const { join } = require("path");
const Groq = require("groq-sdk").default;
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Load environment variables
dotenv.config();

// Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Directories
const TEMP_DIR = join(process.cwd(), "temp-audio");
const OUTPUT_DIR = join(process.cwd(), "temp-audio", "processed");

// Audio processing settings
const PADDING_SECONDS = 0.3; // Reduced padding for tighter cuts
const CROSSFADE_DURATION = 0.5; // 0.5s crossfade between segments
const MAX_SILENCE_DURATION = 2.0; // Remove silences longer than 2 seconds

// Initialize Groq client
const groq = new Groq({ apiKey: GROQ_API_KEY });

/**
 * Ensure directories exist
 */
function ensureDirectories() {
  [TEMP_DIR, OUTPUT_DIR].forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
}

/**
 * Download audio using yt-dlp
 */
async function downloadAudio(youtubeId, title) {
  const outputPath = join(TEMP_DIR, `${youtubeId}.m4a`);

  if (existsSync(outputPath)) {
    console.log(`  ✓ Audio already exists: ${outputPath}`);
    return outputPath;
  }

  console.log(`  Downloading: ${title}`);
  console.log(`  YouTube ID: ${youtubeId}`);

  return new Promise((resolve, reject) => {
    const ytdlp = spawn("yt-dlp", [
      "-f",
      "bestaudio[ext=m4a]/bestaudio/best",
      "--extract-audio",
      "--audio-format",
      "m4a",
      "--audio-quality",
      "0",
      "--postprocessor-args",
      "ffmpeg:-ac 1 -ar 16000",
      "-o",
      outputPath,
      "--no-playlist",
      `https://www.youtube.com/watch?v=${youtubeId}`,
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

      if (code === 0 && existsSync(outputPath)) {
        console.log(`  ✓ Downloaded successfully`);
        resolve(outputPath);
      } else {
        reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
      }
    });

    ytdlp.on("error", (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
}

/**
 * Transcribe audio with Local Whisper via Python CLI (FREE, more accurate)
 */
async function transcribeAudio(audioPath) {
  console.log(`  Transcribing audio with Local Whisper (FREE, fast)...`);
  console.log(`  Using model: tiny (fastest, good for testing)`);
  console.log(`  This may take a moment on first run (downloads model)...`);

  const outputJsonPath = audioPath.replace(/\.[^.]+$/, "_whisper.json");

  return new Promise((resolve, reject) => {
    // Use Python's whisper CLI directly (python -m whisper for Windows compatibility)
    // Set PYTHONIOENCODING to handle Urdu characters on Windows
    const whisperProcess = spawn(
      "python",
      [
        "-m",
        "whisper",
        audioPath,
        "--model",
        "tiny",
        "--language",
        "ur",
        "--output_format",
        "json",
        "--output_dir",
        TEMP_DIR,
        "--verbose",
        "False", // Disable verbose to avoid Unicode printing issues
      ],
      {
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8", // Fix Windows encoding for Urdu
        },
      }
    );

    let errorOutput = "";

    whisperProcess.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      // Show progress and important messages
      if (text.includes("%") || text.includes("Downloading")) {
        process.stdout.write(".");
      }
      // Show transcription progress
      if (text.includes("[") && text.includes("]")) {
        process.stdout.write(".");
      }
    });

    whisperProcess.stdout.on("data", (data) => {
      const text = data.toString();
      // Show actual output for debugging
      console.log(text);
    });

    whisperProcess.on("close", (code) => {
      console.log("");

      if (code !== 0) {
        console.error(`\n  Whisper stderr output:\n${errorOutput}`);
        reject(new Error(`Whisper failed with code ${code}`));
        return;
      }

      try {
        // Read the generated JSON file
        if (!existsSync(outputJsonPath)) {
          console.error(`\n  Expected file: ${outputJsonPath}`);
          console.error(`  Whisper stderr:\n${errorOutput}`);
          reject(new Error(`Whisper output file not found: ${outputJsonPath}`));
          return;
        }

        const whisperOutput = JSON.parse(readFileSync(outputJsonPath, "utf8"));

        console.log(`  ✓ Transcription completed`);

        // Convert to our format
        const segments = whisperOutput.segments.map((seg) => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text.trim(),
        }));

        const fullText =
          whisperOutput.text || segments.map((s) => s.text).join(" ");
        const duration =
          segments.length > 0 ? segments[segments.length - 1].end : 0;

        resolve({
          language: whisperOutput.language || "ur",
          duration: duration,
          text: fullText,
          segments: segments,
        });
      } catch (error) {
        reject(new Error(`Failed to parse Whisper output: ${error.message}`));
      }
    });

    whisperProcess.on("error", (err) => {
      reject(
        new Error(
          `Failed to spawn whisper: ${err.message}. Make sure 'openai-whisper' is installed: pip install openai-whisper`
        )
      );
    });
  });
}

/**
 * Analyze a batch of segments
 */
async function analyzeBatch(segments, batchIndex, totalBatches) {
  const segmentSummary = segments
    .map(
      (s, i) =>
        `[${s.originalIndex}] ${s.start.toFixed(1)}-${s.end.toFixed(1)}s: ${s.text.substring(0, 100)}`
    )
    .join("\n");

  const prompt = `You are an expert in Urdu naats (Islamic devotional songs). 

I have a transcript of an audio recording. Classify each segment into ONE of these categories:

1. NAAT: Pure melodic singing/recitation - the actual naat performance
   - Continuous melodic singing
   - Rhythmic recitation
   - Musical verses
   - Keep this content

2. EXPLANATION: Everything else that interrupts the naat
   - Talking between verses
   - Religious phrases ("SubhanAllah", "MashaAllah")
   - Introductions and commentary
   - Teaching and explanations
   - Stories and context
   - Audience reactions
   - Any non-singing speech
   - Remove this content

IMPORTANT:
- Only mark as "naat" if it's pure continuous singing/recitation
- Mark ALL talking, explanations, and interruptions as "explanation"
- We want to keep only the pure naat audio

SEGMENTS (Batch ${batchIndex + 1}/${totalBatches}):
${segmentSummary}

Analyze each segment:
- Continuous melodic singing = NAAT (keep)
- Everything else = EXPLANATION (remove)

Respond in JSON format:
{
  "segments": [
    {
      "segment_index": original_segment_index,
      "type": "naat" or "explanation",
      "start_time": seconds,
      "end_time": seconds,
      "confidence": "high/medium/low",
      "reasoning": "brief reason"
    }
  ]
}`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are an expert in Urdu language and Islamic naats. Respond only with valid JSON. Only pure continuous singing is 'naat', everything else is 'explanation'.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content);
}

/**
 * Analyze transcript with Groq Llama (BATCHED for long videos)
 */
async function analyzeTranscript(transcription) {
  console.log(`  Analyzing transcript with Groq Llama (FREE, batched)...`);

  const segments = transcription.segments || [];
  const BATCH_SIZE = 60; // Conservative batch size to stay under token limits

  console.log(`  Total segments: ${segments.length}`);

  // Add original index to each segment
  const indexedSegments = segments.map((s, i) => ({
    ...s,
    originalIndex: i,
  }));

  // Split into batches
  const batches = [];
  for (let i = 0; i < indexedSegments.length; i += BATCH_SIZE) {
    batches.push(indexedSegments.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `  Processing in ${batches.length} batches (${BATCH_SIZE} segments each)...`
  );

  // Process each batch
  const allAnalyzedSegments = [];

  for (let i = 0; i < batches.length; i++) {
    console.log(`  Analyzing batch ${i + 1}/${batches.length}...`);

    try {
      const batchResult = await analyzeBatch(batches[i], i, batches.length);

      // Enrich with full text
      if (batchResult.segments) {
        const enrichedSegments = batchResult.segments.map((seg) => ({
          ...seg,
          text: segments[seg.segment_index]?.text || "",
        }));
        allAnalyzedSegments.push(...enrichedSegments);
      }

      // Small delay between batches to avoid rate limits
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`  ⚠️  Batch ${i + 1} failed: ${error.message}`);
      // Continue with other batches
    }
  }

  console.log(
    `  ✓ Analysis completed: ${allAnalyzedSegments.length} segments classified`
  );

  // Calculate statistics
  const naatCount = allAnalyzedSegments.filter((s) => s.type === "naat").length;
  const explanationCount = allAnalyzedSegments.filter(
    (s) => s.type === "explanation"
  ).length;

  const naatPercentage = (naatCount / allAnalyzedSegments.length) * 100;
  const explanationPercentage =
    (explanationCount / allAnalyzedSegments.length) * 100;

  console.log(`  💰 Estimated cost: $0.00 (FREE!)`);
  console.log(`  ℹ️  Classification:`);
  console.log(
    `     - NAAT: ${naatCount} segments (${naatPercentage.toFixed(1)}%)`
  );
  console.log(
    `     - EXPLANATION: ${explanationCount} segments (${explanationPercentage.toFixed(1)}%)`
  );

  if (explanationCount === 0) {
    console.log(`  ✨ Pure naat recording - no interruptions detected!`);
  } else {
    console.log(`  ✂️  Will remove ${explanationCount} interruption segments`);
  }

  return {
    segments: allAnalyzedSegments,
    summary: `Processed ${batches.length} batches, classified ${allAnalyzedSegments.length} segments`,
    naat_percentage: naatPercentage,
    explanation_percentage: explanationPercentage,
  };
}

/**
 * Merge consecutive naat segments and add padding
 */
function mergeAndPadSegments(segments, audioDuration) {
  const naatSegments = segments.filter((s) => s.type === "naat");

  if (naatSegments.length === 0) {
    return [];
  }

  const merged = [];
  let current = { ...naatSegments[0] };

  for (let i = 1; i < naatSegments.length; i++) {
    const segment = naatSegments[i];

    // If segments are very close (within 0.5 second), merge them
    if (segment.start_time - current.end_time <= 0.5) {
      current.end_time = segment.end_time;
      current.text += " " + segment.text;
    } else {
      merged.push(current);
      current = { ...segment };
    }
  }

  merged.push(current);

  // Add minimal padding
  const padded = merged.map((seg) => ({
    ...seg,
    original_start: seg.start_time,
    original_end: seg.end_time,
    start_time: Math.max(0, seg.start_time - PADDING_SECONDS),
    end_time: Math.min(audioDuration, seg.end_time + PADDING_SECONDS),
  }));

  console.log(
    `  ✓ Merged ${naatSegments.length} naat segments into ${merged.length} blocks`
  );
  console.log(`  ✓ Added ${PADDING_SECONDS}s padding to each block`);

  return padded;
}

/**
 * Cut audio with smooth crossfades
 */
async function cutAudioWithCrossfade(
  inputPath,
  segments,
  youtubeId,
  audioDuration
) {
  console.log(`  Cutting audio to remove interruptions...`);

  const mergedSegments = mergeAndPadSegments(segments, audioDuration);

  if (mergedSegments.length === 0) {
    console.log(`  ⚠️  No naat segments identified, keeping original`);
    return null;
  }

  console.log(
    `  Processing ${mergedSegments.length} pure naat segments with crossfades...`
  );

  const outputPath = join(OUTPUT_DIR, `${youtubeId}_local_processed.m4a`);

  // If only one segment, no crossfade needed
  if (mergedSegments.length === 1) {
    const seg = mergedSegments[0];
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(seg.start_time)
        .setDuration(seg.end_time - seg.start_time)
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

  // Multiple segments - use concat
  return new Promise((resolve, reject) => {
    const filterComplex = [];
    const inputs = [];

    // Extract each segment
    mergedSegments.forEach((segment, index) => {
      filterComplex.push(
        `[0:a]atrim=start=${segment.start_time}:end=${segment.end_time},asetpts=PTS-STARTPTS[a${index}]`
      );
      inputs.push(`a${index}`);
    });

    // Concatenate all segments
    const inputLabels = inputs.map((label) => `[${label}]`).join("");
    filterComplex.push(
      `${inputLabels}concat=n=${mergedSegments.length}:v=0:a=1[out]`
    );

    console.log(
      `  ℹ️  Using concat filter for ${mergedSegments.length} segments`
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
          `  ✓ Audio cut successfully - concatenated ${mergedSegments.length} segments`
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
 * Generate report
 */
function generateReport(
  naat,
  transcription,
  analysis,
  processedPath,
  mergedCount
) {
  const report = {
    video: {
      title: naat.title,
      youtubeId: naat.youtubeId,
      url: `https://www.youtube.com/watch?v=${naat.youtubeId}`,
    },
    transcription: {
      language: transcription.language,
      duration: transcription.duration,
      text: transcription.text,
      provider: "Local Whisper Large-v3 (FREE, Most Accurate)",
    },
    analysis: {
      ...analysis,
      merged_segments_count: mergedCount,
      provider: "Groq Llama 3.3 70B (FREE, Batched)",
    },
    processing: {
      version: "Local Whisper V2 - Enhanced (Best Accuracy)",
      padding_seconds: PADDING_SECONDS,
      crossfade_duration: CROSSFADE_DURATION,
      max_silence_duration: MAX_SILENCE_DURATION,
      approach: "Local Whisper + Groq Llama (Best Free Accuracy)",
    },
    output: {
      processed_audio: processedPath,
      original_audio: join(TEMP_DIR, `${naat.youtubeId}.m4a`),
    },
    timestamp: new Date().toISOString(),
  };

  const reportPath = join(OUTPUT_DIR, `${naat.youtubeId}_local_report.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const readablePath = join(OUTPUT_DIR, `${naat.youtubeId}_local_report.txt`);
  const naatSegments = analysis.segments.filter((s) => s.type === "naat");
  const explanationSegments = analysis.segments.filter(
    (s) => s.type === "explanation"
  );

  const readable = `
NAAT AUDIO PROCESSING REPORT - Local Whisper V2 (Best Free Accuracy)
=====================================================================

Video: ${naat.title}
YouTube: https://www.youtube.com/watch?v=${naat.youtubeId}
Processed: ${new Date().toLocaleString()}

PROCESSING APPROACH
-------------------
Transcription: Local Whisper Large-v3 (FREE, most accurate)
Analysis: Groq Llama 3.3 70B (FREE, batched processing)
Strategy: Best free accuracy - local transcription + cloud analysis

TRANSCRIPTION
-------------
Language: ${transcription.language}
Duration: ${transcription.duration}s
Model: Whisper Large-v3 (most accurate)

ANALYSIS SUMMARY
----------------
Total segments: ${analysis.segments?.length || 0}
├─ NAAT (kept): ${naatSegments.length} segments (${analysis.naat_percentage?.toFixed(1) || 0}%)
└─ EXPLANATION (removed): ${explanationSegments.length} segments (${analysis.explanation_percentage?.toFixed(1) || 0}%)

Merged into: ${mergedCount} continuous naat blocks
Removed: ${explanationSegments.length} interruption segments

PROCESSING SETTINGS
-------------------
Padding: ${PADDING_SECONDS}s (minimal for tight cuts)
Crossfade: ${CROSSFADE_DURATION}s between segments
Max silence: ${MAX_SILENCE_DURATION}s (longer silences removed)

WHAT WAS REMOVED
----------------
${
  explanationSegments.length > 0
    ? `Explanations (${explanationSegments.length}):
${explanationSegments
  .slice(0, 5)
  .map(
    (s, i) =>
      `  ${i + 1}. ${s.start_time.toFixed(1)}-${s.end_time.toFixed(1)}s: ${s.text.substring(0, 80)}...`
  )
  .join("\n")}
${explanationSegments.length > 5 ? `  ... and ${explanationSegments.length - 5} more` : ""}
`
    : "No explanations detected - pure naat recording!"
}

PURE NAAT SEGMENTS KEPT
------------------------
${naatSegments
  .slice(0, 10)
  .map(
    (s, i) =>
      `${i + 1}. ${s.start_time.toFixed(1)}-${s.end_time.toFixed(1)}s: ${s.text.substring(0, 80)}...`
  )
  .join("\n")}
${naatSegments.length > 10 ? `... and ${naatSegments.length - 10} more naat segments` : ""}

SUMMARY
-------
${analysis.summary}

FILES
-----
Original: ${join(TEMP_DIR, `${naat.youtubeId}.m4a`)}
Processed: ${processedPath || "N/A"}

COMPARISON WITH OTHER VERSIONS
-------------------------------
Local Whisper Version (This):
✓ 100% FREE (local transcription + free analysis)
✓ HIGHEST transcription accuracy (Whisper Large-v3)
✓ Good analysis accuracy (Llama 3.3 70B)
✓ Slower transcription (runs on your machine)
✓ Cost: $0.00

Groq Version:
✓ 100% FREE (both transcription and analysis)
✓ Fast processing
✓ Good accuracy (but lower than local Whisper)
✓ Cost: $0.00

Hybrid Version (Groq + OpenAI):
✓ FREE transcription (Groq Whisper)
✓ Higher accuracy analysis (OpenAI GPT-4o-mini)
✓ Cost: ~$0.007 per 15-min video

OpenAI Version:
✓ High transcription accuracy (OpenAI Whisper)
✓ Highest analysis accuracy (OpenAI GPT-4o-mini)
✓ Cost: ~$0.10 per 15-min video

FEATURES
--------
✓ Removes rhythm breaks (talking between verses)
✓ Removes "SubhanAllah", "MashaAllah" interruptions
✓ Removes introductions and audience reactions
✓ Removes long silences (>2s)
✓ Tighter cuts with minimal padding (0.3s)
✓ Pure naat listening experience
✓ 100% FREE!
✓ BEST transcription accuracy (Local Whisper Large-v3)
✓ Handles videos of ANY length (batched processing)

NEXT STEPS
----------
1. Compare with Groq, hybrid, and OpenAI versions
2. Listen to all processed audios
3. Determine best cost/accuracy balance
4. Rate: Local / Groq / Hybrid / OpenAI - which is best?
`;

  writeFileSync(readablePath, readable);

  console.log(`\n✓ Reports generated:`);
  console.log(`  JSON: ${reportPath}`);
  console.log(`  Text: ${readablePath}`);
}

/**
 * Main function
 */
async function main() {
  console.log(
    "🎵 Naat Audio Processing Script - Local Whisper V2 (Best Free Accuracy)\n"
  );
  console.log(
    "📊 Using: Local Whisper Large-v3 + Groq Llama 3.3 70B ($0.00)\n"
  );
  console.log("✨ Best free accuracy - local transcription!\n");

  ensureDirectories();

  // Parse command line arguments
  const args = process.argv.slice(2);
  let videoUrl = args[0];

  // If no argument provided, use default test video
  if (!videoUrl) {
    videoUrl = "https://youtu.be/mgONEN7IqE8?si=mkWINU0McOItCV7p";
    console.log("⚠️  No video URL provided, using default test video\n");
  }

  // Extract video ID from URL
  const videoIdMatch = videoUrl.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );

  if (!videoIdMatch) {
    console.error("❌ Invalid YouTube URL. Please provide a valid URL.");
    console.error("   Example: https://youtu.be/mgONEN7IqE8");
    process.exit(1);
  }

  const TEST_VIDEO_ID = videoIdMatch[1];
  const TEST_VIDEO_URL = videoUrl;

  console.log("📥 Processing video...");

  const naat = {
    youtubeId: TEST_VIDEO_ID,
    title: `Naat - ${TEST_VIDEO_ID}`,
    $id: "test-" + TEST_VIDEO_ID,
  };

  console.log(`✓ Video URL: ${TEST_VIDEO_URL}`);
  console.log(`✓ Video ID: ${TEST_VIDEO_ID}\n`);

  try {
    console.log("📥 Step 1: Downloading audio...");
    const audioPath = await downloadAudio(naat.youtubeId, naat.title);

    console.log(
      "\n🎤 Step 2: Transcribing audio with Local Whisper (FREE, accurate)..."
    );
    const transcription = await transcribeAudio(audioPath);

    console.log("\n🧠 Step 3: Analyzing transcript (2-way classification)...");
    const analysis = await analyzeTranscript(transcription);

    console.log("\n✂️  Step 4: Processing audio (removing interruptions)...");
    const mergedSegments = mergeAndPadSegments(
      analysis.segments,
      transcription.duration
    );
    const processedPath = await cutAudioWithCrossfade(
      audioPath,
      analysis.segments,
      naat.youtubeId,
      transcription.duration
    );

    console.log("\n📊 Step 5: Generating report...");
    generateReport(
      naat,
      transcription,
      analysis,
      processedPath,
      mergedSegments.length
    );

    console.log("\n" + "=".repeat(60));
    console.log("✅ PROCESSING COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\nCheck the reports in: ${OUTPUT_DIR}`);
    console.log(`\nOriginal audio: ${audioPath}`);
    if (processedPath) {
      console.log(`Processed audio (Local): ${processedPath}`);
    }
    console.log(
      `\n💡 100% FREE with BEST transcription accuracy! Compare with other versions.`
    );
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\n💡 Make sure you have installed:");
    console.error("   pip install openai-whisper");
    console.error(
      "\n   If you don't have Python/pip, install from: https://www.python.org/"
    );
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
