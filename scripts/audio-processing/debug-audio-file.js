/**
 * Debug audio file in Appwrite storage
 * Check if file exists, its properties, and permissions
 */

const { Client, Storage } = require("node-appwrite");
const dotenv = require("dotenv");
const { join } = require("path");

dotenv.config({ path: join(__dirname, "../../.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function debugFile(fileId) {
  console.log("🔍 Debugging audio file...\n");
  console.log(`File ID: ${fileId}\n`);

  try {
    // Step 1: Get file metadata
    console.log("Step 1: Fetching file metadata...");
    const file = await storage.getFile("audio-files", fileId);

    console.log("✅ File exists!");
    console.log("\nFile Details:");
    console.log(`  Name: ${file.name}`);
    console.log(`  Size: ${(file.sizeOriginal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  MIME Type: ${file.mimeType}`);
    console.log(`  Created: ${new Date(file.$createdAt).toLocaleString()}`);
    console.log(`  Permissions: ${JSON.stringify(file.$permissions, null, 2)}`);

    // Step 2: Try to get view URL
    console.log("\nStep 2: Testing view URL...");
    const viewUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/audio-files/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
    console.log(`  View URL: ${viewUrl}`);

    // Step 3: Try to get download URL
    console.log("\nStep 3: Testing download URL...");
    const downloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/audio-files/files/${fileId}/download?project=${process.env.APPWRITE_PROJECT_ID}`;
    console.log(`  Download URL: ${downloadUrl}`);

    // Step 4: Check if we can actually download it
    console.log("\nStep 4: Attempting to download file...");
    try {
      const fileBuffer = await storage.getFileDownload("audio-files", fileId);
      console.log(
        `  ✅ File is downloadable! Size: ${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`,
      );
    } catch (error) {
      console.log(`  ❌ Cannot download: ${error.message}`);
    }

    // Step 5: Check if we can view it
    console.log("\nStep 5: Attempting to get view...");
    try {
      const fileView = await storage.getFileView("audio-files", fileId);
      console.log(`  ✅ File is viewable!`);
    } catch (error) {
      console.log(`  ❌ Cannot view: ${error.message}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("Summary:");
    console.log(`  File exists: ✅`);
    console.log(`  MIME type: ${file.mimeType}`);
    console.log(`  Size: ${(file.sizeOriginal / 1024 / 1024).toFixed(2)} MB`);
    console.log(
      `  Permissions: ${file.$permissions.length > 0 ? file.$permissions.join(", ") : "None (private)"}`,
    );
    console.log("\nRecommendations:");

    if (
      file.mimeType !== "audio/mp4" &&
      file.mimeType !== "audio/x-m4a" &&
      file.mimeType !== "audio/mpeg"
    ) {
      console.log(
        `  ⚠️  MIME type is "${file.mimeType}" - may not play in browser`,
      );
      console.log(`      Expected: audio/mp4, audio/x-m4a, or audio/mpeg`);
    }

    if (file.$permissions.length === 0) {
      console.log(
        `  ⚠️  File has no permissions - may not be accessible from browser`,
      );
      console.log(`      Add read permission: Permission.read(Role.any())`);
    }

    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Error:", error.message);

    if (error.code === 404) {
      console.log("\nFile not found in storage!");
      console.log("Possible reasons:");
      console.log("  1. File ID is incorrect");
      console.log("  2. File was deleted");
      console.log("  3. File is in a different bucket");
    }

    process.exit(1);
  }
}

// Get file ID from command line
const fileId = process.argv[2];

if (!fileId) {
  console.error("❌ Usage: node debug-audio-file.js <fileId>");
  console.log("\nExample: node debug-audio-file.js 6992d0c20014c6ee974f");
  process.exit(1);
}

debugFile(fileId);
