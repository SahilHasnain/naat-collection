/**
 * Simple test to check if upload works
 */

console.log("Starting test...");

const dotenv = require("dotenv");
dotenv.config({ path: ".env.appwrite" });

console.log("Loaded env");

const { Client, Storage, ID } = require("node-appwrite");
console.log("Loaded node-appwrite");

const { InputFile } = require("node-appwrite/file");
console.log("Loaded InputFile");

const fs = require("fs");
const path = require("path");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

console.log("Client initialized");

const storage = new Storage(client);

async function testUpload() {
  try {
    // Find a test audio file
    const tempDir = path.join(process.cwd(), "temp-audio");
    const files = fs.readdirSync(tempDir);

    if (files.length === 0) {
      console.log("No audio files found in temp-audio");
      return;
    }

    const testFile = path.join(tempDir, files[0]);
    console.log(`Testing upload with: ${files[0]}`);

    const fileSize = fs.statSync(testFile).size;
    console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

    console.log("Creating InputFile from path...");
    const inputFile = InputFile.fromPath(testFile, "test.m4a");

    console.log("Uploading to Appwrite...");
    const result = await storage.createFile({
      bucketId: "audio-files",
      fileId: ID.unique(),
      file: inputFile,
    });

    console.log("✅ Upload successful!");
    console.log(`File ID: ${result.$id}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

testUpload();
