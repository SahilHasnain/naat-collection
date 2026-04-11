import { NextResponse } from "next/server";
import { Client, Databases, Query, Storage } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const NAATS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!;
const AUDIO_BUCKET_ID = "audio-files";

async function fetchAllNaats() {
  const allDocuments: Record<string, unknown>[] = [];
  let offset = 0;
  const limit = 5000;

  while (true) {
    const response = await databases.listDocuments(DATABASE_ID, NAATS_COLLECTION_ID, [
      Query.limit(limit),
      Query.offset(offset),
    ]);

    allDocuments.push(...response.documents);
    if (response.documents.length < limit) break;
    offset += limit;
  }

  return allDocuments;
}

async function getAllAudioFileIds() {
  const fileIds = new Set<string>();
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await storage.listFiles(AUDIO_BUCKET_ID, [Query.limit(limit), Query.offset(offset)]);
    response.files.forEach((file) => fileIds.add(String(file.$id)));
    if (response.files.length < limit) break;
    offset += limit;
  }

  return fileIds;
}

export async function POST() {
  try {
    const [naats, audioFiles] = await Promise.all([fetchAllNaats(), getAllAudioFileIds()]);

    let updatedCount = 0;
    const sample: Array<{
      $id: string;
      title: string;
      cleared: string[];
    }> = [];

    for (const naat of naats) {
      const nextPatch: Record<string, unknown> = {};
      const cleared: string[] = [];

      const audioId = String(naat.audioId || "").trim();
      const cutAudio = String(naat.cutAudio || "").trim();

      if (audioId && !audioFiles.has(audioId)) {
        nextPatch.audioId = null;
        cleared.push("audioId");
      }

      if (cutAudio && !audioFiles.has(cutAudio)) {
        nextPatch.cutAudio = null;
        cleared.push("cutAudio");
      }

      if (cleared.length === 0) {
        continue;
      }

      await databases.updateDocument(
        DATABASE_ID,
        NAATS_COLLECTION_ID,
        String(naat.$id),
        nextPatch
      );

      updatedCount++;

      if (sample.length < 50) {
        sample.push({
          $id: String(naat.$id),
          title: String(naat.title || "Untitled"),
          cleared,
        });
      }
    }

    return NextResponse.json({
      updatedCount,
      sample,
    });
  } catch (error) {
    console.error("Error repairing broken audio references:", error);
    return NextResponse.json(
      { error: "Failed to repair broken audio references" },
      { status: 500 }
    );
  }
}
