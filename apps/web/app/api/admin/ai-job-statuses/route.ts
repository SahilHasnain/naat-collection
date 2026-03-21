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
  const rawNaatIds = request.nextUrl.searchParams.get("naatIds");
  const naatIds = rawNaatIds
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];

  if (naatIds.length === 0) {
    return NextResponse.json({ statuses: {} });
  }

  const databases = createDatabases();
  const response = await databases.listDocuments(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    JOBS_COLLECTION_ID,
    [
      Query.equal("type", ["manual-cut-detect"]),
      Query.equal("naatId", naatIds),
      Query.orderDesc("$createdAt"),
      Query.limit(Math.min(naatIds.length * 5, 200)),
    ],
  );

  const statuses: Record<string, string> = {};

  for (const document of response.documents) {
    const naatId = String(document.naatId || "");
    if (!naatId || statuses[naatId]) continue;
    statuses[naatId] = String(document.status || "");
  }

  return NextResponse.json({ statuses });
}
