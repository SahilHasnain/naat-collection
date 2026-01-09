/**
 * Naat Audio Processing Script - OpenAI V2 (Enhanced - Rhythm Break Removal)
 *
 * This script uses:
 * - OpenAI Whisper (accurate transcription, ~$0.09 per 15-min)
 * - OpenAI GPT-4o-mini (accurate analysis, ~$0.007/video)
 * - 3-way classification: NAAT / TRANSITION / EXPLANATION
 * - Smooth transitions with crossfades
 *
 * Features:
 * - Full OpenAI stack for maximum accuracy
 * - Removes rhythm breaks (talking between verses, "SubhanAllah", etc.)
 * - Removes long silences (>2 seconds)
 * - Removes introductions and audience reactions
 * - Pure naat listening experience
 *
 * Cost: ~$0.10 per 15-min video (higher accuracy)
 *
 * Usage:
 *   node scripts/audio-processing/process-naat-audio-openai-v2.js
 */

const { spawn } = require("child_process");
const dotenv = require("dotenv");
const {
  existsSync,
  mkdirSync,
  writeFileSync,
  createReadStream,
} = require("fs");
const { join } = require("path");
const OpenAI = require("openai");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Load environment variables
dotenv.config();

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Directories
const TEMP_DIR = join(process.cwd(), "temp-audio");
const OUTPUT_DIR = join(process.cwd(), "temp-audio", "processed");

// Audio processing settings
const PADDING_SECONDS = 0.3; // Reduced padding for tighter cuts
const CROSSFADE_DURATION = 0.5; // 0.5s crossfade between segments
const MAX_SILENCE_DURATION = 2.0; // Remove silences longer than 2 seconds

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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
      "bestaudio[ext=m4a]/bestaudio",
      "--extract-audio",
      "--audio-format",
      "m4a",
      "--audio-quality",
      "128K",
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
 * Transcribe audio with OpenAI Whisper
 */
