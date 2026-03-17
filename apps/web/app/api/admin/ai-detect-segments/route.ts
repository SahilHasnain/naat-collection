import { execFile } from "child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Storage } from "node-appwrite";
import { join } from "path";
import { createJob, getJob, pruneOldJobs, updateJob } from "@/lib/ai-detect-jobs";

const TEMP_DIR = join(process.cwd(), "temp-ai-detect");

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

function runJob(jobId: string, naatId: string) {
  const inputPath = join(TEMP_DIR, `${naatId}_detect.mp4`);

  updateJob(jobId, { status: "running" });

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);
  const storage = new Storage(client);

  (async () => {
    try {
      const naat = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        naatId,
      );

      if (!naat.audioId) throw new Error("Naat has no audio file");

      const audioBuffer = await storage.getFileDownload("audio-files", naat.audioId);
      writeFileSync(inputPath, Buffer.from(audioBuffer));

      const scriptPath = join(
        process.cwd(), "..", "..",
        "scripts", "audio-processing", "classify-chunks.py",
      );

      const stdout = await new Promise<string>((resolve, reject) => {
        execFile(
          "python",
          [scriptPath, inputPath],
          { timeout: 30 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 }, // 30 min
          (error, stdout, stderr) => {
            if (stderr) console.log("[ai-detect] stderr:", stderr);
            if (error) reject(new Error(stderr || error.message));
            else resolve(stdout);
          },
        );
      });

      const result = JSON.parse(stdout);
      updateJob(jobId, { status: "done", result });
    } catch (err) {
      const error = err instanceof Error ? err.message : "AI detection failed";
      console.error(`[ai-detect] job ${jobId} failed:`, error);
      updateJob(jobId, { status: "failed", error });
    } finally {
      try { if (existsSync(inputPath)) unlinkSync(inputPath); } catch { /* ignore */ }
    }
  })();
}

export async function POST(request: NextRequest) {
  pruneOldJobs();

  const { naatId } = await request.json();
  if (!naatId) {
    return NextResponse.json({ error: "Missing naatId" }, { status: 400 });
  }

  const job = createJob(naatId);
  runJob(job.id, naatId); // fire and forget

  return NextResponse.json({ jobId: job.id });
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    result: job.result,
    error: job.error,
  });
}
