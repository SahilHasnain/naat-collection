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

export async function GET() {
  try {
    const [naats, audioFiles] = await Promise.all([fetchAllNaats(), getAllAudioFileIds()]);

    const withAudio = naats.filter((naat) => Boolean(String(naat.audioId || "").trim()));
    const withCutAudio = naats.filter((naat) => Boolean(String(naat.cutAudio || "").trim()));
    const withoutAudio = naats.filter((naat) => !String(naat.audioId || "").trim());

    const referencedAudioIds = new Set(withAudio.map((naat) => String(naat.audioId)));
    const orphanedAudioFiles = [...audioFiles].filter((fileId) => !referencedAudioIds.has(fileId)).length;

    return NextResponse.json({
      totalNaats: naats.length,
      withAudio: withAudio.length,
      withoutAudio: withoutAudio.length,
      withCutAudio: withCutAudio.length,
      orphanedAudioFiles,
      sampleMissing: withoutAudio.slice(0, 12).map((naat) => ({
        $id: String(naat.$id),
        title: String(naat.title || "Untitled"),
        youtubeId: String(naat.youtubeId || ""),
        channelName: String(naat.channelName || "Unknown Channel"),
      })),
    });
  } catch (error) {
    console.error("Error fetching audio stats:", error);
    return NextResponse.json({ error: "Failed to fetch audio stats" }, { status: 500 });
  }
}
