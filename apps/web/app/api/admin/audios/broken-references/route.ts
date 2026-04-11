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

function getReferencedAudioIds(naat: Record<string, unknown>) {
  return [naat.audioId, naat.cutAudio]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export async function GET() {
  try {
    const [naats, audioFiles] = await Promise.all([fetchAllNaats(), getAllAudioFileIds()]);

    const broken = naats
      .map((naat) => {
        const referencedIds = getReferencedAudioIds(naat);
        const missingIds = referencedIds.filter((fileId) => !audioFiles.has(fileId));

        if (missingIds.length === 0) {
          return null;
        }

        return {
          $id: String(naat.$id),
          title: String(naat.title || "Untitled"),
          youtubeId: String(naat.youtubeId || ""),
          channelName: String(naat.channelName || "Unknown Channel"),
          audioId: String(naat.audioId || ""),
          cutAudio: String(naat.cutAudio || ""),
          missingIds,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      count: broken.length,
      items: broken.slice(0, 200),
    });
  } catch (error) {
    console.error("Error auditing broken audio references:", error);
    return NextResponse.json(
      { error: "Failed to audit broken audio references" },
      { status: 500 }
    );
  }
}
