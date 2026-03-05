import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

export async function POST(request: NextRequest) {
  try {
    const { naatId, exclude } = await request.json();

    if (!naatId || typeof exclude !== "boolean") {
      return NextResponse.json(
        { error: "Missing naatId or exclude value" },
        { status: 400 }
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    const updatedDoc = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
      naatId,
      { exclude }
    );

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (error) {
    console.error("Error toggling exclude:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update naat" },
      { status: 500 }
    );
  }
}
