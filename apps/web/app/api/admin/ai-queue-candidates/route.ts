import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

export const dynamic = "force-dynamic";

const JOBS_COLLECTION_ID = process.env.APPWRITE_AI_JOBS_COLLECTION_ID!;
const LIMIT = 100;
const FETCH_LIMIT = 1000;
const PAGE_SIZE = 100;
const JOB_STATUS_BATCH_SIZE = 100;

function createDatabases() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return new Databases(client);
}

export async function GET(request: NextRequest) {
  const databases = createDatabases();
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const naatsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!;

  const search = request.nextUrl.searchParams.get("search")?.trim() || "";
  const channel = request.nextUrl.searchParams.get("channel") || "all";

  const baseQueries = [
    Query.orderDesc("views"),
    Query.isNotNull("audioId"),
    Query.isNull("cutSegments"),
    Query.or([Query.equal("isAiCut", false), Query.isNull("isAiCut")]),
    Query.or([Query.equal("exclude", false), Query.isNull("exclude")]),
  ];

  if (channel !== "all") {
    baseQueries.push(Query.equal("channelName", [channel]));
  }

  if (search) {
    baseQueries.push(Query.search("title", search));
  }

  const naatPages = Array.from({ length: Math.ceil(FETCH_LIMIT / PAGE_SIZE) }, (_, index) =>
    databases.listDocuments(databaseId, naatsCollectionId, [
      ...baseQueries,
      Query.limit(PAGE_SIZE),
      Query.offset(index * PAGE_SIZE),
    ]),
  );

  const [naatResponses, channelsResponse] = await Promise.all([
    Promise.all(naatPages),
    databases.listDocuments(databaseId, naatsCollectionId, [
      Query.select(["channelName"]),
      Query.limit(5000),
    ]),
  ]);

  const naatDocuments = naatResponses.flatMap((response) => response.documents);
  const naatIds = naatDocuments.map((naat) => String(naat.$id));
  const activeStatuses: Record<string, string> = {};

  if (naatIds.length > 0) {
    for (let index = 0; index < naatIds.length; index += JOB_STATUS_BATCH_SIZE) {
      const batch = naatIds.slice(index, index + JOB_STATUS_BATCH_SIZE);
      const jobsResponse = await databases.listDocuments(databaseId, JOBS_COLLECTION_ID, [
        Query.equal("type", ["manual-cut-detect"]),
        Query.equal("naatId", batch),
        Query.equal("status", ["pending", "running", "stop_requested"]),
        Query.orderDesc("$createdAt"),
        Query.limit(Math.min(batch.length * 3, 300)),
      ]);

      for (const job of jobsResponse.documents) {
        const naatId = String(job.naatId || "");
        if (naatId && !activeStatuses[naatId]) {
          activeStatuses[naatId] = String(job.status || "");
        }
      }
    }
  }

  const channels = Array.from(
    new Set(
      channelsResponse.documents
        .map((doc) => String(doc.channelName || ""))
        .filter(Boolean),
    ),
  ).sort();

  const candidates = naatDocuments
    .map((naat) => ({
      $id: String(naat.$id),
      title: String(naat.title || ""),
      youtubeId: String(naat.youtubeId || ""),
      channelName: String(naat.channelName || ""),
      audioId: String(naat.audioId || ""),
      duration: Number(naat.duration || 0),
      views: Number(naat.views || 0),
      activeJobStatus: activeStatuses[String(naat.$id)] || null,
    }))
    .filter((candidate) => !candidate.activeJobStatus)
    .slice(0, LIMIT);

  return NextResponse.json({
    candidates,
    channels,
  });
}
