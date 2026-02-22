import { NextRequest, NextResponse } from "next/server";
import {
  Client,
  Databases,
  ID,
  Permission,
  Role,
  Storage,
} from "node-appwrite";
import { InputFile } from "node-appwrite/file";

export async function POST(request: NextRequest) {
  try {
    const { naatId, tempFileId } = await request.json();

    if (!naatId || !tempFileId) {
      return NextResponse.json(
        { error: "Missing naatId or tempFileId" },
        { status: 400 },
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);
    const storage = new Storage(client);

    // Download from temp bucket
    const tempFile = await storage.getFileDownload("tempbucket", tempFileId);

    // Upload to main audio-files bucket
    const mainFileId = ID.unique();
    const mainFile = await storage.createFile(
      "audio-files",
      mainFileId,
      InputFile.fromBuffer(Buffer.from(tempFile), `${naatId}_cut.mp4`),
      [Permission.read(Role.any())],
    );

    // Update naat document with cutAudio reference
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
      naatId,
      { cutAudio: mainFile.$id },
    );

    // Delete temp file
    await storage.deleteFile("tempbucket", tempFileId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Approve cut error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve cut" },
      { status: 500 },
    );
  }
}
