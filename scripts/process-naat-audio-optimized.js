/**
 * Naat Audio Processing Script - Optimized Version
 *
 * Improvements:
 * - Merges consecutive naat segments to reduce FFmpeg complexity
 * - Handles large number of segments efficiently
 * - Better error handling for edge cases
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

ffmpeg.setFfmpegPath(ffmpegPath);
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEMP_DIR = join(process.cwd(), "temp-audio");
const OUTPUT_DIR = join(process.cwd(), "temp-audio", "processed");

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function ensureDirectories() {
  [TEMP_DIR, OUTPUT_DIR].forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
}

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

async function transcribeAudio(audioPath) {
  console.log(`  Transcribing audio with OpenAI Whisper...`);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: "whisper-1",
      language: "ur",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    console.log(`  ✓ Transcription completed`);
    return transcription;
  } catch (error) {
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

async function analyzeTranscript(transcription) {
  console.log(`  Analyzing transcript with GPT-4...`);

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
    const completion = await openai.chat.completions.create({
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
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

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
 * Merge consecutive naat segments to reduce FFmpeg complexity
 */
function mergeConsecutiveSegments(segments) {
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

  console.log(
    `  ✓ Merged ${naatSegments.length} segments into ${merged.length} continuous blocks`
  );
  return merged;
}

async function cutAudio(inputPath, segments, youtubeId) {
  console.log(`  Cutting audio to remove explanations...`);

  // Merge consecutive naat segments
  const mergedSegments = mergeConsecutiveSegments(segments);

  if (mergedSegments.length === 0) {
    console.log(`  ⚠️  No naat segments identified, keeping original`);
    return null;
  }

  console.log(`  Processing ${mergedSegments.length} merged naat segments...`);

  const outputPath = join(OUTPUT_DIR, `${youtubeId}_processed.m4a`);
  const filterComplex = [];
  const inputs = [];

  // Build ffmpeg filter for each merged segment
  mergedSegments.forEach((segment, index) => {
    filterComplex.push(
      `[0:a]atrim=start=${segment.start_time}:end=${segment.end_time},asetpts=PTS-STARTPTS[a${index}]`
    );
    inputs.push(`[a${index}]`);
  });

  // Concatenate all segments
  filterComplex.push(
    `${inputs.join("")}concat=n=${mergedSegments.length}:v=0:a=1[out]`
  );

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .complexFilter(filterComplex)
      .outputOptions(["-map", "[out]"])
      .output(outputPath)
      .on("end", () => {
        console.log(`  ✓ Audio cut successfully`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .run();
  });
}

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
NAAT AUDIO PROCESSING REPORT (OpenAI - Optimized)
==================================================

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

SEGMENTS IDENTIFIED
-------------------
${analysis.segments
  ?.map(
    (s, i) => `
${i + 1}. ${s.type.toUpperCase()} (${s.start_time}s - ${s.end_time}s)
   Confidence: ${s.confidence}
   Text: ${s.text.substring(0, 100)}...
   Reasoning: ${s.reasoning}
`
  )
  .join("\n")}

SUMMARY
-------
${analysis.summary}

FILES
-----
Original: ${join(TEMP_DIR, `${naat.youtubeId}.m4a`)}
Processed: ${processedPath || "N/A"}

NEXT STEPS
----------
1. Listen to both original and processed audio
2. Verify if explanations were correctly identified
3. Check if naat segments are complete
4. Rate accuracy: High / Medium / Low
`;

  writeFileSync(readablePath, readable);

  console.log(`\n✓ Reports generated:`);
  console.log(`  JSON: ${reportPath}`);
  console.log(`  Text: ${readablePath}`);
}

async function main() {
  console.log("🎵 Naat Audio Processing Script (OpenAI - Optimized)\n");

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

    console.log("\n🎤 Step 2: Transcribing audio...");
    const transcription = await transcribeAudio(audioPath);

    console.log("\n🧠 Step 3: Analyzing transcript...");
    const analysis = await analyzeTranscript(transcription);

    console.log("\n✂️  Step 4: Processing audio...");
    const naatSegments = analysis.segments.filter((s) => s.type === "naat");
    const mergedSegments = mergeConsecutiveSegments(analysis.segments);
    const processedPath = await cutAudio(
      audioPath,
      analysis.segments,
      naat.youtubeId
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
      console.log(`Processed audio: ${processedPath}`);
    }
    console.log(
      `\n💡 Listen to both files and review the report to assess accuracy.`
    );
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
