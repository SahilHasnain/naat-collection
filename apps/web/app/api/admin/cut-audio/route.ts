import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import {
  Client,
  Databases,
  ID,
  Permission,
  Role,
  Storage,
} from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { join } from "path";

ffmpeg.setFfmpegPath(ffmpegPath.path);

const TEMP_DIR = join(process.cwd(), "temp-manual-cuts");

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

interface CutSegment {
  start: number;
  end: number;
}

// Store job status in memory (use Redis/DB in production)
const jobs = new Map<
  string,
  { status: string; tempFileId?: string; error?: string }
>();

export async function POST(request: NextRequest) {
  try {
    const { naatId, cutSegments } = await request.json();

    if (!naatId || !cutSegments || !Array.isArray(cutSegments)) {
      return NextResponse.json(
        { error: "Missing naatId or cutSegments" },
        { status: 400 },
      );
    }

    const jobId = ID.unique();
    jobs.set(jobId, { status: "processing" });

    // Start processing in background
    processAudioCut(jobId, naatId, cutSegments).catch((error) => {
      console.error("Background processing error:", error);
      jobs.set(jobId, { status: "failed", error: error.message });
    });

    return NextResponse.json({ jobId, status: "processing" });
  } catch (error: any) {
    console.error("Cut audio error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cut audio" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const job = jobs.get(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

async function processAudioCut(
  jobId: string,
  naatId: string,
  cutSegments: CutSegment[],
) {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);
  const storage = new Storage(client);

  const naat = await databases.getDocument(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
    naatId,
  );

  if (!naat.audioId) {
    throw new Error("Naat has no audio file");
  }

  const audioBuffer = await storage.getFileDownload(
    "audio-files",
    naat.audioId,
  );
  const inputPath = join(TEMP_DIR, `${naatId}_original.mp4`);
  writeFileSync(inputPath, Buffer.from(audioBuffer));

  const duration = await getAudioDuration(inputPath);
  const keepSegments = buildKeepSegments(cutSegments, duration);

  if (keepSegments.length === 0) {
    unlinkSync(inputPath);
    throw new Error("No audio would remain after cuts");
  }

  const outputPath = join(TEMP_DIR, `${naatId}_cut.mp4`);
  console.log("Starting audio cut for job:", jobId);
  await cutAudio(inputPath, keepSegments, outputPath);
  console.log("Audio cut complete for job:", jobId);

  const tempFileId = ID.unique();
  const tempFile = await storage.createFile(
    "tempbucket",
    tempFileId,
    InputFile.fromPath(outputPath, `${naatId}_cut.mp4`),
    [Permission.read(Role.any())],
  );

  unlinkSync(inputPath);
  unlinkSync(outputPath);

  jobs.set(jobId, { status: "completed", tempFileId: tempFile.$id });
  console.log("Job completed:", jobId, "tempFileId:", tempFile.$id);
}

function buildKeepSegments(cutSegments: CutSegment[], audioDuration: number) {
  const sorted = [...cutSegments].sort((a, b) => a.start - b.start);
  const keepSegments: CutSegment[] = [];
  let currentTime = 0;

  for (const cut of sorted) {
    if (currentTime < cut.start) {
      keepSegments.push({ start: currentTime, end: cut.start });
    }
    currentTime = Math.max(currentTime, cut.end);
  }

  if (currentTime < audioDuration) {
    keepSegments.push({ start: currentTime, end: audioDuration });
  }

  return keepSegments;
}

async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration || 0);
    });
  });
}

async function cutAudio(
  inputPath: string,
  keepSegments: CutSegment[],
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (keepSegments.length === 1) {
      const seg = keepSegments[0];
      ffmpeg(inputPath)
        .setStartTime(seg.start)
        .setDuration(seg.end - seg.start)
        .audioCodec("aac")
        .audioBitrate("256k")
        .audioFrequency(44100)
        .audioChannels(2)
        .outputOptions(["-q:a", "2"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    } else {
      const filterComplex: string[] = [];
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
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    }
  });
}
