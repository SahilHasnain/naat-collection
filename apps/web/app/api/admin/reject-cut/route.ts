import { NextRequest, NextResponse } from "next/server";
import { Client, Storage } from "node-appwrite";

export async function DELETE(request: NextRequest) {
  try {
    const { tempFileId } = await request.json();

    if (!tempFileId) {
      return NextResponse.json(
        { error: "Missing tempFileId" },
        { status: 400 },
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const storage = new Storage(client);

    // Delete the temp file
    await storage.deleteFile("tempbucket", tempFileId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reject cut error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject cut" },
      { status: 500 },
    );
  }
}
