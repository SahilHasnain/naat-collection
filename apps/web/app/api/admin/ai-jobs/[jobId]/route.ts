import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";

export const dynamic = "force-dynamic";

const JOBS_COLLECTION_ID = process.env.APPWRITE_AI_JOBS_COLLECTION_ID!;

function createDatabases() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return new Databases(client);
}

function isoNow() {
  return new Date().toISOString();
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const { action } = await request.json();
  const databases = createDatabases();

  const job = await databases.getDocument(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    JOBS_COLLECTION_ID,
    jobId,
  );

  if (action === "stop") {
    const currentStatus = String(job.status || "");

    if (currentStatus === "pending") {
      const updated = await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        JOBS_COLLECTION_ID,
        jobId,
        {
          status: "stopped",
          error: "Stopped by admin",
          finishedAt: isoNow(),
          leaseUntil: isoNow(),
        },
      );

      return NextResponse.json({ job: updated });
    }

    if (currentStatus === "running") {
      const updated = await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        JOBS_COLLECTION_ID,
        jobId,
        {
          status: "stop_requested",
          error: "Stop requested by admin",
        },
      );

      return NextResponse.json({ job: updated });
    }

    return NextResponse.json(
      { error: `Job cannot be stopped from status '${currentStatus}'` },
      { status: 400 },
    );
  }

  if (action === "rerun") {
    const naatId = String(job.naatId || "");
    const audioId = String(job.audioId || "");
    const type = String(job.type || "manual-cut-detect");

    if (!naatId || !audioId) {
      return NextResponse.json({ error: "Job is missing naatId or audioId" }, { status: 400 });
    }

    const existing = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      JOBS_COLLECTION_ID,
      [
        Query.equal("type", [type]),
        Query.equal("naatId", [naatId]),
        Query.equal("status", ["pending", "running", "stop_requested"]),
        Query.limit(1),
      ],
    );

    if (existing.documents.length > 0) {
      return NextResponse.json(
        { error: "An active job already exists for this naat" },
        { status: 400 },
      );
    }

    const newJob = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      JOBS_COLLECTION_ID,
      ID.unique(),
      {
        type,
        naatId,
        audioId,
        status: "pending",
        progress: 0,
        attempts: 0,
        error: "",
        resultJson: "",
      },
    );

    return NextResponse.json({ job: newJob });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const databases = createDatabases();

  const job = await databases.getDocument(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    JOBS_COLLECTION_ID,
    jobId,
  );

  const currentStatus = String(job.status || "");
  if (currentStatus === "running" || currentStatus === "pending" || currentStatus === "stop_requested") {
    return NextResponse.json(
      { error: "Active jobs must be stopped before removal" },
      { status: 400 },
    );
  }

  await databases.deleteDocument(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    JOBS_COLLECTION_ID,
    jobId,
  );

  return NextResponse.json({ success: true });
}
