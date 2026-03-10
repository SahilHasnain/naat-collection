import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

export async function POST(request: NextRequest) {
  try {
    const { naatId, cutSegments } = await request.json();

    if (!naatId) {
      return NextResponse.json(
        { error: "Missing naatId" },
        { status: 400 },
      );
    }

    if (!cutSegments || !Array.isArray(cutSegments) || cutSegments.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty cutSegments" },
        { status: 400 },
      );
    }

    // Validate segments have start < end
    for (const seg of cutSegments) {
      if (typeof seg.start !== "number" || typeof seg.end !== "number" || seg.start >= seg.end) {
        return NextResponse.json(
          { error: "Invalid segment: start must be less than end" },
          { status: 400 },
        );
      }
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
      naatId,
      { cutSegments: JSON.stringify(cutSegments) },
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save timestamps error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save timestamps" },
      { status: 500 },
    );
  }
}
