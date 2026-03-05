import { NextRequest, NextResponse } from "next/server";
import { Client, Storage } from "node-appwrite";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const audioId = searchParams.get("audioId");

    if (!audioId) {
      return NextResponse.json(
        { error: "Missing audioId parameter" },
        { status: 400 }
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const storage = new Storage(client);

    // Get the file
    const fileBuffer = await storage.getFileView(
      "audio-files",
      audioId
    );

    // Return the audio file with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "audio/mp4", // M4A is MPEG-4 audio
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error streaming audio:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stream audio" },
      { status: 500 }
    );
  }
}
