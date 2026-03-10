import { execFile } from "child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Storage } from "node-appwrite";
import { join } from "path";

const TEMP_DIR = join(process.cwd(), "temp-ai-detect");

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  let inputPath = "";

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
    const storage = new Storage(client);

    const naat = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_NAATS_COLLECTION_ID!,
      naatId,
    );

    if (!naat.audioId) {
      return NextResponse.json(
        { error: "Naat has no audio file" },
        { status: 400 },
      );
    }

    // Download audio to temp file
    inputPath = join(TEMP_DIR, `${naatId}_detect.mp4`);
    const audioBuffer = await storage.getFileDownload("audio-files", naat.audioId);
    writeFileSync(inputPath, Buffer.from(audioBuffer));

    // Run the Python classification script
    const scriptPath = join(
      process.cwd(), "..", "..",
      "scripts", "audio-processing", "classify-chunks.py",
    );

    const result = await new Promise<string>((resolve, reject) => {
      execFile(
        "python",
        [scriptPath, inputPath],
        { timeout: 600000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (stderr) {
            console.log("[ai-detect-segments] stderr:", stderr);
          }
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout);
          }
        },
      );
    });

    // Clean up temp file
    if (existsSync(inputPath)) {
      unlinkSync(inputPath);
    }

    const detection = JSON.parse(result);
    return NextResponse.json(detection);
  } catch (error: unknown) {
    if (inputPath && existsSync(inputPath)) {
      try { unlinkSync(inputPath); } catch { /* ignore */ }
    }

    const message = error instanceof Error ? error.message : "AI detection failed";
    console.error("AI detect segments error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
