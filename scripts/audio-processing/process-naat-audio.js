/**
 * Naat Audio Processing Script - Smooth Transitions (Groq)
 *
 * This script:
 * 1. Downloads audio using yt-dlp
 * 2. Transcribes with Groq Whisper (Urdu support)
 * 3. Analyzes with Llama 3.3 to identify naat vs explanation segments
 * 4. Merges consecutive segments and adds padding
 * 5. Cuts audio with smooth crossfades
 * 6. Generates detailed report
 *
 * Features:
 * - Smooth crossfades between segments (no rhythm breaks)
 * - Padding to preserve complete phrases
 * - Merged consecutive segments for natural flow
 *
 * Usage:
 *   node scripts/process-naat-audio.js
 */

const { spawn } = require("child_process");
const dotenv = require("dotenv");
const { existsSync, mkdirSync, writeFileSync } = require("fs");
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
const PADDING_SECONDS = 0.5; // Add 0.5s before and after each segment
const CROSSFADE_DURATION = 0.5; // 0.5s crossfade between segments

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

  // Skip if already downloaded
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
 * Transcribe audio with Groq Whisper
 */
async function transcribeAudio(audioPath) {
  console.log(`  Transcribing audio with Groq Whisper...`);

  try {
    const fs = require("fs");
    const fileStream = fs.createReadStream(audioPath);

    const transcription = await groq.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-large-v3-turbo",
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
 * Analyze transcript with Llama 3.3 to identify segments
 */
async function analyzeTranscript(transcription) {
  console.log(`  Analyzing transcript with Llama 3.3...`);

  // Limit segments to reduce token usage
  const segmentSummary = transcription.segments
    ?.map(
      (s, i) =>
        `[${i}] ${s.start.toFixed(1)}-${s.end.toFixed(1)}s: ${s.text.substring(0, 150)}`
    )
    .join("\n");

  const prompt = `You are an expert in Urdu naats (Islamic devotional songs). 

I have a transcript of an audio recording that contains both:
1. NAAT: Melodic singing/recitation with poetic, rhythmic structure
2. EXPLANATION: Conversational speech where the speaker explains the naat, its meaning, or provides context

Your task: Identify which segments are NAAT and which are EXPLANATION.

SEGMENTS:
${segmentSummary}

Analyze each segment. Look for:
- Poetic/melodic language = NAAT
- Conversational/explanatory language = EXPLANATION

Respond in JSON format:
{
  "segments": [
    {
      "segment_index": 0,
      "type": "naat" or "explanation",
      "start_time": seconds,
      "end_time": seconds,
      "confidence": "high/medium/low",
      "reasoning": "brief reason"
    }
  ],
  "summary": "brief analysis"
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an expert in Urdu language and Islamic naats. Respond only with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
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

    // If segments are consecutive (within 1 second), merge them
    if (segment.start_time - current.end_time <= 1) {
      current.end_time = segment.end_time;
      current.text += " " + segment.text;
    } else {
      merged.push(current);
      current = { ...segment };
    }
  }

  merged.push(current);

  // Add padding to each merged segment
  const padded = merged.map((seg) => ({
    ...seg,
    original_start: seg.start_time,
    original_end: seg.end_time,
    start_time: Math.max(0, seg.start_time - PADDING_SECONDS),
    end_time: Math.min(audioDuration, seg.end_time + PADDING_SECONDS),
  }));

  console.log(
    `  ✓ Merged ${naatSegments.length} segments into ${merged.length} blocks`
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
  console.log(`  Cutting audio with smooth transitions...`);

  const mergedSegments = mergeAndPadSegments(segments, audioDuration);

  if (mergedSegments.length === 0) {
    console.log(`  ⚠️  No naat segments identified, keeping original`);
    return null;
  }

  console.log(
    `  Processing ${mergedSegments.length} segments with crossfades...`
  );

  const outputPath = join(OUTPUT_DIR, `${youtubeId}_processed.m4a`);

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
    },
    analysis: {
      ...analysis,
      merged_segments_count: mergedCount,
    },
    processing: {
      padding_seconds: PADDING_SECONDS,
      crossfade_duration: CROSSFADE_DURATION,
    },
    output: {
      processed_audio: processedPath,
      original_audio: join(TEMP_DIR, `${naat.youtubeId}.m4a`),
    },
    timestamp: new Date().toISOString(),
  };

  const reportPath = join(OUTPUT_DIR, `${naat.youtubeId}_report.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const readablePath = join(OUTPUT_DIR, `${naat.youtubeId}_report.txt`);
  const naatSegments = analysis.segments.filter((s) => s.type === "naat");
  const readable = `
NAAT AUDIO PROCESSING REPORT (Groq - Smooth Transitions)
==========================================================

Video: ${naat.title}
YouTube: https://www.youtube.com/watch?v=${naat.youtubeId}
Processed: ${new Date().toLocaleString()}

TRANSCRIPTION
-------------
Language: ${transcription.language}
Duration: ${transcription.duration}s

ANALYSIS SUMMARY
----------------
Total segments: ${analysis.segments?.length || 0}
Naat segments: ${naatSegments.length}
Explanation segments: ${analysis.segments.filter((s) => s.type === "explanation").length}
Merged into: ${mergedCount} continuous blocks

PROCESSING SETTINGS
-------------------
Padding: ${PADDING_SECONDS}s before/after each segment
Crossfade: ${CROSSFADE_DURATION}s between segments
Total crossfades: ${mergedCount - 1}

SEGMENTS IDENTIFIED
-------------------
${analysis.segments
  ?.slice(0, 20)
  .map(
    (s, i) => `
${i + 1}. ${s.type.toUpperCase()} (${s.start_time}s - ${s.end_time}s)
   Confidence: ${s.confidence}
   Text: ${s.text.substring(0, 100)}...
`
  )
  .join("\n")}
${analysis.segments?.length > 20 ? `\n... and ${analysis.segments.length - 20} more segments` : ""}

SUMMARY
-------
${analysis.summary}

FILES
-----
Original: ${join(TEMP_DIR, `${naat.youtubeId}.m4a`)}
Processed: ${processedPath || "N/A"}

IMPROVEMENTS
------------
✓ Smooth crossfades prevent abrupt cuts
✓ Padding preserves complete musical phrases
✓ Merged consecutive segments maintain flow
✓ Natural rhythm preserved throughout

NEXT STEPS
----------
1. Listen to processed audio for smooth transitions
2. Verify rhythm is maintained throughout
3. Check if any naat sections were missed
4. Rate accuracy: High / Medium / Low
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
  console.log("🎵 Naat Audio Processing Script (Groq - Smooth Transitions)\n");

  // Ensure directories
  ensureDirectories();

  // HARDCODED TEST VIDEO
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
    // Step 1: Download
    console.log("📥 Step 1: Downloading audio...");
    const audioPath = await downloadAudio(naat.youtubeId, naat.title);

    // Step 2: Transcribe
    console.log("\n🎤 Step 2: Transcribing audio...");
    const transcription = await transcribeAudio(audioPath);

    // Step 3: Analyze
    console.log("\n🧠 Step 3: Analyzing transcript...");
    const analysis = await analyzeTranscript(transcription);

    // Step 4: Cut audio with smooth transitions
    console.log("\n✂️  Step 4: Processing audio with smooth transitions...");
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

    // Step 5: Generate report
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
      console.log(`Processed audio: ${processedPath}`);
    }
    console.log(
      `\n💡 Listen to the processed audio - it should have smooth transitions!`
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
