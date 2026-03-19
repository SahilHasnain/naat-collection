import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import { createJob, getJob, pruneOldJobs, updateJob } from "@/lib/ai-detect-jobs";
import { createAiAudioToken } from "@/lib/ai-audio-token";

// Disable Next.js timeout for this route
export const maxDuration = 300; // 5 minutes (Vercel limit)
export const dynamic = 'force-dynamic';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "https://naat-ai.duckdns.org";

function runJob(jobId: string, naatId: string, origin: string) {
  // Fire and forget - don't await
  (async () => {
    try {
      updateJob(jobId, { status: "running" });

      const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
        .setKey(process.env.APPWRITE_API_KEY!);

      const databases = new Databases(client);

      const naat = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        naatId,
      );

      if (!naat.audioId) throw new Error("Naat has no audio file");

      const { expires, signature } = createAiAudioToken(naat.audioId);
      const audioUrl =
        `${origin}/api/admin/ai-audio-source?audioId=${encodeURIComponent(naat.audioId)}` +
        `&expires=${expires}&signature=${signature}`;
      const payload = JSON.stringify({
        naat_id: naatId,
        audio_url: audioUrl,
      });

      console.log(`[ai-detect] Calling AI service for naat ${naatId} with signed source URL`);

      const response = await fetch(`${AI_SERVICE_URL}/detect-segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (!response.ok) {
        const rawError = await response.text();
        let parsedError = "";

        try {
          const errorData = JSON.parse(rawError);
          parsedError = errorData.error || "";
        } catch {
          parsedError = rawError.slice(0, 300).trim();
        }

        const message = parsedError || `AI service returned ${response.status}`;
        throw new Error(`AI service returned ${response.status}: ${message}`);
      }

      const result = await response.json();
      updateJob(jobId, { status: "done", result });
      console.log(`[ai-detect] Job ${jobId} completed successfully`);
    } catch (err) {
      const error = err instanceof Error ? err.message : "AI detection failed";
      console.error(`[ai-detect] job ${jobId} failed:`, error);
      updateJob(jobId, { status: "failed", error });
    }
  })().catch(err => {
    console.error(`[ai-detect] Unhandled error in job ${jobId}:`, err);
  });
}

export async function POST(request: NextRequest) {
  pruneOldJobs();

  const { naatId } = await request.json();
  if (!naatId) {
    return NextResponse.json({ error: "Missing naatId" }, { status: 400 });
  }

  const job = createJob(naatId);
  runJob(job.id, naatId, request.nextUrl.origin); // fire and forget

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
