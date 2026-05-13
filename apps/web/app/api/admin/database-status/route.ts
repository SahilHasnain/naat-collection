import { NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

export const dynamic = "force-dynamic";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

interface DatabaseStats {
  total: number;
  withAudioId: number;
  withCutAudio: number;
  withCutSegments: number;
  cutStatusNull: number;
  cutStatusDone: number;
  cutStatusFailed: number;
  cutStatusProcessing: number;
  inconsistentCutStatus: number;
  eligibleForProcessing: number;
  cutSegmentsButNoCutAudio: number;
}

export async function GET() {
  try {
    const stats: DatabaseStats = {
      total: 0,
      withAudioId: 0,
      withCutAudio: 0,
      withCutSegments: 0,
      cutStatusNull: 0,
      cutStatusDone: 0,
      cutStatusFailed: 0,
      cutStatusProcessing: 0,
      inconsistentCutStatus: 0,
      eligibleForProcessing: 0,
      cutSegmentsButNoCutAudio: 0,
    };

    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
        [Query.limit(limit), Query.offset(offset)]
      );

      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      for (const naat of response.documents) {
        stats.total++;

        const hasAudioId = naat.audioId !== null && naat.audioId !== undefined;
        const hasCutAudio = naat.cutAudio !== null && naat.cutAudio !== undefined;
        const hasCutSegments = naat.cutSegments !== null && naat.cutSegments !== undefined;
        const cutStatus = naat.cutStatus;

        if (hasAudioId) stats.withAudioId++;
        if (hasCutAudio) stats.withCutAudio++;
        if (hasCutSegments) stats.withCutSegments++;

        // Track cutStatus
        if (cutStatus === null || cutStatus === undefined) {
          stats.cutStatusNull++;
        } else if (cutStatus === "done") {
          stats.cutStatusDone++;
        } else if (cutStatus === "failed") {
          stats.cutStatusFailed++;
        } else if (cutStatus === "processing") {
          stats.cutStatusProcessing++;
        }

        // Check for inconsistent state: cutStatus="done" but cutAudio is NULL
        if (cutStatus === "done" && !hasCutAudio) {
          stats.inconsistentCutStatus++;
        }

        // Check eligible for processing
        const isEligible =
          hasCutSegments &&
          !hasCutAudio &&
          hasAudioId &&
          (cutStatus === null || cutStatus === undefined || cutStatus === "failed");

        if (isEligible) {
          stats.eligibleForProcessing++;
        }

        // cutSegments but no cutAudio
        if (hasCutSegments && !hasCutAudio) {
          stats.cutSegmentsButNoCutAudio++;
        }
      }

      if (response.documents.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Database status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch database status" },
      { status: 500 }
    );
  }
}
