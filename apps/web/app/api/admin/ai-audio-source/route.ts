import { NextRequest, NextResponse } from "next/server";
import { Client, Storage } from "node-appwrite";
import { verifyAiAudioToken } from "@/lib/ai-audio-token";

export async function GET(request: NextRequest) {
  try {
    const audioId = request.nextUrl.searchParams.get("audioId");
    const expires = request.nextUrl.searchParams.get("expires");
    const signature = request.nextUrl.searchParams.get("signature");

    if (!audioId || !expires || !signature) {
      return NextResponse.json({ error: "Missing token parameters" }, { status: 400 });
    }

    if (!verifyAiAudioToken(audioId, expires, signature)) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const storage = new Storage(client);
    const fileMetadata = await storage.getFile("audio-files", audioId);
    const fileBuffer = await storage.getFileView("audio-files", audioId);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": fileMetadata.mimeType || "application/octet-stream",
        "Content-Length": fileMetadata.sizeOriginal.toString(),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[ai-audio-source] failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load audio" },
      { status: 500 },
    );
  }
}
