import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";

const JOBS_COLLECTION_ID = process.env.APPWRITE_AI_JOBS_COLLECTION_ID!;

function createDatabases() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return new Databases(client);
}

export async function POST(request: NextRequest) {
  const { naatIds } = await request.json();
  if (!Array.isArray(naatIds) || naatIds.length === 0) {
    return NextResponse.json({ error: "Missing naatIds" }, { status: 400 });
  }

  const databases = createDatabases();
  const queued: string[] = [];
  const skipped: string[] = [];

  for (const naatId of naatIds) {
    try {
      const naat = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        naatId,
      );

      if (!naat.audioId || naat.cutSegments) {
        skipped.push(naatId);
        continue;
      }

      const existing = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        JOBS_COLLECTION_ID,
        [
          Query.equal("type", ["manual-cut-detect"]),
          Query.equal("naatId", [naatId]),
          Query.equal("status", ["pending", "running"]),
          Query.limit(1),
        ],
      );

      if (existing.documents.length > 0) {
        skipped.push(naatId);
        continue;
      }

      await databases.createDocument(
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
      queued.push(naatId);
    } catch {
      skipped.push(naatId);
    }
  }

  return NextResponse.json({
    queuedCount: queued.length,
    skippedCount: skipped.length,
  });
}
