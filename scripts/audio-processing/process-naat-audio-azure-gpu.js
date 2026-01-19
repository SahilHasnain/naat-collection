/**
 * Naat Audio Processing Script - Azure GPU Optimized
 *
 * Optimized for Azure GPU VMs with:
 * - GPU-accelerated Whisper (large-v3 model for best accuracy)
 * - Batch processing support
 * - Progress monitoring
 * - Automatic GPU detection
 *
 * Requirements:
 * - Azure GPU VM (NC-series recommended)
 * - Python 3.8+ with openai-whisper + PyTorch CUDA
 * - FFmpeg
 * - yt-dlp
 *
 * Usage:
 *   node scripts/audio-processing/process-naat-audio-azure-gpu.js [youtube-url]
 *   node scripts/audio-processing/process-naat-audio-azure-gpu.js --batch urls.txt
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
const WHISPER_MODEL = process.env.WHISPER_MODEL || "large-v3"; // large-v3 for best accuracy on GPU

// Directories
const TEMP_DIR = join(process.cwd(), "temp-audio");
const OUTPUT_DIR = join(process.cwd(), "temp-audio", "processed");

// Audio processing settings
const PADDING_SECONDS = 0.3;
const CROSSFADE_DURATION = 0.5;

// Initialize Groq client
const groq = new Groq({ apiKey: GROQ_API_KEY });

/**
 * Check GPU availability
 */
async function checkGPU() {
  return new Promise((resolve) => {
    const pythonCheck = spawn("python3", [
      "-c",
      "import torch; print('CUDA' if torch.cuda.is_available() else 'CPU'); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU')",
    ]);

    let output = "";
    pythonCheck.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonCheck.on("close", () => {
      const lines = output.trim().split("\n");
      const device = lines[0] || "CPU";
      const gpuName = lines[1] || "No GPU";
      resolve({ device, gpuName });
    });

    pythonCheck.on("error", () => {
      resolve({ device: "CPU", gpuName: "No GPU" });
    });
  });
}

/**
 * Ensure directories exist
 */
