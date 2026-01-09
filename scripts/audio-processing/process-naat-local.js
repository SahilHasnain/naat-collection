/**
 * Naat Audio Processing with Local Whisper
 * Uses faster-whisper for transcription (no file size limits)
 */

const { spawn } = require("child_process");
const dotenv = require("dotenv");
const { existsSync, mkdirSync, writeFileSync } = require("fs");
const { join } = require("path");
const Groq = require("groq-sdk").default;
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

ffmpeg.setFfmpegPath(ffmpegPath);
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TEMP_DIR = join(process.cwd(), "temp-audio");
const OUTPUT_DIR = join(process.cwd(), "temp-audio", "processed");

const groq = new Groq({ apiKey: GROQ_API_KEY });

function ensureDirectories() {
  [TEMP_DIR, OUTPUT_DIR].forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}

async function downloadAudio(youtubeId, title) {
  const outputPath = join(TEMP_DIR, `${youtubeId}.m4a`);
  if (existsSync(outputPath)) {
    console.log(`  ✓ Audio already exists`);
    return outputPath;
  }
  console.log(`  Downloading: ${title}`);
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
    ytdlp.stdout.on("data", () => process.stdout.write("."));
    ytdlp.on("close", (code) => {
      console.log("");
      if (code === 0 && existsSync(outputPath)) {
        console.log(`  ✓ Downloaded successfully`);
        resolve(outputPath);
      } else {
        reject(new Error(`yt-dlp failed with code ${code}`));
      }
    });
  });
}

async function transcribeAudioLocal(audioPath) {
  console.log(
    `  Transcribing with local Whisper (this may take a few minutes)...`
  );

  return new Promise((resolve, reject) => {
    const python = spawn("python", [
      join(__dirname, "transcribe-local.py"),
      audioPath,
      "ur",
    ]);

    let output = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      const msg = data.toString();
      errorOutput += msg;
      // Show progress messages
      if (msg.includes("Loading") || msg.includes("Transcribing")) {
        process.stdout.write(`  ${msg.trim()}\n`);
      }
    });

    python.on("close", (code) => {
      if (code === 0) {
        try {
          const transcription = JSON.parse(output);
          console.log(
            `  ✓ Transcription completed (${transcription.segments?.length || 0} segments)`
          );
          resolve(transcription);
        } catch (error) {
          reject(new Error(`Failed to parse transcription: ${error.message}`));
        }
      } else {
        reject(new Error(`Transcription failed: ${errorOutput}`));
      }
    });

    python.on("error", (err) => {
      reject(new Error(`Failed to run Python: ${err.message}`));
    });
  });
}

async function analyzeTranscript(transcription) {
  console.log(`  Analyzing transcript with Llama 3.3...`);

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
        { role: "user", content: prompt },
      ],
      model: "llama-3.3-70b-versatile",
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

async function cutAudio(inputPath, segments, youtubeId) {
  console.log(`  Cutting audio to remove explanations...`);
  const naatSegments = segments.filter((s) => s.type === "naat");
  if (naatSegments.length === 0) {
    console.log(`  ⚠️  No naat segments identified`);
    return null;
  }
  const outputPath = join(OUTPUT_DIR, `${youtubeId}_processed_local.m4a`);
  const filterComplex = [];
  const inputs = [];
  naatSegments.forEach((segment, index) => {
    filterComplex.push(
      `[0:a]atrim=start=${segment.start_time}:end=${segment.end_time},asetpts=PTS-STARTPTS[a${index}]`
    );
    inputs.push(`[a${index}]`);
  });
  filterComplex.push(
    `${inputs.join("")}concat=n=${naatSegments.length}:v=0:a=1[out]`
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
      .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
      .run();
  });
}

function generateReport(naat, transcription, analysis, processedPath) {
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
      word_count: transcription.words?.length || 0,
    },
    analysis: analysis,
    output: {
      processed_audio: processedPath,
      original_audio: join(TEMP_DIR, `${naat.youtubeId}.m4a`),
    },
    timestamp: new Date().toISOString(),
  };
  const reportPath = join(OUTPUT_DIR, `${naat.youtubeId}_report_local.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const readablePath = join(OUTPUT_DIR, `${naat.youtubeId}_report_local.txt`);
  const readable = `
NAAT AUDIO PROCESSING REPORT (Local Whisper)
=============================================
Video: ${naat.title}
YouTube: https://www.youtube.com/watch?v=${naat.youtubeId}
Processed: ${new Date().toLocaleString()}

TRANSCRIPTION
-------------
Language: ${transcription.language}
Duration: ${transcription.duration}s
Text: ${transcription.text.substring(0, 500)}...

SEGMENTS IDENTIFIED
-------------------
${analysis.segments
  ?.slice(0, 20)
  .map(
    (s, i) => `
${i + 1}. ${s.type.toUpperCase()} (${s.start_time}s - ${s.end_time}s)
   Confidence: ${s.confidence}
   Text: ${s.text.substring(0, 100)}...
   Reasoning: ${s.reasoning}
`
  )
  .join("\n")}

... (See JSON for all ${analysis.segments?.length || 0} segments)

SUMMARY
-------
${analysis.summary}

FILES
-----
Original: ${join(TEMP_DIR, `${naat.youtubeId}.m4a`)}
Processed: ${processedPath || "N/A"}
`;
  writeFileSync(readablePath, readable);
  console.log(`\n✓ Reports generated:`);
  console.log(`  JSON: ${reportPath}`);
  console.log(`  Text: ${readablePath}`);
}

async function main() {
  console.log("🎵 Naat Audio Processing (Local Whisper)\n");
  ensureDirectories();

  const TEST_VIDEO_ID = "mgONEN7IqE8";
  const naat = {
    youtubeId: TEST_VIDEO_ID,
    title: "Test Naat 2 - 30min",
    $id: "test-" + TEST_VIDEO_ID,
  };

  console.log(`✓ Video ID: ${TEST_VIDEO_ID}\n`);

  try {
    console.log("📥 Step 1: Downloading audio...");
    const audioPath = await downloadAudio(naat.youtubeId, naat.title);

    console.log("\n🎤 Step 2: Transcribing audio (local Whisper)...");
    const transcription = await transcribeAudioLocal(audioPath);

    console.log("\n🧠 Step 3: Analyzing transcript...");
    const analysis = await analyzeTranscript(transcription);

    console.log("\n✂️  Step 4: Processing audio...");
    const processedPath = await cutAudio(
      audioPath,
      analysis.segments,
      naat.youtubeId
    );

    console.log("\n📊 Step 5: Generating report...");
    generateReport(naat, transcription, analysis, processedPath);

    console.log("\n" + "=".repeat(60));
    console.log("✅ PROCESSING COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\nCheck: ${OUTPUT_DIR}`);
    console.log(
      `\n💡 Listen to processed audio and review report for accuracy.`
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
