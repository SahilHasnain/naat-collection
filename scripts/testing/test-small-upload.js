/**
 * Test with a tiny file
 */

const dotenv = require("dotenv");
dotenv.config({ path: ".env.appwrite" });

const { Client, Storage, ID } = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");
const fs = require("fs");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function testSmallUpload() {
  try {
    console.log("Creating a small test file...");

    // Create a tiny test file
    const testContent = "This is a test audio file";
    const testPath = "test-tiny.txt";
    fs.writeFileSync(testPath, testContent);

    console.log("Uploading tiny file...");

    const result = await storage.createFile({
      bucketId: "audio-files",
      fileId: ID.unique(),
      file: InputFile.fromPath(testPath, "test-tiny.txt"),
    });

    console.log("✅ Upload successful!");
    console.log(`File ID: ${result.$id}`);

    // Cleanup
    fs.unlinkSync(testPath);

    // Delete from storage
    await storage.deleteFile("audio-files", result.$id);
    console.log("✅ Cleanup done");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

testSmallUpload();