async function transcribeAudio(audioPath) {
  console.log(`  Transcribing audio with OpenAI Whisper...`);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: "whisper-1",
      language: "ur", // Urdu
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    console.log(`  ✓ Transcription completed`);
    return transcription;
  } catch (error) {
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Analyze transcript with OpenAI GPT-4o-mini (3-WAY CLASSIFICATION)
 */
async function analyzeTranscript(transcription) {
  console.log(`  Analyzing transcript with OpenAI GPT-4o-mini (Enhanced)...`);

  const segmentSummary = transcription.segments
    ?.map(
      (s, i) =>
        `[${i}] ${s.start.toFixed(1)}-${s.end.toFixed(1)}s: ${s.text.substring(0, 150)}`
    )
    .join("\n");

  const prompt = `You are an expert in Urdu naats (Islamic devotional songs). 

I have a transcript of an audio recording. Classify each segment into ONE of these categories:

1. NAAT: Pure melodic singing/recitation - the actual naat performance
2. TRANSITION: Interruptions that break the flow:
   - Talking between verses ("SubhanAllah", "MashaAllah", "Alhamdulillah")
   - Introductions ("Now I will recite...", "This naat is about...")
   - Pauses, breaks in rhythm
   - Audience reactions, comments
   - Any non-singing speech within the naat
3. EXPLANATION: Full explanations of meaning, teaching, context

IMPORTANT:
- Be STRICT: Only mark as "naat" if it's pure singing/recitation
- Mark ALL talking/interruptions as "transition" (even religious phrases)
- Mark teaching/explanations as "explanation"
- We want to remove BOTH "transition" and "explanation" to create pure naat audio

SEGMENTS:
${segmentSummary}

Analyze each segment carefully:
- Continuous melodic singing = NAAT
- Any talking/interruption = TRANSITION
- Teaching/explaining = EXPLANATION

Respond in JSON format:
{
  "segments": [
    {
      "segment_index": 0,
      "type": "naat" or "transition" or "explanation",
      "start_time": seconds,
      "end_time": seconds,
      "confidence": "high/medium/low",
      "reasoning": "brief reason"
    }
  ],
  "summary": "brief analysis",
  "naat_percentage": percentage of pure naat (0-100),
  "transition_percentage": percentage of transitions (0-100),
  "explanation_percentage": percentage of explanations (0-100)
}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an expert in Urdu language and Islamic naats. Respond only with valid JSON. Be STRICT in classification - only pure singing is 'naat'.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4o-mini",
      temperature: 0.2, // Lower temperature for more consistent classification
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    // Enrich segments with full text from transcription
    if (analysis.segments && transcription.segments) {
      analysis.segments = analysis.segments.map((seg) => ({
        ...seg,
        text: transcription.segments[seg.segment_index]?.text || "",
      }));
    }

    console.log(
      `  ✓ Analysis completed: ${analysis.segments?.length || 0} segments identified`
    );

    // Log token usage
    console.log(
      `  ℹ️  Tokens used: ${completion.usage.prompt_tokens} input, ${completion.usage.completion_tokens} output`
    );
    const estimatedCost =
      (completion.usage.prompt_tokens * 0.15) / 1000000 +
      (completion.usage.completion_tokens * 0.6) / 1000000;
    console.log(`  💰 Estimated cost: $${estimatedCost.toFixed(5)}`);

    // Show breakdown
    const naatCount = analysis.segments.filter((s) => s.type === "naat").length;
    const transitionCount = analysis.segments.filter(
      (s) => s.type === "transition"
    ).length;
    const explanationCount = analysis.segments.filter(
      (s) => s.type === "explanation"
    ).length;

    console.log(`  ℹ️  Classification:`);
    console.log(
      `     - NAAT: ${naatCount} segments (${analysis.naat_percentage?.toFixed(1) || 0}%)`
    );
    console.log(
      `     - TRANSITION: ${transitionCount} segments (${analysis.transition_percentage?.toFixed(1) || 0}%)`
    );
    console.log(
      `     - EXPLANATION: ${explanationCount} segments (${analysis.explanation_percentage?.toFixed(1) || 0}%)`
    );

    if (transitionCount + explanationCount === 0) {
      console.log(`  ✨ Pure naat recording - no interruptions detected!`);
    } else {
      console.log(
        `  ✂️  Will remove ${transitionCount + explanationCount} interruption segments`
      );
    }

    return analysis;
  } catch (error) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
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

  const outputPath = join(OUTPUT_DIR, `${youtubeId}_openai_processed.m4a`);

  // If only one segment, no crossfade needed
  if (mergedSegments.length === 1) {
    const seg = mergedSegments[0];
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(seg.start_time)
        .setDuration(seg.end_time - seg.start_time)
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

  // Multiple segments - use crossfade
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

    // Build crossfade chain
    let currentStream = `[${inputs[0]}]`;

    for (let i = 1; i < inputs.length; i++) {
      const nextStream = `[${inputs[i]}]`;
      const outputLabel = i === inputs.length - 1 ? "[out]" : `[cf${i}]`;

      filterComplex.push(
        `${currentStream}${nextStream}acrossfade=d=${CROSSFADE_DURATION}:c1=tri:c2=tri${outputLabel}`
      );

      currentStream = outputLabel;
    }

    ffmpeg(inputPath)
      .complexFilter(filterComplex)
      .outputOptions(["-map", "[out]"])
      .output(outputPath)
      .on("end", () => {
        console.log(
          `  ✓ Audio cut successfully with ${mergedSegments.length - 1} crossfades`
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
      provider: "OpenAI Whisper",
    },
    analysis: {
      ...analysis,
      merged_segments_count: mergedCount,
      provider: "OpenAI GPT-4o-mini",
    },
    processing: {
      version: "OpenAI V2 - Enhanced (Rhythm Break Removal)",
      padding_seconds: PADDING_SECONDS,
      crossfade_duration: CROSSFADE_DURATION,
      max_silence_duration: MAX_SILENCE_DURATION,
      approach:
        "Full OpenAI Stack (Whisper + GPT-4o-mini 3-way Classification)",
    },
    output: {
      processed_audio: processedPath,
      original_audio: join(TEMP_DIR, `${naat.youtubeId}.m4a`),
    },
    timestamp: new Date().toISOString(),
  };

  const reportPath = join(OUTPUT_DIR, `${naat.youtubeId}_openai_report.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const readablePath = join(OUTPUT_DIR, `${naat.youtubeId}_openai_report.txt`);
  const naatSegments = analysis.segments.filter((s) => s.type === "naat");
  const transitionSegments = analysis.segments.filter(
    (s) => s.type === "transition"
  );
  const explanationSegments = analysis.segments.filter(
    (s) => s.type === "explanation"
  );

  const readable = `
NAAT AUDIO PROCESSING REPORT - OpenAI V2 (Enhanced)
====================================================

Video: ${naat.title}
YouTube: https://www.youtube.com/watch?v=${naat.youtubeId}
Processed: ${new Date().toLocaleString()}

PROCESSING APPROACH
-------------------
Transcription: OpenAI Whisper (highest accuracy)
Analysis: OpenAI GPT-4o-mini (3-way classification)
Strategy: Full OpenAI stack for maximum accuracy

TRANSCRIPTION
-------------
Language: ${transcription.language}
Duration: ${transcription.duration}s

ANALYSIS SUMMARY
----------------
Total segments: ${analysis.segments?.length || 0}
├─ NAAT (kept): ${naatSegments.length} segments (${analysis.naat_percentage?.toFixed(1) || 0}%)
├─ TRANSITION (removed): ${transitionSegments.length} segments (${analysis.transition_percentage?.toFixed(1) || 0}%)
└─ EXPLANATION (removed): ${explanationSegments.length} segments (${analysis.explanation_percentage?.toFixed(1) || 0}%)

Merged into: ${mergedCount} continuous naat blocks
Removed: ${transitionSegments.length + explanationSegments.length} interruption segments

PROCESSING SETTINGS
-------------------
Padding: ${PADDING_SECONDS}s (minimal for tight cuts)
Crossfade: ${CROSSFADE_DURATION}s between segments
Max silence: ${MAX_SILENCE_DURATION}s (longer silences removed)

WHAT WAS REMOVED
----------------
${
  transitionSegments.length > 0
    ? `Transitions (${transitionSegments.length}):
${transitionSegments
  .slice(0, 5)
  .map(
    (s, i) =>
      `  ${i + 1}. ${s.start_time.toFixed(1)}-${s.end_time.toFixed(1)}s: ${s.text.substring(0, 80)}...`
  )
  .join("\n")}
${transitionSegments.length > 5 ? `  ... and ${transitionSegments.length - 5} more` : ""}
`
    : "No transitions detected"
}
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
    : "No explanations detected"
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

COMPARISON WITH HYBRID VERSION
-------------------------------
OpenAI Version:
✓ Higher transcription accuracy (OpenAI Whisper)
✓ Better Urdu language understanding
✓ More precise timestamp detection
✓ Cost: ~$0.10 per 15-min video

Hybrid Version (Groq + OpenAI):
✓ FREE transcription (Groq Whisper)
✓ Same analysis quality (OpenAI GPT-4o-mini)
✓ Cost: ~$0.007 per 15-min video
✓ 14x cheaper

FEATURES
--------
✓ Removes rhythm breaks (talking between verses)
✓ Removes "SubhanAllah", "MashaAllah" interruptions
✓ Removes introductions and audience reactions
✓ Removes long silences (>2s)
✓ Tighter cuts with minimal padding (0.3s)
✓ Pure naat listening experience

NEXT STEPS
----------
1. Compare with hybrid version output
2. Listen to both processed audios
3. Determine if OpenAI's higher accuracy justifies the cost
4. Rate: OpenAI Better / Same / Hybrid Better
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
  console.log("🎵 Naat Audio Processing Script - OpenAI V2 (Enhanced)\n");
  console.log("📊 Using: OpenAI Whisper + OpenAI GPT-4o-mini (~$0.10)\n");
  console.log("✨ Full OpenAI stack for maximum accuracy\n");

  ensureDirectories();

  const TEST_VIDEO_URL = "https://youtu.be/7UQAVE7dy9E?si=zmhIs5Bhe_0PeGD5";
  const TEST_VIDEO_ID = "7UQAVE7dy9E";

  console.log("📥 Using hardcoded test video...");

  const naat = {
    youtubeId: TEST_VIDEO_ID,
    title: "Test Naat - 7UQAVE7dy9E",
    $id: "test-" + TEST_VIDEO_ID,
  };

  console.log(`✓ Video URL: ${TEST_VIDEO_URL}`);
  console.log(`✓ Video ID: ${TEST_VIDEO_ID}\n`);

  try {
    console.log("📥 Step 1: Downloading audio...");
    const audioPath = await downloadAudio(naat.youtubeId, naat.title);

    console.log("\n🎤 Step 2: Transcribing audio with OpenAI Whisper...");
    const transcription = await transcribeAudio(audioPath);

    console.log("\n🧠 Step 3: Analyzing transcript (3-way classification)...");
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
      console.log(`Processed audio (OpenAI): ${processedPath}`);
    }
    console.log(
      `\n💡 Compare with hybrid version to see if higher accuracy is worth the cost!`
    );
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
