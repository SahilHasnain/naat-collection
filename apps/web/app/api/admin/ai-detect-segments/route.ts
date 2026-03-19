import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";

export const dynamic = 'force-dynamic';
const JOBS_COLLECTION_ID = process.env.APPWRITE_AI_JOBS_COLLECTION_ID!;

function createDatabases() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return new Databases(client);
}

export async function POST(request: NextRequest) {
  const databases = createDatabases();

  const { naatId } = await request.json();
  if (!naatId) {
    return NextResponse.json({ error: "Missing naatId" }, { status: 400 });
  }

  const naat = await databases.getDocument(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
    naatId,
  );

  if (!naat.audioId) {
    return NextResponse.json({ error: "Naat has no audio file" }, { status: 400 });
  }

  const existing = await databases.listDocuments(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    JOBS_COLLECTION_ID,
    [
      Query.equal("type", ["manual-cut-detect"]),
      Query.equal("naatId", [naatId]),
      Query.equal("status", ["pending", "running"]),
      Query.orderDesc("$createdAt"),
      Query.limit(1),
    ],
  ).catch(() => null);

  const pendingOrRunning = existing?.documents[0];

  if (pendingOrRunning) {
    return NextResponse.json({ jobId: pendingOrRunning.$id });
  }

  const job = await databases.createDocument(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    JOBS_COLLECTION_ID,
    ID.unique(),
    {
      type: "manual-cut-detect",
      naatId,
      audioId: naat.audioId,
      status: "pending",
      progress: 0,
      attempts: 0,
    },
  );

  return NextResponse.json({ jobId: job.$id });
}

export async function GET(request: NextRequest) {
  const databases = createDatabases();
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  let job;
  try {
    job = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      JOBS_COLLECTION_ID,
      jobId,
    );
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  let result = undefined;
  if (job.resultJson) {
    try {
      result = JSON.parse(job.resultJson);
    } catch {
      result = undefined;
    }
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    result,
    error: job.error,
  });
}
