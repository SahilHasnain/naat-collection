import { NextResponse } from "next/server";
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

export async function POST() {
  const databases = createDatabases();
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  let deletedCount = 0;

  for (const status of ["done", "failed"]) {
    const response = await databases.listDocuments(
      databaseId,
      JOBS_COLLECTION_ID,
      [
        Query.equal("type", ["manual-cut-detect"]),
        Query.equal("status", [status]),
        Query.limit(100),
      ],
    );

    for (const job of response.documents) {
      await databases.deleteDocument(databaseId, JOBS_COLLECTION_ID, String(job.$id));
      deletedCount += 1;
    }
  }

  return NextResponse.json({ deletedCount });
}
