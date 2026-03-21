import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

export const dynamic = "force-dynamic";

const JOBS_COLLECTION_ID = process.env.APPWRITE_AI_JOBS_COLLECTION_ID!;

function createDatabases() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return new Databases(client);
}

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") || "all";
  const type = request.nextUrl.searchParams.get("type") || "manual-cut-detect";
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || "100"), 100);

  const databases = createDatabases();
  const queries = [
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
    Query.equal("type", [type]),
  ];

  if (status !== "all") {
    queries.push(Query.equal("status", [status]));
  }

  const jobsResponse = await databases.listDocuments(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    JOBS_COLLECTION_ID,
    queries,
  );

  const naatIds = Array.from(
    new Set(
      jobsResponse.documents
        .map((job) => String(job.naatId || ""))
        .filter(Boolean),
    ),
  );

  const naatTitleById: Record<string, string> = {};

  if (naatIds.length > 0) {
    const naatsResponse = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
      [
        Query.equal("$id", naatIds),
        Query.select(["title", "$id", "youtubeId", "channelName"]),
        Query.limit(Math.min(naatIds.length, 100)),
      ],
    );

    for (const naat of naatsResponse.documents) {
      naatTitleById[String(naat.$id)] = String(naat.title || "");
    }
  }

  const jobs = jobsResponse.documents.map((job) => ({
    $id: String(job.$id),
    $createdAt: String(job.$createdAt),
    $updatedAt: String(job.$updatedAt),
    type: String(job.type || ""),
    status: String(job.status || ""),
    progress: Number(job.progress || 0),
    attempts: Number(job.attempts || 0),
    naatId: String(job.naatId || ""),
    audioId: String(job.audioId || ""),
    error: String(job.error || ""),
    resultJson: typeof job.resultJson === "string" ? job.resultJson : "",
    naatTitle: naatTitleById[String(job.naatId || "")] || "",
  }));

  return NextResponse.json({
    total: jobsResponse.total,
    jobs,
  });
}
