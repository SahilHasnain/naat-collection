import { NextRequest, NextResponse } from "next/server";
import { Client, Storage } from "node-appwrite";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const audioId = searchParams.get("audioId");
    const bucket = searchParams.get("bucket") || "audio-files";

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

    // Get the file metadata first to know the size
    const fileMetadata = await storage.getFile(bucket, audioId);
    const fileSize = fileMetadata.sizeOriginal;

    // Check if this is a range request
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      // Parse range header (e.g., "bytes=0-1023")
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // For range requests, we need to download the full file and slice it
      // Note: Appwrite doesn't support range requests natively
      const fileBuffer = await storage.getFileDownload(bucket, audioId);
      const buffer = Buffer.from(fileBuffer);
      const chunk = buffer.slice(start, end + 1);

      return new NextResponse(chunk, {
        status: 206, // Partial Content
        headers: {
          "Content-Type": "audio/mp4",
          "Content-Length": chunkSize.toString(),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    // No range request - return full file
    const fileBuffer = await storage.getFileView(bucket, audioId);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "audio/mp4",
        "Content-Length": fileSize.toString(),
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
