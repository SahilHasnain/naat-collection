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

async function getAllAudioFiles() {
  const files: Array<{ id: string }> = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await storage.listFiles(AUDIO_BUCKET_ID, [Query.limit(limit), Query.offset(offset)]);
    response.files.forEach((file) => files.push({ id: String(file.$id) }));
    if (response.files.length < limit) break;
    offset += limit;
  }

  return files;
}

function getReferencedAudioIds(naat: Record<string, unknown>) {
  return [naat.audioId, naat.cutAudio]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export async function POST() {
  try {
    const [naats, files] = await Promise.all([fetchAllNaats(), getAllAudioFiles()]);

    const referencedAudioIds = new Set(
      naats.flatMap((naat) => getReferencedAudioIds(naat))
    );

    let deletedCount = 0;

    for (const file of files) {
      if (referencedAudioIds.has(file.id)) {
        continue;
      }

      await storage.deleteFile(AUDIO_BUCKET_ID, file.id);
      deletedCount++;
    }

    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error("Error cleaning up orphaned audio:", error);
    return NextResponse.json({ error: "Failed to cleanup orphaned audio" }, { status: 500 });
  }
}
