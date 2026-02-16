/**
 * Re-upload processed audio with correct MIME type
 * Downloads the file, re-uploads with .mp4 extension, updates database
 */

const {
  Client,
  Databases,
  Storage,
  Permission,
  Role,
} = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");
const dotenv = require("dotenv");
const { join } = require("path");
const { writeFileSync, unlinkSync } = require("fs");

dotenv.config({ path: join(__dirname, "../../.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

async function reuploadFile(youtubeId) {
  console.log("🔄 Re-uploading processed audio with correct MIME type...\n");

  try {
    // Step 1: Find naat
    const response = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_NAATS_COLLECTION_ID,
      [require("node-appwrite").Query.equal("youtubeId", youtubeId)],
    );

    if (response.documents.length === 0) {
      throw new Error("Naat not found");
    }

    const naat = response.documents[0];
    const oldFileId = naat.cutAudio;

    console.log(`Naat: ${naat.title}`);
    console.log(`Old cutAudio ID: ${oldFileId}\n`);

    // Step 2: Download old file
    console.log("Downloading old file...");
    const fileBuffer = await storage.getFileDownload("audio-files", oldFileId);
    const tempPath = join(__dirname, "../../temp-reupload.m4a");
    writeFileSync(tempPath, Buffer.from(fileBuffer));
    console.log("✓ Downloaded\n");

    // Step 3: Upload with .mp4 extension
    console.log("Uploading with .mp4 extension...");
    const newFileId = require("node-appwrite").ID.unique();
    const newFile = await storage.createFile(
      "audio-files",
      newFileId,
      InputFile.fromPath(tempPath, `${youtubeId}_ai_cut.mp4`),
      [Permission.read(Role.any())],
    );
    console.log(`✓ Uploaded: ${newFile.$id}`);
    console.log(`  MIME type: ${newFile.mimeType}\n`);

    // Step 4: Update database
    console.log("Updating database...");
    await databases.updateDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_NAATS_COLLECTION_ID,
      naat.$id,
      { cutAudio: newFile.$id },
    );
    console.log("✓ Database updated\n");

    // Step 5: Delete old file
    console.log("Deleting old file...");
    await storage.deleteFile("audio-files", oldFileId);
    console.log("✓ Old file deleted\n");

    // Step 6: Cleanup temp file
    unlinkSync(tempPath);

    console.log("✅ Success!");
    console.log(`New cutAudio ID: ${newFile.$id}`);
    console.log(`MIME type: ${newFile.mimeType}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

const youtubeId = process.argv[2];

if (!youtubeId) {
  console.error("❌ Usage: node reupload-with-correct-mime.js <youtubeId>");
  console.log("\nExample: node reupload-with-correct-mime.js dH4OIOa69Lo");
  process.exit(1);
}

reuploadFile(youtubeId);