function ensureDirectories() {
  [TEMP_DIR, OUTPUT_DIR].forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
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
 * Transcribe audio with Whisper (GPU-accelerated)
 */
async function transcribeAudio(audioPath, gpuInfo) {
  console.log(
    `  Transcribing with Whisper ${WHISPER_MODEL} on ${gpuInfo.device}...`
  );
  if (gpuInfo.device === "CUDA") {
    console.log(`  GPU: ${gpuInfo.gpuName}`);
  }

  const outputJsonPath = audioPath.replace(/\.[^.]+$/, "_whisper.json");

  return new Promise((resolve, reject) => {
    const whisperProcess = spawn("python3", [
      "-m",
      "whisper",
      audioPath,
      "--model",
      WHISPER_MODEL,
      "--language",
      "ur",
      "--output_format",
      "json",
      "--output_dir",
      TEMP_DIR,
      "--verbose",
      "False",
      "--device",
      gpuInfo.device === "CUDA" ? "cuda" : "cpu",
    ]);

    let errorOutput = "";
    let lastProgress = 0;

    whisperProcess.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;

      // Show progress
      if (text.includes("%")) {
        const match = text.match(/(\d+)%/);
        if (match) {
          const progress = parseInt(match[1]);
          if (progress > lastProgress) {
            process.stdout.write(`\r  Progress: ${progress}%`);
            lastProgress = progress;
          }
        }
      }
    });

    whisperProcess.on("close", (code) => {
      console.log("");

      if (code !== 0) {
        console.error(`\n  Whisper stderr:\n${errorOutput}`);
        reject(new Error(`Whisper failed with code ${code}`));
        return;
      }

      try {
        if (!existsSync(outputJsonPath)) {
          reject(new Error(`Whisper output file not found: ${outputJsonPath}`));
          return;
        }

        const whisperOutput = JSON.parse(readFileSync(outputJsonPath, "utf8"));
        console.log(`  ✓ Transcription completed`);

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
          `Failed to spawn whisper: ${err.message}. Make sure openai-whisper is installed.`
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
      (s) =>
        `[${s.originalIndex}] ${s.start.toFixed(1)}-${s.end.toFixed(1)}s: ${s.text.substring(0, 100)}`
    )
    .join("\n");

  const prompt = `You are an expert in Urdu naats (Islamic devotional songs). 

Classify each segment into ONE category:

1. NAAT: Pure melodic singing/recitation
2. EXPLANATION: Talking, interruptions, religious phrases, commentary

SEGMENTS (Batch ${batchIndex + 1}/${totalBatches}):
${segmentSummary}

Respond in JSON:
{
  "segments": [
    {
      "segment_index": index,
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
          "You are an expert in Urdu naats. Respond only with valid JSON. Only pure singing is 'naat'.",
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
 * Analyze transcript with Groq (batched)
 */
async function analyzeTranscript(transcription) {
  console.log(`  Analyzing transcript with Groq Llama...`);

  const segments = transcription.segments || [];
  const BATCH_SIZE = 60;

  const indexedSegments = segments.map((s, i) => ({
    ...s,
    originalIndex: i,
  }));

  const batches = [];
  for (let i = 0; i < indexedSegments.length; i += BATCH_SIZE) {
    batches.push(indexedSegments.slice(i, i + BATCH_SIZE));
  }

  console.log(`  Processing ${batches.length} batches...`);

  const allAnalyzedSegments = [];

  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`\r  Batch ${i + 1}/${batches.length}...`);

    try {
      const batchResult = await analyzeBatch(batches[i], i, batches.length);

      if (batchResult.segments) {
        const enrichedSegments = batchResult.segments.map((seg) => ({
          ...seg,
          text: segments[seg.segment_index]?.text || "",
        }));
        allAnalyzedSegments.push(...enrichedSegments);
      }

      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`\n  ⚠️  Batch ${i + 1} failed: ${error.message}`);
    }
  }

  console.log("");

  const naatCount = allAnalyzedSegments.filter((s) => s.type === "naat").length;
  const explanationCount = allAnalyzedSegments.filter(
    (s) => s.type === "explanation"
  ).length;

  const naatPercentage = (naatCount / allAnalyzedSegments.length) * 100;
  const explanationPercentage =
    (explanationCount / allAnalyzedSegments.length) * 100;

  console.log(`  ✓ Analysis completed`);
  console.log(`     NAAT: ${naatCount} (${naatPercentage.toFixed(1)}%)`);
  console.log(
    `     EXPLANATION: ${explanationCount} (${explanationPercentage.toFixed(1)}%)`
  );

  return {
    segments: allAnalyzedSegments,
    summary: `Classified ${allAnalyzedSegments.length} segments`,
    naat_percentage: naatPercentage,
    explanation_percentage: explanationPercentage,
  };
}

/**
 * Merge consecutive naat segments
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

    if (segment.start_time - current.end_time <= 0.5) {
      current.end_time = segment.end_time;
      current.text += " " + segment.text;
    } else {
      merged.push(current);
      current = { ...segment };
    }
  }

  merged.push(current);

  const padded = merged.map((seg) => ({
    ...seg,
    original_start: seg.start_time,
    original_end: seg.end_time,
    start_time: Math.max(0, seg.start_time - PADDING_SECONDS),
    end_time: Math.min(audioDuration, seg.end_time + PADDING_SECONDS),
  }));

  console.log(`  ✓ Merged into ${merged.length} blocks`);

  return padded;
}

/**
 * Cut audio with crossfades
 */
async function cutAudioWithCrossfade(
  inputPath,
  segments,
  youtubeId,
  audioDuration
) {
  console.log(`  Cutting audio...`);

  const mergedSegments = mergeAndPadSegments(segments, audioDuration);

  if (mergedSegments.length === 0) {
    console.log(`  ⚠️  No naat segments found`);
    return null;
  }

  const outputPath = join(OUTPUT_DIR, `${youtubeId}_azure_processed.m4a`);

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
          console.log(`  ✓ Audio processed`);
          resolve(outputPath);
        })
        .on("error", (err) => {
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .run();
    });
  }

  return new Promise((resolve, reject) => {
    const filterComplex = [];
    const inputs = [];

    mergedSegments.forEach((segment, index) => {
      filterComplex.push(
        `[0:a]atrim=start=${segment.start_time}:end=${segment.end_time},asetpts=PTS-STARTPTS[a${index}]`
      );
      inputs.push(`a${index}`);
    });

    const inputLabels = inputs.map((label) => `[${label}]`).join("");
    filterComplex.push(
      `${inputLabels}concat=n=${mergedSegments.length}:v=0:a=1[out]`
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
        console.log(`  ✓ Audio processed`);
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
  mergedCount,
  gpuInfo
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
      model: WHISPER_MODEL,
      device: gpuInfo.device,
      gpu: gpuInfo.gpuName,
    },
    analysis: {
      ...analysis,
      merged_segments_count: mergedCount,
    },
    output: {
      processed_audio: processedPath,
    },
    timestamp: new Date().toISOString(),
  };

  const reportPath = join(OUTPUT_DIR, `${naat.youtubeId}_azure_report.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n✓ Report: ${reportPath}`);
}

/**
 * Process single video
 */
async function processVideo(videoUrl, gpuInfo) {
  const videoIdMatch = videoUrl.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );

  if (!videoIdMatch) {
    throw new Error("Invalid YouTube URL");
  }

  const youtubeId = videoIdMatch[1];
  const naat = {
    youtubeId,
    title: `Naat - ${youtubeId}`,
  };

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${videoUrl}`);
  console.log(`${"=".repeat(60)}\n`);

  const audioPath = await downloadAudio(naat.youtubeId, naat.title);
  const transcription = await transcribeAudio(audioPath, gpuInfo);
  const analysis = await analyzeTranscript(transcription);
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

  generateReport(
    naat,
    transcription,
    analysis,
    processedPath,
    mergedSegments.length,
    gpuInfo
  );

  console.log(`✅ Completed: ${youtubeId}`);
}

/**
 * Main function
 */
async function main() {
  console.log("🎵 Naat Audio Processing - Azure GPU Optimized\n");

  // Check GPU
  const gpuInfo = await checkGPU();
  console.log(`🎮 Device: ${gpuInfo.device}`);
  if (gpuInfo.device === "CUDA") {
    console.log(`   GPU: ${gpuInfo.gpuName}`);
  }
  console.log(`🎤 Whisper Model: ${WHISPER_MODEL}\n`);

  ensureDirectories();

  const args = process.argv.slice(2);

  // Batch mode
  if (args[0] === "--batch" && args[1]) {
    const urlsFile = args[1];
    if (!existsSync(urlsFile)) {
      console.error(`❌ File not found: ${urlsFile}`);
      process.exit(1);
    }

    const urls = readFileSync(urlsFile, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    console.log(`📋 Batch processing ${urls.length} videos\n`);

    for (let i = 0; i < urls.length; i++) {
      console.log(`\n[${i + 1}/${urls.length}] ${urls[i]}`);
      try {
        await processVideo(urls[i], gpuInfo);
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
      }
    }

    console.log(`\n✅ Batch processing complete!`);
  } else {
    // Single video mode
    const videoUrl =
      args[0] || "https://youtu.be/mgONEN7IqE8?si=mkWINU0McOItCV7p";

    if (!args[0]) {
      console.log("⚠️  No URL provided, using default test video\n");
    }

    await processVideo(videoUrl, gpuInfo);
  }

  console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
}

// Run
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
