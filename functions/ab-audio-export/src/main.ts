import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { Client, ID, Permission, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { join } from "path";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const AUDIO_BUCKET = process.env.APPWRITE_AUDIO_BUCKET_ID || "audio-files";
const MAX_EXPORT_SECONDS = 60 * 60;

function parseBody(req: { bodyJson?: unknown; body?: string }): Record<string, unknown> {
  if (req.bodyJson && typeof req.bodyJson === "object") {
    return req.bodyJson as Record<string, unknown>;
  }

  try {
    return JSON.parse(req.body || "{}");
  } catch {
    return {};
  }
}

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, metadata) => {
      if (error) reject(error);
      else resolve(metadata.format.duration || 0);
    });
  });
}

function trimAudio(inputPath: string, outputPath: string, start: number, duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(duration)
      .audioCodec("aac")
      .audioBitrate("256k")
      .audioFrequency(44100)
      .audioChannels(2)
      .outputOptions(["-movflags", "+faststart"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

export default async ({ req, res, log, error: logError }: any) => {
  const body = parseBody(req);
  const audioId = typeof body.audioId === "string" ? body.audioId.trim() : "";
  const startMs = Number(body.startMs);
  const endMs = Number(body.endMs);

  if (!audioId || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return res.json({ error: "audioId, startMs, and endMs are required" }, 400);
  }

  const start = startMs / 1000;
  const end = endMs / 1000;
  const duration = end - start;

  if (start < 0 || duration <= 0 || duration > MAX_EXPORT_SECONDS) {
    return res.json({ error: "Invalid A/B range" }, 400);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || "")
    .setKey(
      process.env.APPWRITE_FUNCTION_API_KEY ||
        process.env.APPWRITE_API_KEY ||
        "",
    );
  const storage = new Storage(client);
  const tempDir = "/tmp/ab-audio-export";
  const inputPath = join(tempDir, `${audioId}-input`);
  const outputPath = join(tempDir, `${audioId}-${Date.now()}.m4a`);

  try {
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

    log(`Exporting ${audioId}: ${startMs}ms-${endMs}ms`);
    const source = await storage.getFileDownload(AUDIO_BUCKET, audioId);
    writeFileSync(inputPath, Buffer.from(source));
    const sourceDuration = await probeDuration(inputPath);

    if (end > sourceDuration + 0.5) {
      return res.json({ error: "A/B range exceeds the source audio duration" }, 400);
    }

    await trimAudio(inputPath, outputPath, start, duration);
    const file = await storage.createFile(
      AUDIO_BUCKET,
      ID.unique(),
      InputFile.fromPath(outputPath, `ab-export-${Date.now()}.m4a`),
      [Permission.read(Role.any())],
    );

    return res.json({ fileId: file.$id, duration: Math.round(duration) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`A/B export failed: ${message}`);
    return res.json({ error: "Could not export the A/B audio" }, 500);
  } finally {
    for (const filePath of [inputPath, outputPath]) {
      try {
        if (existsSync(filePath)) unlinkSync(filePath);
      } catch {
        // Temporary files are best-effort cleanup.
      }
    }
  }
};
