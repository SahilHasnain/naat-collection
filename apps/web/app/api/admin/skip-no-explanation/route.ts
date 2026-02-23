import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

export async function POST(request: NextRequest) {
  try {
    const { naatId } = await request.json();

    if (!naatId) {
      return NextResponse.json({ error: "Missing naatId" }, { status: 400 });
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    // Get the naat to retrieve its audioId
    const naat = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
      naatId,
    );

    if (!naat.audioId) {
      return NextResponse.json(
        { error: "Naat has no audioId" },
        { status: 400 },
      );
    }

    // Set cutAudio to the same as audioId (no cutting needed)
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
      naatId,
      { cutAudio: naat.audioId },
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Skip no explanation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to skip naat" },
      { status: 500 },
    );
  }
}
