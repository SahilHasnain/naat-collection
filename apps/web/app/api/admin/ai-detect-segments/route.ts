import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Storage } from "node-appwrite";
import { createJob, getJob, pruneOldJobs, updateJob } from "@/lib/ai-detect-jobs";

const AI_SERVICE_URL = "https://naat-ai.duckdns.org";

function runJob(jobId: string, naatId: string) {
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

      // Get audio file URL
      const audioUrl = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/audio-files/files/${naat.audioId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;

      console.log(`[ai-detect] Calling AI service for naat ${naatId}`);

      // Call external AI service
      const response = await fetch(`${AI_SERVICE_URL}/detect-segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_url: audioUrl }),
        signal: AbortSignal.timeout(30 * 60 * 1000), // 30 min timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `AI service returned ${response.status}`);
      }

      const result = await response.json();
      updateJob(jobId, { status: "done", result });
      console.log(`[ai-detect] Job ${jobId} completed successfully`);
    } catch (err) {
      const error = err instanceof Error ? err.message : "AI detection failed";
      console.error(`[ai-detect] job ${jobId} failed:`, error);
      updateJob(jobId, { status: "failed", error });
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
